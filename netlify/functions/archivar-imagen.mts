// POST /.netlify/functions/archivar-imagen
// Body: { codigo, imagen_id }
//
// Botón "Quitar de la lista" en Por armar (H2/H10). Le permite a
// Alejandro sacar manualmente una pieza de Por armar, sin importar
// si a todas sus páginas ya se les marcó Publicada. No borra nada:
// solo pone archivada=true, para que imagenes-por-armar deje de
// devolverla.

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
  if (usuario !== "alejandro") {
    return respuestaError("Solo Alejandro puede quitar piezas de la lista.", 403);
  }
  if (!cuerpo.imagen_id) return respuestaError("Falta imagen_id.");

  const db = clienteDb();
  // Solo exige que el id exista: el objetivo es "que ya no aparezca
  // en Por armar", no que siga en un estado exacto. Exigir
  // estado='elegida' acá no aportaba nada (imagenes-por-armar ya
  // filtra por elegida+archivada=false) y sí podía fallar sin razón
  // aparente, así que se saca esa condición extra.
  const { error, count } = await db
    .from("imagenes")
    .update({ archivada: true })
    .eq("id", cuerpo.imagen_id)
    .select("id", { count: "exact" });

  if (error) return respuestaError(error.message, 500);
  if (!count) return respuestaError("Esa pieza ya no existe.", 409);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
