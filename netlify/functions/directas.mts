// GET /.netlify/functions/directas?codigo=...
//
// Pestaña Directas (solo Alejandro, docs/especificacion-directas.md,
// D2): las publicaciones marcadas como directas que todavía no se han
// subido, ordenadas por hora, con la imagen y el texto a mano. Las
// piezas que Alejandro quitó de Por armar no aparecen.

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const usuario = identificarUsuario(url.searchParams.get("codigo"));
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return respuesta(403, { error: "Solo Alejandro tiene esta pantalla." });
  }

  const db = clienteDb();
  const { data: filas, error } = await db
    .from("publicaciones")
    .select(
      `id, hora_programada,
       pagina:paginas(nombre, nombre_tuit, usuario_tuit, avatar_url),
       imagenes!inner(id, texto, ruta_archivo)`
    )
    .eq("directa", true)
    .eq("publicada", false)
    .eq("imagenes.estado", "elegida")
    .eq("imagenes.archivada", false)
    .order("hora_programada", { ascending: true });

  if (error) return respuesta(500, { error: error.message });

  const r2 = clienteR2();
  const bucket = bucketR2();

  const directas = await Promise.all(
    (filas ?? []).map(async (fila) => {
      const imagen = Array.isArray(fila.imagenes) ? fila.imagenes[0] : fila.imagenes;
      const pagina = Array.isArray(fila.pagina) ? fila.pagina[0] : fila.pagina;
      const url_ver = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: bucket, Key: imagen.ruta_archivo }),
        { expiresIn: SEGUNDOS_VALIDEZ_URL }
      );
      return {
        id: fila.id,
        hora_programada: fila.hora_programada,
        pagina_nombre: pagina?.nombre ?? "",
        nombre_tuit: pagina?.nombre_tuit,
        usuario_tuit: pagina?.usuario_tuit,
        avatar_url: pagina?.avatar_url,
        texto: imagen.texto ?? "",
        url_ver,
      };
    })
  );

  return respuesta(200, { directas });
};
