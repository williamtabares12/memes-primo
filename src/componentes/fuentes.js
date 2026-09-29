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

// Todas las fuentes que puede haber en la base, para el filtro de
// Revisar. Las de Reddit no deberían verse nunca ahí en la práctica
// (llegan escondidas hasta que se aprueban en Preselección), pero se
// listan igual por si alguna vez hace falta depurar algo a mano.
export const FUENTES_FILTRO = [...FUENTES, FUENTE_PRESELECCION, ...FUENTES_REDDIT];
