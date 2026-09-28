-- Pedido de David (vía Alejandro): al elegir una imagen para una
-- página, puede anotar a qué hora la va a postear. Es por página
-- (la misma imagen puede ir a dos páginas con horas distintas) y
-- opcional (se puede dejar en blanco y ponerla después desde Por
-- armar).

alter table publicaciones
  add column if not exists hora_programada timestamptz;
