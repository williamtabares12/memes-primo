// POST /.netlify/functions/firmar-captura
// Body: { codigo, imagen_id, tipo }
//
// H10: Alejandro sube la captura terminada. Fija la ruta en la
// base de datos y devuelve una URL firmada para que el navegador
// suba el archivo directo a R2 (igual que subir-lote).

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let cuerpo: { codigo?: string; imagen_id?: string; tipo?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "El cuerpo debe ser JSON." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return new Response(JSON.stringify({ error: "Solo Alejandro sube la captura." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  if (!cuerpo.imagen_id) {
    return new Response(JSON.stringify({ error: "Falta imagen_id." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const tipo = cuerpo.tipo || "image/png";
  const extension = tipo.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
  const ruta_captura = `capturas/${cuerpo.imagen_id}-${crypto.randomUUID()}.${extension}`;

  const db = clienteDb();
  const { error } = await db
    .from("imagenes")
    .update({ ruta_captura })
    .eq("id", cuerpo.imagen_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const r2 = clienteR2();
  const url_subida = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: bucketR2(), Key: ruta_captura, ContentType: tipo }),
    { expiresIn: SEGUNDOS_VALIDEZ_URL }
  );

  return new Response(JSON.stringify({ url_subida }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
