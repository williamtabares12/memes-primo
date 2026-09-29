// GET /.netlify/functions/imagenes-por-armar?codigo=...&pagina_id=...
//
// Pantalla Por armar (H2, H6, H10). Trae las imágenes Elegidas o
// Armadas que todavía tienen alguna página sin Publicar, con sus
// páginas y la hora programada de cada una (pedido de David). La ven
// tanto Alejandro como David. pagina_id es opcional (H6: "filtro por
// página").

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;

export default async (req: Request) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("codigo");
  const paginaFiltro = url.searchParams.get("pagina_id");

  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();

  const db = clienteDb();

  let consulta = db
    .from("imagenes")
    .select(
      `id, texto, estado, ruta_archivo,
       lote:lotes(fuente),
       publicaciones(id, publicada, marcada_por, fecha_publicacion, hora_programada,
         pagina:paginas(id, nombre))`
    )
    .in("estado", ["elegida", "armada"])
    .order("fecha_decision", { ascending: true });

  const { data: filas, error } = await consulta;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const r2 = clienteR2();
  const bucket = bucketR2();

  const piezas = await Promise.all(
    (filas ?? [])
      // Solo las que todavía tienen alguna página sin publicar.
      .filter((fila) => fila.publicaciones.some((p) => !p.publicada))
      // Filtro opcional por página (H6).
      .filter((fila) =>
        !paginaFiltro
          ? true
          : fila.publicaciones.some((p) => {
              const pagina = Array.isArray(p.pagina) ? p.pagina[0] : p.pagina;
              return pagina?.id === paginaFiltro;
            })
      )
      .map(async (fila) => {
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
          estado: fila.estado,
          url_ver,
          publicaciones: fila.publicaciones.map((p) => {
            const pagina = Array.isArray(p.pagina) ? p.pagina[0] : p.pagina;
            return {
              id: p.id,
              pagina_id: pagina?.id,
              pagina_nombre: pagina?.nombre,
              publicada: p.publicada,
              marcada_por: p.marcada_por,
              fecha_publicacion: p.fecha_publicacion,
              hora_programada: p.hora_programada,
            };
          }),
        };
      })
  );

  return new Response(JSON.stringify({ piezas, usuario }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
