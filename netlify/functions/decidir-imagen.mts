// POST /.netlify/functions/decidir-imagen
// Body: { codigo, imagen_id, decision, texto?, paginas? }
//
// decision es "guardada", "descartada" o "elegida" (H3, H4, H5).
// Para "elegida" hace falta paginas: [{ id, hora_programada }] con
// al menos una página. hora_programada es obligatoria y por página
// (pedido de David: puede postear la misma imagen a horas distintas
// en cada página, y nunca sin hora para no terminar con horas al
// azar), en ISO 8601.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";

const DIAS_CADUCIDAD = 30;

interface PaginaElegida {
  id: string;
  hora_programada: string;
}

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
    paginas?: PaginaElegida[];
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
  const paginasElegidas = cuerpo.paginas;
  if (!Array.isArray(paginasElegidas) || paginasElegidas.length === 0) {
    return respuestaError("Elegir necesita al menos una página marcada.");
  }
  // Pedido de David: la hora programada es obligatoria por página (el
  // frontend ya lo exige con un selector de horas fijas; esto es el
  // respaldo del lado del servidor).
  if (paginasElegidas.some((pagina) => !pagina.hora_programada)) {
    return respuestaError("Cada página necesita su hora programada.");
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
    paginasElegidas.map((pagina) => ({
      imagen_id,
      pagina_id: pagina.id,
      hora_programada: pagina.hora_programada,
    }))
  );

  if (errorPublicaciones) return respuestaError(errorPublicaciones.message, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
