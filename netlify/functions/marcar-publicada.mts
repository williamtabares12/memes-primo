// POST /.netlify/functions/marcar-publicada
// Body: { codigo, publicacion_id }
//
// H7 / D4 / T4: Alejandro, David o Wilson (solo sus páginas) marcan una publicación (una página de
// una pieza) como publicada. Guarda quién y cuándo. Para una directa,
// además de sacarla de la lista de Directas, evita que siga avisando.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { idsDePaginasPermitidas } from "./_lib/acceso.mts";

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuesta(405, { error: "Método no permitido." });

  let cuerpo: { codigo?: string; publicacion_id?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return respuesta(400, { error: "El cuerpo debe ser JSON." });
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (!cuerpo.publicacion_id) return respuesta(400, { error: "Falta publicacion_id." });

  const db = clienteDb();

  // Wilson solo marca publicaciones de sus páginas.
  const permitidas = await idsDePaginasPermitidas(db, usuario);
  if (permitidas) {
    const { data: fila } = await db
      .from("publicaciones")
      .select("pagina_id")
      .eq("id", cuerpo.publicacion_id)
      .maybeSingle();
    if (!fila) return respuesta(404, { error: "Esa publicación no existe." });
    if (!permitidas.includes(fila.pagina_id)) {
      return respuesta(403, { error: "Esa publicación no es de tus páginas." });
    }
  }

  const { data, error } = await db
    .from("publicaciones")
    .update({
      publicada: true,
      marcada_por: usuario,
      fecha_publicacion: new Date().toISOString(),
    })
    .eq("id", cuerpo.publicacion_id)
    .select("id");

  if (error) return respuesta(500, { error: error.message });
  if (!data || data.length === 0) return respuesta(404, { error: "Esa publicación no existe." });

  return respuesta(200, { ok: true });
};
