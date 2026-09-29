// Función programada en segundo plano (ver "config" al final; corre
// una vez al día sola, nadie la llama a mano). Reemplaza una parte
// del scrolleo manual de Alejandro por Facebook: trae los memes en
// español más votados del día en un puñado de subreddits. No toca
// Facebook ni X para nada, y no usa ninguna cuenta personal: es la
// API oficial de Reddit, en modo lectura de contenido público (ver
// _lib/reddit.mts).
//
// Entra con pendiente_triage=true, o sea que David NO lo ve en
// Revisar todavía: primero pasa por /preseleccion (solo Alejandro),
// que decide qué se manda a Revisar y qué no. Ver
// triage-imagen.mts para ese paso.
//
// Lista de subreddits: es un punto de partida razonable (memes en
// español con volumen alto), no una decisión final. Si después de
// ver unos días de resultados algunos no sirven, se cambia este
// arreglo y ya.
const SUBREDDITS = ["memesenespanol", "HumorNegro", "dankgentina"];

// Umbral de puntaje: una forma simple y objetiva de "ya es viral",
// en vez de adivinar a ojo. Se puede subir o bajar según qué tan
// lleno o vacío quede Revisar cada mañana.
const PUNTAJE_MINIMO = 150;

// Tope por corrida, para no descargar cientos de imágenes de golpe
// ni pasarse del tiempo de una función en segundo plano.
const MAX_IMAGENES_POR_CORRIDA = 60;
const MAX_POR_SUBREDDIT = 25;

import type { Config } from "@netlify/functions";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";
import { topDelDia, type PostReddit } from "./_lib/reddit.mts";

function extensionDeUrl(url: string): string {
  const limpia = url.split("?")[0];
  const punto = limpia.lastIndexOf(".");
  const ext = punto > -1 ? limpia.slice(punto + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
}

function tipoDeExtension(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export default async (req: Request) => {
  const db = clienteDb();
  const r2 = clienteR2();
  const bucket = bucketR2();

  let totalImportadas = 0;

  for (const subreddit of SUBREDDITS) {
    if (totalImportadas >= MAX_IMAGENES_POR_CORRIDA) break;

    let posts: PostReddit[];
    try {
      posts = await topDelDia(subreddit, 100);
    } catch (err) {
      console.error(`importar-reddit: no se pudo leer r/${subreddit}:`, err);
      continue; // un subreddit caído no debe tumbar a los demás
    }

    const candidatos = posts
      .filter((p) => p.esImagen && !p.esNsfw && !p.fijado && p.puntaje >= PUNTAJE_MINIMO)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, MAX_POR_SUBREDDIT);

    if (candidatos.length === 0) continue;

    // Dedup: no volver a traer un post que ya se importó un día
    // anterior (sigue "top del día" mientras siga viral).
    const idsExternos = candidatos.map((p) => `reddit:${p.id}`);
    const { data: yaExistentes } = await db
      .from("imagenes")
      .select("origen_externo")
      .in("origen_externo", idsExternos);
    const yaImportados = new Set((yaExistentes ?? []).map((f) => f.origen_externo));

    const nuevos = candidatos.filter((p) => !yaImportados.has(`reddit:${p.id}`));
    if (nuevos.length === 0) continue;

    const { data: lote, error: errorLote } = await db
      .from("lotes")
      .insert({ fuente: `Reddit r/${subreddit}`, subido_por: "reddit-auto" })
      .select("id")
      .single();

    if (errorLote || !lote) {
      console.error(`importar-reddit: no se pudo crear el lote de r/${subreddit}:`, errorLote?.message);
      continue;
    }

    let indice = 0;
    for (const post of nuevos) {
      if (totalImportadas >= MAX_IMAGENES_POR_CORRIDA) break;

      let bytes: ArrayBuffer;
      let tipo: string;
      try {
        const respuestaImg = await fetch(post.url, {
          headers: { "user-agent": "memes-primo-importer/1.0" },
        });
        if (!respuestaImg.ok) throw new Error(`status ${respuestaImg.status}`);
        bytes = await respuestaImg.arrayBuffer();
        const ext = extensionDeUrl(post.url);
        tipo = respuestaImg.headers.get("content-type") || tipoDeExtension(ext);
      } catch (err) {
        console.error(`importar-reddit: no se pudo descargar ${post.url}:`, err);
        continue;
      }

      const ext = extensionDeUrl(post.url);
      const rutaArchivo = `lotes/${lote.id}/${indice}-${crypto.randomUUID()}.${ext}`;

      try {
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: rutaArchivo,
            Body: new Uint8Array(bytes),
            ContentType: tipo,
          })
        );
      } catch (err) {
        console.error(`importar-reddit: no se pudo subir ${rutaArchivo} a R2:`, err);
        continue;
      }

      const { error: errorImagen } = await db.from("imagenes").insert({
        lote_id: lote.id,
        ruta_archivo: rutaArchivo,
        texto: post.titulo,
        estado: "nueva",
        origen_externo: `reddit:${post.id}`,
        pendiente_triage: true,
      });

      if (errorImagen) {
        console.error("importar-reddit: no se pudo registrar la imagen:", errorImagen.message);
        continue;
      }

      indice += 1;
      totalImportadas += 1;
    }
  }

  console.log(`importar-reddit: terminado, ${totalImportadas} imágenes nuevas.`);
  return new Response("ok");
};

export const config: Config = {
  schedule: "0 9 * * *", // 9:00 UTC = 4:00 a.m. hora de Colombia
};
