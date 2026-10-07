// Franjas de hora fijas para "hora programada" (pedido de David: sin
// minutero libre, para no terminar con horas al azar). En punto, de
// 6:00 a.m. a 11:00 p.m.
export const HORAS_FIJAS = Array.from({ length: 18 }, (_, i) => {
  const hora24 = i + 6; // 6..23
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  const sufijo = hora24 < 12 ? "a.m." : "p.m.";
  return {
    valor: `${String(hora24).padStart(2, "0")}:00`,
    etiqueta: `${hora12}:00 ${sufijo}`,
  };
});

// Todo lo de "hora programada" se fija siempre a la hora de Bogotá,
// sin importar en qué huso horario esté configurado el celular de
// quien la programa o quien la mira después. Colombia no tiene
// horario de verano, así que el offset es siempre -05:00.
const OFFSET_BOGOTA = "-05:00";
export const ZONA_BOGOTA = "America/Bogota";

// Fecha de hoy en Bogotá (no en el huso del dispositivo), como
// "YYYY-MM-DD", para usar de mínimo y de valor inicial en el
// selector de fecha.
export function fechaHoyLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Arma el ISO 8601 (instante absoluto en UTC) para una fecha
// "YYYY-MM-DD" y hora "HH:00" pensadas como hora de Bogotá,
// independiente del huso horario del dispositivo que programa.
export function horaProgramadaISO(fecha, hora) {
  return new Date(`${fecha}T${hora}:00${OFFSET_BOGOTA}`).toISOString();
}

// Lo contrario de horaProgramadaISO: de un instante ISO saca la
// fecha ("YYYY-MM-DD") y la hora en punto ("HH:00") tal como se ven
// en Bogotá, para precargar SelectorHoraProgramada con una hora ya
// guardada. Devuelve undefined si no hay hora.
export function partesBogota(iso) {
  if (!iso) return undefined;
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_BOGOTA,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return { fecha, hora: `${hora}:00` };
}
