// POST /.netlify/functions/subir-lote
// Body: { codigo, fuente, archivos: [{ nombre, tipo }] }
//
// Solo Alejandro sube lotes (H1). Crea la fila del lote, una fila
// por imagen (estado "nueva") y devuelve una URL firmada por
// archivo para que el navegador suba directo a R2 sin pasar por
// Netlify. Cada URL vale por 10 minutos.
//
// El navegador, después de recibir la respuesta, hace un PUT a cada
// url_subida con el archivo correspondiente. No hace falta avisarle
// a esta función cuando termina: la fila en "imagenes" ya existe
// desde el principio, en estado "nueva".

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const MAX_ARCHIVOS_POR_LOTE = 200;
const SEGUNDOS_VALIDEZ_URL = 600; // 10 minutos

interface ArchivoEntrada {
  nombre: string;
  tipo: string;
}

function nombreSeguro(nombreOriginal: string): string {
  const puntoIndex = nombreOriginal.lastIndexOf(".");
  const extension =
    puntoIndex > -1 ? nombreOriginal.slice(puntoIndex + 1).toLowerCase() : "";
  const extensionSegura = /^[a-z0-9]{1,5}$/.test(extension) ? extension : "bin";
  return `${crypto.randomUUID()}.${extensionSegura}`;
}

function respuestaError(mensaje: string, status = 400): Response {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return respuestaError("Método no permitido.", 405);
  }

  let cuerpo: {
    codigo?: string;
    fuente?: string;
    archivos?: ArchivoEntrada[];
  };
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError("El cuerpo debe ser JSON.");
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return respuestaError("Solo Alejandro sube lotes.", 403);
  }

  const fuente = cuerpo.fuente?.trim();
  if (!fuente) {
    return respuestaError("Falta la fuente del lote.");
  }

  const archivos = cuerpo.archivos;
  if (!Array.isArray(archivos) || archivos.length === 0) {
    return respuestaError("El lote necesita al menos una imagen.");
  }
  if (archivos.length > MAX_ARCHIVOS_POR_LOTE) {
    return respuestaError(
      `Un lote acepta hasta ${MAX_ARCHIVOS_POR_LOTE} imágenes.`
    );
  }

  const db = clienteDb();

  const { data: lote, error: errorLote } = await db
    .from("lotes")
    .insert({ fuente, subido_por: usuario })
    .select("id")
    .single();

  if (errorLote || !lote) {
    return respuestaError(
      `No se pudo crear el lote: ${errorLote?.message ?? "error desconocido"}`,
      500
    );
  }

  const r2 = clienteR2();
  const bucket = bucketR2();

  const filasImagenes = archivos.map((archivo) => ({
    lote_id: lote.id,
    ruta_archivo: `lotes/${lote.id}/${nombreSeguro(archivo.nombre)}`,
    estado: "nueva" as const,
  }));

  const { data: imagenesCreadas, error: errorImagenes } = await db
    .from("imagenes")
    .insert(filasImagenes)
    .select("id, ruta_archivo");

  if (errorImagenes || !imagenesCreadas) {
    return respuestaError(
      `No se pudieron registrar las imágenes: ${
        errorImagenes?.message ?? "error desconocido"
      }`,
      500
    );
  }

  // Mismo orden en que se insertaron, así que se pueden emparejar
  // por índice con el arreglo "archivos" original.
  const resultado = await Promise.all(
    imagenesCreadas.map(async (imagen, indice) => {
      const tipo = archivos[indice]?.tipo || "application/octet-stream";
      const comando = new PutObjectCommand({
        Bucket: bucket,
        Key: imagen.ruta_archivo,
        ContentType: tipo,
      });
      const url_subida = await getSignedUrl(r2, comando, {
        expiresIn: SEGUNDOS_VALIDEZ_URL,
      });
      return {
        imagen_id: imagen.id,
        nombre_original: archivos[indice]?.nombre,
        url_subida,
      };
    })
  );

  return new Response(
    JSON.stringify({ lote_id: lote.id, imagenes: resultado }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};
