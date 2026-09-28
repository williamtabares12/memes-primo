// POST /.netlify/functions/marcar-publicada
// Body: { codigo, publicacion_id }
//
// H7: Alejandro o David marcan una pieza como publicada, por
// página. Guarda quién la marcó y qué día.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let cuerpo: { codigo?: string; publicacion_id?: string };
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
  if (!cuerpo.publicacion_id) {
    return new Response(JSON.stringify({ error: "Falta publicacion_id." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();
  const { error, count } = await db
    .from("publicaciones")
    .update({
      publicada: true,
      marcada_por: usuario,
      fecha_publicacion: new Date().toISOString(),
    })
    .eq("id", cuerpo.publicacion_id)
    .eq("publicada", false)
    .select("id", { count: "exact" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  if (!count) {
    return new Response(JSON.stringify({ error: "Ya estaba publicada." }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
