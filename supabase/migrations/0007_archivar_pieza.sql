-- Botón "Quitar de la lista" en Por armar (H2/H10): Alejandro puede
-- sacar una pieza de la lista manualmente, sin importar si a todas
-- sus páginas ya se les marcó Publicada. No borra nada, solo deja de
-- aparecer en Por armar.
alter table imagenes
  add column if not exists archivada boolean not null default false;
