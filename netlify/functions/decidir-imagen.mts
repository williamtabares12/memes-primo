// POST /.netlify/functions/decidir-imagen
// Body: { codigo, imagen_id, decision, texto?, paginas_ids?, confirmar_repetidas? }
//
// decision es "guardada", "descartada" o "elegida" (H3, H4, H5).
// Para "elegida" hace falta paginas_ids con al menos una página.
//
// H8: si el texto de esta imagen coincide con el de otra imagen que
// ya está Publicada en alguna de las páginas marcadas, la respuesta
// avisa en vez de crear las filas, y el frontend puede reintentar
// con confirmar_repetidas=true para seguir de todas formas.
// Nota de diseño: como no hay lectura automática de imagen a imagen,
// "el mismo chiste" se detecta comparando el texto que David o
// Alejandro escribieron a mano. Si la imagen no tiene texto, no hay
// forma de comparar y no se avisa nada.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

const DIAS_CADUCIDAD = 30;

function respuestaError(mensaje: string, status = 400): Response {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuestaError("Método no permitido.", 405);

  let cuerpo: {
    codigo?: string;
    imagen_id?: string;
    decision?: "guardada" | "descartada" | "elegida";
    texto?: string;
    paginas_ids?: string[];
    confirmar_repetidas?: boolean;
  };
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError("El cuerpo debe ser JSON.");
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "david") return respuestaError("Solo David decide en Revisar.", 403);

  const { imagen_id, decision } = cuerpo;
  if (!imagen_id || !decision) {
    return respuestaError("Faltan imagen_id o decision.");
  }
  if (!["guardada", "descartada", "elegida"].includes(decision)) {
    return respuestaError("decision debe ser guardada, descartada o elegida.");
  }

  const db = clienteDb();

  // Trae la imagen actual (para el texto, si no viene uno nuevo, y
  // para validar desde qué estado se puede pasar a "decision").
  const { data: imagenActual, error: errorLectura } = await db
    .from("imagenes")
    .select("id, texto, estado")
    .eq("id", imagen_id)
    .single();

  if (errorLectura || !imagenActual) {
    return respuestaError("La imagen no existe.", 404);
  }

  // Guardar y Descartar solo aplican a una imagen Nueva (H3). Elegir
  // aplica desde Nueva, Guardada o Descartada (H5: "Cada tarjeta
  // permite elegir o recuperar").
  const estadosOrigenPermitidos =
    decision === "elegida" ? ["nueva", "guardada", "descartada"] : ["nueva"];
  if (!estadosOrigenPermitidos.includes(imagenActual.estado)) {
    return respuestaError("Esta imagen ya fue decidida.", 409);
  }

  const textoFinal = cuerpo.texto !== undefined ? cuerpo.texto : imagenActual.texto;

  if (decision === "guardada" || decision === "descartada") {
    const ahora = new Date();
    const caduca = new Date(ahora);
    caduca.setDate(caduca.getDate() + DIAS_CADUCIDAD);

    const { error } = await db
      .from("imagenes")
      .update({
        estado: decision,
        texto: textoFinal,
        fecha_decision: ahora.toISOString(),
        fecha_caducidad: caduca.toISOString(),
      })
      .eq("id", imagen_id)
      .eq("estado", "nueva");

    if (error) return respuestaError(error.message, 500);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // decision === "elegida"
  const paginasIds = cuerpo.paginas_ids;
  if (!Array.isArray(paginasIds) || paginasIds.length === 0) {
    return respuestaError("Elegir necesita al menos una página marcada.");
  }

  if (textoFinal && textoFinal.trim() && !cuerpo.confirmar_repetidas) {
    const textoNormalizado = textoFinal.trim().toLowerCase();

    const { data: posiblesRepetidas, error: errorRepetidas } = await db
      .from("publicaciones")
      .select("pagina_id, publicada, pagina:paginas(id, nombre), imagen:imagenes(texto)")
      .eq("publicada", true)
      .in("pagina_id", paginasIds);

    if (errorRepetidas) return respuestaError(errorRepetidas.message, 500);

    const paginasRepetidas = new Map<string, string>();
    for (const fila of posiblesRepetidas ?? []) {
      const imagenFila = Array.isArray(fila.imagen) ? fila.imagen[0] : fila.imagen;
      const paginaFila = Array.isArray(fila.pagina) ? fila.pagina[0] : fila.pagina;
      const textoFila = imagenFila?.texto?.trim().toLowerCase();
      if (textoFila && textoFila === textoNormalizado && paginaFila) {
        paginasRepetidas.set(paginaFila.id, paginaFila.nombre);
      }
    }

    if (paginasRepetidas.size > 0) {
      return new Response(
        JSON.stringify({
          aviso: "repetida",
          paginas_repetidas: Array.from(paginasRepetidas, ([id, nombre]) => ({
            id,
            nombre,
          })),
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }
  }

  const { error: errorUpdate } = await db
    .from("imagenes")
    .update({
      estado: "elegida",
      texto: textoFinal,
      fecha_decision: new Date().toISOString(),
      fecha_caducidad: null,
    })
    .eq("id", imagen_id)
    .in("estado", estadosOrigenPermitidos);

  if (errorUpdate) return respuestaError(errorUpdate.message, 500);

  const { error: errorPublicaciones } = await db.from("publicaciones").insert(
    paginasIds.map((pagina_id) => ({
      imagen_id,
      pagina_id,
      publicada: false,
    }))
  );

  if (errorPublicaciones) return respuestaError(errorPublicaciones.message, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
