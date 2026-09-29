// Fuentes que Alejandro elige a mano al subir un lote en Subir lote.
export const FUENTES = ["Guarromantico", "ZonaFarandula-Cosquilla"];

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
export const FUENTES_FILTRO = [...FUENTES];
