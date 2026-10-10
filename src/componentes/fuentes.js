// Fuentes que se eligen a mano al subir un lote en Subir lote. Cada
// quien ve solo las suyas: la fuente nombra para qué páginas es el lote.
export const FUENTES_ALEJANDRO = ["Memes para Traveler", "Memes para Chanty"];
export const FUENTES_WILSON = ["Memes para Jordan", "Memes para Hilary"];

// Antes de octubre de 2026 las fuentes eran las cuentas de origen. Ya
// no se eligen al subir, pero las imágenes viejas que siguen pendientes
// conservan esa fuente, así que David todavía tiene que poder filtrarlas.
// Se pueden quitar de la lista cuando ya no queden imágenes con ellas.
export const FUENTES_ANTERIORES = ["Guarromantico", "ZonaFarandula-Cosquilla"];

export function fuentesParaSubir(usuario) {
  return usuario === "wilson" ? FUENTES_WILSON : FUENTES_ALEJANDRO;
}

// Fuentes que crea sola importar-reddit-background.mts todos los
// días (una por subreddit). No se eligen a mano en Subir lote, pero
// sí tienen que poder filtrarse en Revisar. Si se cambia la lista de
// subreddits allá, hay que reflejarlo acá también.
export const FUENTES_REDDIT = [
  "Reddit r/memesenespanol",
  "Reddit r/HumorNegro",
  "Reddit r/dankgentina",
];

// Fuente que queda pegada a lo que Alejandro aprueba en Preselección
// (ver triage-imagen.mts): a propósito suena igual de "manual" que
// las de arriba, David nunca ve que salió de Reddit.
export const FUENTE_PRESELECCION = "Páginas varias";

// Fuentes visibles en el filtro de Revisar (David). Por ahora, solo
// las manuales: lo de Reddit quedó en pausa (Alejandro decidió seguir
// sacando memes a mano), así que ni "Páginas varias" ni las de Reddit
// deben aparecer ahí — verlas sin que nunca traigan nada solo genera
// preguntas. Si se retoma esa función, se vuelve a armar esta lista
// con FUENTE_PRESELECCION y FUENTES_REDDIT.
export const FUENTES_FILTRO = [
  ...FUENTES_ALEJANDRO,
  ...FUENTES_WILSON,
  ...FUENTES_ANTERIORES,
];
