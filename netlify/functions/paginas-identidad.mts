// GET /.netlify/functions/paginas-identidad?codigo=...
//
// Pantalla Tarjeta libre (Alejandro y Wilson, H10-quater; Wilson solo
// ve sus páginas): lista las
// páginas visibles con su identidad de tuit (nombre_tuit, usuario_tuit,
// avatar_url) para poder generar una tarjeta sin que exista una pieza
// en Por armar — por ejemplo cuando David manda el texto o una imagen
// por fuera de la cola normal.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { idsDePaginasPermitidas } from "./_lib/acceso.mts";

export default async (req: Request) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get("codigo");
  const usuario = identificarUsuario(codigo);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro" && usuario !== "wilson") {
    return new Response(JSON.stringify({ error: "Solo Alejandro y Wilson tienen esta pantalla." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();
  const permitidas = await idsDePaginasPermitidas(db, usuario);
  let consulta = db
    .from("paginas")
    .select("id, nombre, nombre_tuit, usuario_tuit, avatar_url")
    .eq("visible", true);
  if (permitidas) consulta = consulta.in("id", permitidas);
  const { data: paginas, error } = await consulta.order("nombre");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ paginas: paginas ?? [], usuario }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
