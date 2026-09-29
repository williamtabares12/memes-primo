-- Sirve para el importador automático de Reddit (H-reddit): guarda
-- el id del post de origen (ej. "reddit:abc123") para no importar el
-- mismo meme dos veces si corre varios días seguidos y el post sigue
-- entre los más votados. Nulo para todo lo que se sube a mano.
alter table imagenes
  add column if not exists origen_externo text;

create unique index if not exists imagenes_origen_externo_key
  on imagenes (origen_externo)
  where origen_externo is not null;
