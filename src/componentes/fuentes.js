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

// Todas las fuentes que puede haber en la base, para el filtro de
// Revisar (ahí sí tiene sentido ver también las de Reddit).
export const FUENTES_FILTRO = [...FUENTES, ...FUENTES_REDDIT];
