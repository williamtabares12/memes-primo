// GET /.netlify/functions/siguiente-imagen?codigo=...
//
// Pantalla Revisar (David, H3): trae la imagen "nueva" más antigua,
// con una URL firmada para verla (el bucket es privado), cuántas
// faltan y la lista de páginas visibles para el paso de Elegir (H4).

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600; // 10 minutos, alcanza para revisar una imagen

export default async (req: Request) => {
  const codigo = new URL(req.url).searchParams.get("codigo");
  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "david") {
    return new Response(JSON.stringify({ error: "Solo David revisa." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();

  const [{ count: restantes }, { data: imagenes, error: errorImagen }, { data: paginas }] =
    await Promise.all([
      db.from("imagenes").select("id", { count: "exact", head: true }).eq("estado", "nueva"),
      db
        .from("imagenes")
        .select("id, ruta_archivo, texto, lote:lotes(fuente)")
        .eq("estado", "nueva")
        .order("creada_en", { ascending: true })
        .limit(1),
      db.from("paginas").select("id, nombre").eq("visible", true).order("nombre"),
    ]);

  if (errorImagen) {
    return new Response(JSON.stringify({ error: errorImagen.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const siguiente = imagenes?.[0];
  let imagen = null;

  if (siguiente) {
    const r2 = clienteR2();
    const url_ver = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: bucketR2(), Key: siguiente.ruta_archivo }),
      { expiresIn: SEGUNDOS_VALIDEZ_URL }
    );
    const lote = Array.isArray(siguiente.lote) ? siguiente.lote[0] : siguiente.lote;
    imagen = {
      id: siguiente.id,
      texto: siguiente.texto ?? "",
      fuente: lote?.fuente ?? "",
      url_ver,
    };
  }

  return new Response(
    JSON.stringify({ imagen, restantes: restantes ?? 0, paginas: paginas ?? [] }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
};
