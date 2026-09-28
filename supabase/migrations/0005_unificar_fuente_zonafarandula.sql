-- Antes de fijar la Fuente de Subir lote a dos opciones únicas,
-- "ZonaFarandula" y "Cosquilla" se escribían a mano como fuentes
-- separadas. Los lotes viejos con esos valores (en cualquier
-- mayúscula/minúscula o combinación) se unifican al nuevo nombre
-- conjunto, para que el filtro por fuente de Revisar los encuentre
-- igual que a los lotes nuevos.
update lotes
set fuente = 'ZonaFarandula-Cosquilla'
where fuente ilike '%zonafarandula%'
   or fuente ilike '%cosquilla%';
