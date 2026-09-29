// GET /.netlify/functions/imagenes-pendientes-triage?codigo=...
//
// Pantalla Preselección (solo Alejandro): trae la imagen más
// antigua que importar-reddit-background.mts dejó con
// pendiente_triage=true, para que Alejandro decida si se manda a
// Revisar (David) o se descarta antes de que David la vea siquiera.

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;

export default async (req: Request) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("codigo");
  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return new Response(JSON.stringify({ error: "Solo Alejandro tiene esta pantalla." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();

  const [{ count: restantes }, { data: imagenes, error }] = await Promise.all([
    db
      .from("imagenes")
      .select("id", { count: "exact", head: true })
      .eq("estado", "nueva")
      .eq("pendiente_triage", true),
    db
      .from("imagenes")
      .select("id, ruta_archivo, texto, lote:lotes(fuente)")
      .eq("estado", "nueva")
      .eq("pendiente_triage", true)
      .order("creada_en", { ascending: true })
      .limit(1),
  ]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
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

  return new Response(JSON.stringify({ imagen, restantes: restantes ?? 0 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
