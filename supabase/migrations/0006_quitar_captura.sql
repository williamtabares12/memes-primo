-- Alejandro no estaba usando "subir captura" en Por armar y le quitaba
-- tiempo; se quitó del flujo de la app. Se elimina también la columna
-- que ya no se usa.
alter table imagenes drop column if exists ruta_captura;
