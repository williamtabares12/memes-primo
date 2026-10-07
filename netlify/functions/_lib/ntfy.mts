// Envío de notificaciones por ntfy (https://ntfy.sh). Lo usan el aviso
// programado de las directas (avisar-directas.mts) y el botón de prueba
// (probar-aviso.mts), para que las dos manden exactamente igual.
//
// Publica por JSON: el tema va en el cuerpo (no en la URL) y los acentos
// viajan bien en título y mensaje. La imagen es opcional y va como
// adjunto por enlace.

export type ResultadoEnvio = { ok: boolean; descripcion?: string };

export async function enviarNtfy(
  tema: string,
  aviso: { titulo: string; mensaje: string; imagen?: string }
): Promise<ResultadoEnvio> {
  try {
    const res = await fetch("https://ntfy.sh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: tema,
        title: aviso.titulo,
        message: aviso.mensaje,
        priority: 4,
        tags: ["alarm_clock"],
        ...(aviso.imagen ? { attach: aviso.imagen, filename: "meme.jpg" } : {}),
      }),
    });
    if (res.ok) return { ok: true };
    // ntfy explica el rechazo en el cuerpo (por ejemplo, "forbidden"); no
    // lleva ningún secreto, así que sirve para el log y para el diagnóstico.
    const detalle = (await res.text().catch(() => "")).slice(0, 200);
    return { ok: false, descripcion: `HTTP ${res.status} ${detalle}`.trim() };
  } catch (err) {
    // Sin err.message completo, por si trae la URL.
    const causa = (err as { cause?: { code?: string } })?.cause?.code ?? "sin detalle";
    return { ok: false, descripcion: `error de red (${causa})` };
  }
}
