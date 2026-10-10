// POST /.netlify/functions/actualizar-texto
// Body: { codigo, imagen_id, texto }
//
// H2: el texto se puede editar tanto en Revisar como en Por armar,
// por David, por Alejandro o por Wilson (solo en lo de sus páginas).

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { idsDePaginasPermitidas } from "./_lib/acceso.mts";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  let cuerpo: { codigo?: string; imagen_id?: string; texto?: string };
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
  if (!cuerpo.imagen_id) {
    return new Response(JSON.stringify({ error: "Falta imagen_id." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const db = clienteDb();

  // Wilson solo edita el texto de imágenes elegidas para sus páginas.
  const permitidas = await idsDePaginasPermitidas(db, usuario);
  if (permitidas) {
    const { data: propias } = await db
      .from("publicaciones")
      .select("id")
      .eq("imagen_id", cuerpo.imagen_id)
      .in("pagina_id", permitidas)
      .limit(1);
    if (!propias || propias.length === 0) {
      return new Response(JSON.stringify({ error: "Esa imagen no es de tus páginas." }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  const { error } = await db
    .from("imagenes")
    .update({ texto: cuerpo.texto ?? "" })
    .eq("id", cuerpo.imagen_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
