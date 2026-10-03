// GET /.netlify/functions/paginas-identidad?codigo=...
//
// Pantalla Tarjeta libre (solo Alejandro, H10-quater): lista las
// páginas visibles con su identidad de tuit (nombre_tuit, usuario_tuit,
// avatar_url) para poder generar una tarjeta sin que exista una pieza
// en Por armar — por ejemplo cuando David manda el texto o una imagen
// por fuera de la cola normal.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

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
  const { data: paginas, error } = await db
    .from("paginas")
    .select("id, nombre, nombre_tuit, usuario_tuit, avatar_url")
    .eq("visible", true)
    .order("nombre");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ paginas: paginas ?? [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
