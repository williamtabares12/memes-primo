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

// Fecha de hoy en el huso horario del navegador, como
// "YYYY-MM-DD", para usar de mínimo y de valor inicial en el
// selector de fecha.
export function fechaHoyLocal() {
  const ahora = new Date();
  const sinOffset = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return sinOffset.toISOString().slice(0, 10);
}
