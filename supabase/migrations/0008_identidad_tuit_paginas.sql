-- Agrega la identidad de "tuit" de cada página (H10-ter): con esto la
-- app arma la tarjeta con formato de tuit ella sola, sin pasar por X
-- para nada. nombre_tuit y usuario_tuit son el nombre y el @ que se
-- ven en la tarjeta; avatar_url es la foto de perfil, como una URL
-- pública a la imagen o como "data URI" (texto que empieza con
-- "data:image/..."), lo que sea más fácil de conseguir.
--
-- Quedan en null hasta que Alejandro corra el UPDATE de abajo con
-- los datos reales de cada página (o el equivalente para las suyas,
-- si tiene más de dos).

alter table paginas
  add column if not exists nombre_tuit text,
  add column if not exists usuario_tuit text,
  add column if not exists avatar_url text;

-- Ejemplo (ajustar y correr con los datos reales de cada página):
--
-- update paginas set
--   nombre_tuit = 'Eltraveler',
--   usuario_tuit = '@Eltraveler2',
--   avatar_url = 'https://...' -- o 'data:image/png;base64,...'
-- where nombre = 'El Traveler';
--
-- update paginas set
--   nombre_tuit = '...',
--   usuario_tuit = '@...',
--   avatar_url = '...'
-- where nombre = 'El Chanty';
