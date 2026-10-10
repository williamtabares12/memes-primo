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
import { idsDePaginasPermitidas } from "./_lib/acceso.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const SEGUNDOS_VALIDEZ_URL = 600;

export default async (req: Request) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("codigo");
  const paginaFiltro = url.searchParams.get("pagina_id");

  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();

  const db = clienteDb();
  // Wilson solo ve las filas de sus páginas (T4); los demás ven todas.
  const permitidas = await idsDePaginasPermitidas(db, usuario);

  // `directa` y `publicada` (publicaciones directas, migración 0015) son
  // columnas nuevas. Si la migración todavía no se corrió, se reintenta
  // sin ellas para no dejar Por armar caído para los dos usuarios: las
  // piezas salen igual, solo sin la marca de directa.
  const consultar = (columnasPublicacion: string) =>
    db
      .from("imagenes")
      .select(
        `id, texto, estado, ruta_archivo,
         lote:lotes(fuente),
         publicaciones(${columnasPublicacion}, pagina:paginas(id, nombre, nombre_tuit, usuario_tuit, avatar_url))`
      )
      .eq("estado", "elegida")
      .eq("archivada", false)
      .order("fecha_decision", { ascending: true });

  let { data: filas, error } = await consultar("id, hora_programada, directa, publicada");
  if (error && (error.code === "42703" || /does not exist/i.test(error.message))) {
    console.warn("imagenes-por-armar: falta la migración 0015, se consulta sin directa/publicada.");
    ({ data: filas, error } = await consultar("id, hora_programada"));
  }

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const r2 = clienteR2();
  const bucket = bucketR2();

  // Para Wilson, cada pieza se recorta a las filas de sus páginas y se
  // descartan las que se quedan sin ninguna.
  const filasVisibles = (filas ?? [])
    .map((fila) => ({
      ...fila,
      publicaciones: fila.publicaciones.filter((p) => {
        if (!permitidas) return true;
        const pagina = Array.isArray(p.pagina) ? p.pagina[0] : p.pagina;
        return !!pagina && permitidas.includes(pagina.id);
      }),
    }))
    .filter((fila) => fila.publicaciones.length > 0);

  const piezas = await Promise.all(
    filasVisibles
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
              nombre_tuit: pagina?.nombre_tuit,
              usuario_tuit: pagina?.usuario_tuit,
              avatar_url: pagina?.avatar_url,
              hora_programada: p.hora_programada,
              // "Directa" es cosa de Alejandro: David no la ve.
              directa: usuario === "alejandro" ? p.directa : false,
              publicada: p.publicada,
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
