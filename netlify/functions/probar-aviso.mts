// POST /.netlify/functions/probar-aviso
// Body: { codigo }
//
// Solo Alejandro. Botón "Probar notificación" de la pestaña Directas:
// manda una notificación de prueba por ntfy y devuelve un diagnóstico
// de por qué el aviso de las directas pudo no llegar: si la función ve
// NTFY_TOPIC, qué contesta ntfy y en qué estado está cada directa
// pendiente (ya avisada, dentro de la ventana, fuera de ella).
// No muestra el tema ni ningún secreto.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";
import { clienteDb } from "./_lib/db.mts";
import { enviarNtfy } from "./_lib/ntfy.mts";

const MINUTOS_ANTES = 10;
const MINUTOS_DESPUES = 30;
const LARGO_MINIMO_TEMA = 16;

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

function estadoDeDirecta(
  hora: number,
  ahora: number,
  avisoEnviadoEn: string | null
): string {
  if (avisoEnviadoEn) return "ya se mandó el aviso";
  const minutos = Math.round((hora - ahora) / 60000);
  if (minutos > MINUTOS_ANTES) return `todavía falta: avisa cuando falten ${MINUTOS_ANTES} min (faltan ${minutos})`;
  if (minutos >= -MINUTOS_DESPUES) return "dentro de la ventana: avisa en la próxima corrida (cada 5 min)";
  return `se pasó hace más de ${MINUTOS_DESPUES} min sin avisar: ya no avisa`;
}

export default async (req: Request) => {
  if (req.method !== "POST") return respuesta(405, { error: "Método no permitido." });

  let cuerpo: { codigo?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return respuesta(400, { error: "El cuerpo debe ser JSON." });
  }

  const usuario = identificarUsuario(cuerpo.codigo ?? null);
  if (!usuario) return respuestaNoAutorizado();
  if (usuario !== "alejandro") return respuesta(403, { error: "Solo Alejandro puede probar el aviso." });

  const tema = process.env.NTFY_TOPIC?.trim();
  const diagnostico: Record<string, unknown> = {
    tema_configurado: Boolean(tema),
    tema_largo_suficiente: Boolean(tema && tema.length >= LARGO_MINIMO_TEMA),
  };

  if (!tema) {
    diagnostico.resumen =
      "La función no ve NTFY_TOPIC. Revisa que esté en Netlify y haz un deploy nuevo después de crearla.";
  } else if (tema.length < LARGO_MINIMO_TEMA) {
    diagnostico.resumen = `NTFY_TOPIC tiene menos de ${LARGO_MINIMO_TEMA} caracteres; el aviso real no se manda con un tema tan corto.`;
  } else {
    const envio = await enviarNtfy(tema, {
      titulo: "Prueba de aviso",
      mensaje: "Si lees esto en tu teléfono, las notificaciones de las directas funcionan.",
    });
    diagnostico.ntfy_acepto_el_mensaje = envio.ok;
    if (!envio.ok) diagnostico.ntfy_error = envio.descripcion;
    diagnostico.resumen = envio.ok
      ? `ntfy aceptó el mensaje. El tema que usa la función tiene ${tema.length} caracteres y empieza con "${tema.slice(0, 8)}" y termina en "${tema.slice(-4)}". Si no te llegó al teléfono, compáralo con el tema al que estás suscrito: tiene que ser idéntico.`
      : "ntfy rechazó el mensaje; mira ntfy_error.";
  }

  const db = clienteDb();
  const { data, error } = await db
    .from("publicaciones")
    .select("id, hora_programada, aviso_enviado_en, pagina:paginas(nombre)")
    .eq("directa", true)
    .eq("publicada", false)
    .order("hora_programada", { ascending: true });

  if (error) {
    diagnostico.directas_error = error.message;
  } else {
    const ahora = Date.now();
    diagnostico.directas_pendientes = (data ?? []).map((fila) => {
      const pagina = Array.isArray(fila.pagina) ? fila.pagina[0] : fila.pagina;
      return {
        pagina: pagina?.nombre ?? "",
        hora_programada: fila.hora_programada,
        estado: estadoDeDirecta(
          new Date(fila.hora_programada as string).getTime(),
          ahora,
          fila.aviso_enviado_en as string | null
        ),
      };
    });
  }

  return respuesta(200, diagnostico);
};
