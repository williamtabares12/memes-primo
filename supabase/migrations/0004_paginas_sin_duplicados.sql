-- Limpia páginas duplicadas (mismo nombre) dejando solo la más
-- antigua de cada una, y agrega una restricción única para que no
-- vuelva a pasar (por ejemplo si el script de páginas iniciales se
-- corre dos veces por accidente).

delete from paginas a
using paginas b
where a.nombre = b.nombre
  and a.id <> b.id
  and a.creada_en > b.creada_en;

alter table paginas
  add constraint paginas_nombre_unico unique (nombre);
