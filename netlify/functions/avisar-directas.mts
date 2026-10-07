// Función programada: corre cada 5 minutos (el horario está abajo, en
// config; es la única fuente, no se repite en netlify.toml).
//
// docs/especificacion-directas.md, D3: busca las publicaciones directas
// pendientes cuya hora cae en los próximos 10 minutos (o se pasó hace
// menos de 30) y le manda a Alejandro la imagen por Telegram. Cada
// directa avisa una sola vez: si Telegram responde bien se anota
// aviso_enviado_en; si falla no se anota nada y se reintenta en la
// corrida siguiente.
//
// Variables de entorno: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID. Sin
// ellas no hace nada. El token nunca se escribe en los logs.

import type { Config } from "@netlify/functions";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const MINUTOS_ANTES = 10;
const MINUTOS_DESPUES = 30;
const SEGUNDOS_VALIDEZ_URL = 3600; // Telegram descarga la imagen casi al instante
const LIMITE_CAPTION = 1024; // tope de Telegram para el texto de una foto
const ZONA_BOGOTA = "America/Bogota";

type ResultadoTelegram = { ok: boolean; descripcion?: string };

async function llamarTelegram(
  token: string,
  metodo: "sendPhoto" | "sendMessage",
  cuerpo: Record<string, unknown>
): Promise<ResultadoTelegram> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return { ok: res.ok && datos.ok === true, descripcion: datos.description };
  } catch (err) {
    // Sin err.message completo: podría traer la URL, y la URL lleva el token.
    const causa = (err as { cause?: { code?: string } })?.cause?.code ?? "sin detalle";
    return { ok: false, descripcion: `error de red (${causa})` };
  }
}

function armarTexto(pagina: string, hora: Date, ahora: number, textoMeme: string): string {
  const minutos = Math.round((hora.getTime() - ahora) / 60000);
  const cuando = minutos > 0 ? `en ${minutos} min` : "ya es la hora";
  const horaLegible = hora.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_BOGOTA,
  });
  const encabezado = `Subir directo: ${pagina}\n${horaLegible} (${cuando})`;
  const cuerpo = textoMeme.trim() ? `\n\n${textoMeme.trim()}` : "";
  const completo = encabezado + cuerpo;
  return completo.length <= LIMITE_CAPTION ? completo : `${completo.slice(0, LIMITE_CAPTION - 1)}…`;
}

export default async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("avisar-directas: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID, no se avisa.");
    return new Response("sin telegram");
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

  const r2 = clienteR2();
  const bucket = bucketR2();
  let avisadas = 0;

  for (const fila of filas ?? []) {
    const imagen = Array.isArray(fila.imagenes) ? fila.imagenes[0] : fila.imagenes;
    const pagina = Array.isArray(fila.pagina) ? fila.pagina[0] : fila.pagina;
    const texto = armarTexto(
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

    let resultado = await llamarTelegram(token, "sendPhoto", {
      chat_id: chatId,
      photo: urlImagen,
      caption: texto,
    });

    // Si Telegram no pudo traer la imagen, mejor un aviso sin foto que
    // ningún aviso: lo importante es acordarse de la hora y la página.
    if (!resultado.ok) {
      console.warn(`avisar-directas: sendPhoto falló (${resultado.descripcion}), va solo texto.`);
      resultado = await llamarTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: `${texto}\n\n(No se pudo adjuntar la imagen; está en Directas.)`.slice(0, 4096),
      });
    }

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
