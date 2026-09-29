// GET /.netlify/functions/imagenes-por-armar?codigo=...&pagina_id=...
//
// Pantalla Por armar (H2, H6). Trae las imágenes Elegidas que
// Alejandro no haya quitado de la lista a mano, con sus páginas y la
// hora programada de cada una (pedido de David), de referencia
// mientras postea a mano. La ven tanto Alejandro como David.
// pagina_id es opcional (H6: "filtro por página").

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
       publicaciones(id, hora_programada, pagina:paginas(id, nombre))`
    )
    .eq("estado", "elegida")
    .eq("archivada", false)
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
          url_ver,
          publicaciones: fila.publicaciones.map((p) => {
            const pagina = Array.isArray(p.pagina) ? p.pagina[0] : p.pagina;
            return {
              id: p.id,
              pagina_id: pagina?.id,
              pagina_nombre: pagina?.nombre,
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
