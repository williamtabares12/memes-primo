// POST /.netlify/functions/marcar-directa
// Body: { codigo, publicacion_id, directa: boolean, hora_programada?: string }
//
// Solo Alejandro (docs/especificacion-directas.md, D1 y D5): marca o
// desmarca una publicación como "directa" (se sube a mano a la hora
// indicada, con aviso por Telegram). hora_programada es opcional y
// permite cambiar la hora al marcarla. Cualquier cambio de hora o
// volver a marcarla vacía aviso_enviado_en para que avise otra vez.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuesta(405, { error: "Método no permitido." });

  let cuerpo: {
    codigo?: string;
    publicacion_id?: string;
    directa?: boolean;
    hora_programada?: string;
  };
  try {
    cuerpo = await req.json();
  } catch {
    return respuesta(400, { error: "El cuerpo debe ser JSON." });
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return respuesta(403, { error: "Solo Alejandro puede marcar publicaciones directas." });
  }
  if (!cuerpo.publicacion_id || typeof cuerpo.directa !== "boolean") {
    return respuesta(400, { error: "Faltan publicacion_id o directa." });
  }

  let horaNueva: string | null = null;
  if (cuerpo.hora_programada !== undefined) {
    const fecha = new Date(cuerpo.hora_programada);
    if (Number.isNaN(fecha.getTime())) {
      return respuesta(400, { error: "hora_programada no es una fecha válida." });
    }
    horaNueva = fecha.toISOString();
  }

  const db = clienteDb();

  const { data: actual, error: errorLectura } = await db
    .from("publicaciones")
    .select("id, publicada, hora_programada")
    .eq("id", cuerpo.publicacion_id)
    .maybeSingle();

  if (errorLectura) return respuesta(500, { error: errorLectura.message });
  if (!actual) return respuesta(404, { error: "Esa publicación no existe." });
  if (actual.publicada) {
    return respuesta(409, { error: "Esa publicación ya está marcada como publicada." });
  }
  if (cuerpo.directa && !horaNueva && !actual.hora_programada) {
    return respuesta(400, { error: "Una directa necesita hora." });
  }

  const cambios: Record<string, unknown> = { directa: cuerpo.directa };
  if (horaNueva) cambios.hora_programada = horaNueva;
  // Al marcarla de nuevo o cambiarle la hora, el aviso anterior ya no
  // vale: tiene que avisar otra vez. Al desmarcarla no importa.
  if (cuerpo.directa || horaNueva) cambios.aviso_enviado_en = null;

  const { error } = await db.from("publicaciones").update(cambios).eq("id", cuerpo.publicacion_id);
  if (error) return respuesta(500, { error: error.message });

  return respuesta(200, {
    ok: true,
    directa: cuerpo.directa,
    hora_programada: horaNueva ?? actual.hora_programada,
  });
};
