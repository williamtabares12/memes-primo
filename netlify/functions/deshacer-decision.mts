// POST /.netlify/functions/deshacer-decision
// Body: { codigo, imagen_id }
//
// Deshace la última decisión tomada en Revisar (Guardar, Descartar o
// Elegir) mientras el aviso de "Deshacer" sigue visible, unos
// segundos después de decidir. Solo aplica a decisiones tomadas
// desde "nueva" (que es como llegan siempre desde Revisar): la
// imagen vuelve a "nueva" y, si era "elegida", se borran las filas
// de publicaciones que se habían creado.
//
// Si alguna de esas páginas ya se marcó como Publicada (poco
// probable en una ventana de pocos segundos, pero por seguridad), se
// rechaza el deshacer para no perder ese dato.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

function respuestaError(mensaje: string, status = 400): Response {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuestaError("Método no permitido.", 405);

  let cuerpo: { codigo?: string; imagen_id?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError("El cuerpo debe ser JSON.");
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "david") return respuestaError("Solo David deshace decisiones.", 403);

  const imagenId = cuerpo.imagen_id;
  if (!imagenId) return respuestaError("Falta imagen_id.");

  const db = clienteDb();

  const { data: imagen, error: errorLectura } = await db
    .from("imagenes")
    .select("id, estado")
    .eq("id", imagenId)
    .single();

  if (errorLectura || !imagen) return respuestaError("La imagen no existe.", 404);

  if (!["guardada", "descartada", "elegida"].includes(imagen.estado)) {
    return respuestaError("Esta decisión ya no se puede deshacer.", 409);
  }

  if (imagen.estado === "elegida") {
    const { data: publicaciones, error: errorPublicaciones } = await db
      .from("publicaciones")
      .select("id, publicada")
      .eq("imagen_id", imagenId);

    if (errorPublicaciones) return respuestaError(errorPublicaciones.message, 500);

    if ((publicaciones ?? []).some((p) => p.publicada)) {
      return respuestaError(
        "Ya se marcó como Publicada en alguna página, no se puede deshacer.",
        409
      );
    }

    const { error: errorBorrar } = await db
      .from("publicaciones")
      .delete()
      .eq("imagen_id", imagenId);
    if (errorBorrar) return respuestaError(errorBorrar.message, 500);
  }

  const { error: errorUpdate } = await db
    .from("imagenes")
    .update({ estado: "nueva", fecha_decision: null, fecha_caducidad: null })
    .eq("id", imagenId)
    .eq("estado", imagen.estado);

  if (errorUpdate) return respuestaError(errorUpdate.message, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
