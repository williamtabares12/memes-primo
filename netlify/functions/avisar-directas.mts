// Función programada: corre cada 5 minutos (el horario está abajo, en
// config; es la única fuente, no se repite en netlify.toml).
//
// docs/especificacion-directas.md, D3: busca las publicaciones directas
// pendientes cuya hora cae en los próximos 10 minutos (o se pasó hace
// menos de 30) y le manda a Alejandro una notificación con la imagen
// por ntfy (https://ntfy.sh: gratis, sin cuenta, con app para iPhone).
// Cada directa avisa una sola vez: si ntfy responde bien se anota
// aviso_enviado_en; si falla no se anota nada y se reintenta en la
// corrida siguiente.
//
// Variable de entorno: NTFY_TOPIC. En ntfy público el nombre del tema
// es lo único que protege las notificaciones (quien lo sepa puede
// leerlas), así que tiene que ser largo y al azar; si es corto no se
// manda nada. Sin la variable tampoco se manda.

import type { Config } from "@netlify/functions";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clienteDb } from "./_lib/db.mts";
import { enviarNtfy } from "./_lib/ntfy.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const MINUTOS_ANTES = 10;
const MINUTOS_DESPUES = 30;
const SEGUNDOS_VALIDEZ_URL = 6 * 3600; // la notificación se puede abrir un rato después
const LARGO_MINIMO_TEMA = 16;
const ZONA_BOGOTA = "America/Bogota";

function armarAviso(pagina: string, hora: Date, ahora: number, textoMeme: string) {
  const minutos = Math.round((hora.getTime() - ahora) / 60000);
  const cuando = minutos > 0 ? `en ${minutos} min` : "ya es la hora";
  const horaLegible = hora.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_BOGOTA,
  });
  const cuerpo = textoMeme.trim() ? `\n\n${textoMeme.trim()}` : "";
  return {
    titulo: `Subir directo: ${pagina}`,
    mensaje: `${horaLegible} (${cuando})${cuerpo}`.slice(0, 1500),
  };
}

export default async () => {
  const tema = process.env.NTFY_TOPIC?.trim();
  if (!tema) {
    console.warn("avisar-directas: falta NTFY_TOPIC, no se avisa.");
    return new Response("sin ntfy");
  }
  if (tema.length < LARGO_MINIMO_TEMA) {
    console.error(
      `avisar-directas: NTFY_TOPIC es muy corto (menos de ${LARGO_MINIMO_TEMA} caracteres); no se avisa para no dejar los memes en un tema adivinable.`
    );
    return new Response("tema corto");
  }

  const ahora = Date.now();
  const desde = new Date(ahora - MINUTOS_DESPUES * 60000).toISOString();
  const hasta = new Date(ahora + MINUTOS_ANTES * 60000).toISOString();

  const db = clienteDb();
  const { data: filas, error } = await db
    .from("publicaciones")
    .select(
      `id, hora_programada,
       pagina:paginas(nombre),
       imagenes!inner(id, texto, ruta_archivo)`
    )
    .eq("directa", true)
    .eq("publicada", false)
    .is("aviso_enviado_en", null)
    .gte("hora_programada", desde)
    .lte("hora_programada", hasta)
    .eq("imagenes.estado", "elegida")
    .eq("imagenes.archivada", false)
    .order("hora_programada", { ascending: true });

  if (error) {
    console.error("avisar-directas: no se pudo consultar:", error.message);
    return new Response("error");
  }

  console.log(`avisar-directas: ${filas?.length ?? 0} directa(s) dentro de la ventana de aviso.`);

  const r2 = clienteR2();
  const bucket = bucketR2();
  let avisadas = 0;

  for (const fila of filas ?? []) {
    const imagen = Array.isArray(fila.imagenes) ? fila.imagenes[0] : fila.imagenes;
    const pagina = Array.isArray(fila.pagina) ? fila.pagina[0] : fila.pagina;
    const aviso = armarAviso(
      pagina?.nombre ?? "página sin nombre",
      new Date(fila.hora_programada as string),
      ahora,
      imagen.texto ?? ""
    );

    const urlImagen = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: bucket, Key: imagen.ruta_archivo }),
      { expiresIn: SEGUNDOS_VALIDEZ_URL }
    );

    const resultado = await enviarNtfy(tema, { ...aviso, imagen: urlImagen });

    if (!resultado.ok) {
      console.error(`avisar-directas: no se pudo avisar ${fila.id}: ${resultado.descripcion}`);
      continue; // sin anotar aviso_enviado_en: se reintenta en 5 minutos
    }

    const { error: errorAnotar } = await db
      .from("publicaciones")
      .update({ aviso_enviado_en: new Date().toISOString() })
      .eq("id", fila.id);
    if (errorAnotar) {
      // Peor caso: avisa dos veces. Preferible a no avisar.
      console.error(`avisar-directas: avisó ${fila.id} pero no pudo anotarlo:`, errorAnotar.message);
    } else {
      avisadas += 1;
    }
  }

  console.log(`avisar-directas: ${avisadas} aviso(s) enviado(s).`);
  return new Response("ok");
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
