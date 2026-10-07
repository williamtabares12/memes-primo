-- Publicaciones directas (docs/especificacion-directas.md): Alejandro
-- marca desde Por armar cuáles publicaciones sube a mano a la hora
-- indicada (en vez de programarlas en Facebook, que a veces las cuenta
-- como spam), y un aviso por Telegram le recuerda cuál y a qué hora.
--
-- directa: se sube a mano a la hora de hora_programada.
-- aviso_enviado_en: cuándo se mandó el aviso; vacío = falta avisar.
--   Se vacía de nuevo si cambia la hora o se vuelve a marcar directa.

alter table publicaciones
  add column if not exists directa boolean not null default false,
  add column if not exists aviso_enviado_en timestamptz;

-- La función que avisa corre cada 5 minutos y solo mira las directas
-- que siguen sin publicar ni avisar; el índice parcial la mantiene
-- barata aunque la tabla crezca.
create index if not exists publicaciones_directas_pendientes_idx
  on publicaciones (hora_programada)
  where directa and not publicada and aviso_enviado_en is null;
