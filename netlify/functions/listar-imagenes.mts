// GET /.netlify/functions/listar-imagenes?codigo=...&estado=guardada
//
// Pantalla Guardadas y descartadas (David, H5): las dos pilas, cada
// una con sus tarjetas. estado debe ser "guardada" o "descartada".

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;
const MAX_TARJETAS = 60;

export default async (req: Request) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("codigo");
  const estado = url.searchParams.get("estado");

  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "david") {
    return new Response(JSON.stringify({ error: "Solo David ve esta pantalla." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  if (estado !== "guardada" && estado !== "descartada") {
    return new Response(
      JSON.stringify({ error: 'estado debe ser "guardada" o "descartada".' }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const db = clienteDb();

  const [{ data: imagenes, error }, { data: paginas }] = await Promise.all([
    db
      .from("imagenes")
      .select("id, ruta_archivo, texto, fecha_decision, fecha_caducidad, lote:lotes(fuente)")
      .eq("estado", estado)
      .order("fecha_decision", { ascending: false })
      .limit(MAX_TARJETAS),
    db.from("paginas").select("id, nombre").eq("visible", true).order("nombre"),
  ]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const r2 = clienteR2();
  const bucket = bucketR2();

  const tarjetas = await Promise.all(
    (imagenes ?? []).map(async (fila) => {
      const lote = Array.isArray(fila.lote) ? fila.lote[0] : fila.lote;
      const url_ver = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: bucket, Key: fila.ruta_archivo }),
        { expiresIn: SEGUNDOS_VALIDEZ_URL }
      );
      return {
        id: fila.id,
        texto: fila.texto ?? "",
        fuente: lote?.fuente ?? "",
        fecha_decision: fila.fecha_decision,
        fecha_caducidad: fila.fecha_caducidad,
        url_ver,
      };
    })
  );

  return new Response(JSON.stringify({ imagenes: tarjetas, paginas: paginas ?? [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
