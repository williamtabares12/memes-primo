// Arma un archivo de calendario (.ics) con las directas, para que el
// iPhone las agregue al Calendario con alarma (docs/especificacion-directas.md, D7).
// No lleva la imagen: su enlace es temporal y daría acceso al archivo.

const MINUTOS_DE_DURACION = 15;
const MAX_DESCRIPCION = 1000;

function aFechaUtc(fecha) {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escapa los caracteres que tienen significado en el formato.
function escapar(texto) {
  return String(texto ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Las líneas del formato no pasan de 75 bytes; las largas se parten con
// un espacio al inicio de la continuación. Se corta por caracteres para no
// partir una letra con tilde a la mitad.
function plegar(linea) {
  const codificador = new TextEncoder();
  const partes = [];
  let actual = "";
  let bytes = 0;
  let limite = 75;
  for (const caracter of linea) {
    const largo = codificador.encode(caracter).length;
    if (bytes + largo > limite) {
      partes.push(actual);
      actual = " ";
      bytes = 1;
      limite = 75;
    }
    actual += caracter;
    bytes += largo;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

function eventoDe(directa, ahora) {
  const inicio = new Date(directa.hora_programada);
  const fin = new Date(inicio.getTime() + MINUTOS_DE_DURACION * 60000);
  const texto = (directa.texto ?? "").slice(0, MAX_DESCRIPCION);
  return [
    "BEGIN:VEVENT",
    `UID:directa-${directa.id}@memes-primo`,
    `DTSTAMP:${aFechaUtc(ahora)}`,
    `DTSTART:${aFechaUtc(inicio)}`,
    `DTEND:${aFechaUtc(fin)}`,
    `SUMMARY:${escapar(`Subir directo: ${directa.pagina_nombre}`)}`,
    `DESCRIPTION:${escapar(texto)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(`Subir directo: ${directa.pagina_nombre}`)}`,
    "TRIGGER:-PT10M",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(`Ya es la hora: ${directa.pagina_nombre}`)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];
}

export function crearIcs(directas, ahora = new Date()) {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//memes-primo//directas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...directas.flatMap((d) => eventoDe(d, ahora)),
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

export function descargarIcs(directas, nombre) {
  const contenido = crearIcs(directas);
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombre}.ics`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
