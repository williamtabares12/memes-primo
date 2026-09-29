-- Preselección de Reddit (solo para Alejandro): lo que importa
-- importar-reddit-background.mts entra "escondido" en este estado y
-- Revisar (David) nunca lo ve. Alejandro lo pasa por /preseleccion:
-- lo que aprueba pasa a un lote nuevo con fuente "Páginas varias" y
-- ahí sí aparece en Revisar como cualquier otro lote subido a mano.
alter table imagenes
  add column if not exists pendiente_triage boolean not null default false;
