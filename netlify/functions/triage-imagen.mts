// POST /.netlify/functions/triage-imagen
// Body: { codigo, imagen_id, accion: "aprobar" | "descartar" }
//
// Solo Alejandro. "aprobar": la imagen pasa a un lote nuevo con
// fuente "Páginas varias" (para que en Revisar se vea igual que
// cualquier otra que Alejandro suba a mano) y pendiente_triage pasa
// a false, así que ya le aparece a David en Revisar. "descartar":
// se borra del todo (archivo en R2 + fila), como cuando Alejandro
// scrollea Facebook y simplemente no guarda algo que no sirve.

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const FUENTE_APROBADA = "Páginas varias";

function respuestaError(mensaje: string, status = 400): Response {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuestaError("Método no permitido.", 405);

  let cuerpo: { codigo?: string; imagen_id?: string; accion?: "aprobar" | "descartar" };
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError("El cuerpo debe ser JSON.");
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") {
    return respuestaError("Solo Alejandro tiene esta pantalla.", 403);
  }

  const { imagen_id, accion } = cuerpo;
  if (!imagen_id || !accion) return respuestaError("Faltan imagen_id o accion.");
  if (!["aprobar", "descartar"].includes(accion)) {
    return respuestaError("accion debe ser aprobar o descartar.");
  }

  const db = clienteDb();

  const { data: imagenActual, error: errorLectura } = await db
    .from("imagenes")
    .select("id, ruta_archivo, pendiente_triage")
    .eq("id", imagen_id)
    .single();

  if (errorLectura || !imagenActual) return respuestaError("La imagen no existe.", 404);
  if (!imagenActual.pendiente_triage) {
    return respuestaError("Esta imagen ya se procesó.", 409);
  }

  if (accion === "descartar") {
    const r2 = clienteR2();
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucketR2(), Key: imagenActual.ruta_archivo }));
    } catch (err) {
      console.error("triage-imagen: no se pudo borrar de R2:", err);
      return respuestaError("No se pudo borrar el archivo.", 500);
    }
    const { error } = await db.from("imagenes").delete().eq("id", imagen_id);
    if (error) return respuestaError(error.message, 500);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // accion === "aprobar"
  const { data: loteNuevo, error: errorLote } = await db
    .from("lotes")
    .insert({ fuente: FUENTE_APROBADA, subido_por: "alejandro" })
    .select("id")
    .single();

  if (errorLote || !loteNuevo) {
    return respuestaError(`No se pudo crear el lote: ${errorLote?.message ?? "error desconocido"}`, 500);
  }

  const { error: errorUpdate } = await db
    .from("imagenes")
    .update({ lote_id: loteNuevo.id, pendiente_triage: false })
    .eq("id", imagen_id)
    .eq("pendiente_triage", true);

  if (errorUpdate) return respuestaError(errorUpdate.message, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
