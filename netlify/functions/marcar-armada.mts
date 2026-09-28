// POST /.netlify/functions/marcar-armada
// Body: { codigo, imagen_id }
//
// H6: "Marcar Armada saca la imagen de Por armar" — en realidad la
// deja en la lista hasta que todas sus páginas estén Publicadas,
// pero deja de pedir que se arme. No exige captura (H10).

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let cuerpo: { codigo?: string; imagen_id?: string };
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
  if (usuario !== "alejandro") {
    return new Response(JSON.stringify({ error: "Solo Alejandro marca Armada." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  if (!cuerpo.imagen_id) {
    return new Response(JSON.stringify({ error: "Falta imagen_id." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();
  const { error, count } = await db
    .from("imagenes")
    .update({ estado: "armada" })
    .eq("id", cuerpo.imagen_id)
    .eq("estado", "elegida")
    .select("id", { count: "exact" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  if (!count) {
    return new Response(JSON.stringify({ error: "La imagen no está Elegida." }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
