// POST /.netlify/functions/recuperar-imagen
// Body: { codigo, imagen_id }
//
// Devuelve una imagen Guardada o Descartada a Nueva, para que vuelva
// a aparecer en Revisar (H5: "puede reabrir").

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
  if (usuario !== "david") {
    return new Response(JSON.stringify({ error: "Solo David recupera imágenes." }), {
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
    .update({ estado: "nueva", fecha_decision: null, fecha_caducidad: null })
    .eq("id", cuerpo.imagen_id)
    .in("estado", ["guardada", "descartada"])
    .select("id", { count: "exact" });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  if (!count) {
    return new Response(
      JSON.stringify({ error: "La imagen no está Guardada ni Descartada." }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
