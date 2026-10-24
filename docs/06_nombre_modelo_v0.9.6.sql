-- Importadora A&N v0.9.6
-- Nombre de portada compartido por código de modelo.
-- Antes, el nombre mostrado en la portada del catálogo público se tomaba
-- implícitamente del campo "nombre" de la presentación con el "orden" más
-- bajo dentro de cada codigo_modelo. Esta columna hace ese nombre explícito
-- y editable desde el panel administrativo.

alter table public.productos_publicos
  add column if not exists nombre_modelo text;

comment on column public.productos_publicos.nombre_modelo is
  'Nombre mostrado en la portada/catálogo público para todo el modelo. Debe repetirse en las variantes que comparten codigo_modelo. Si es NULL, el catálogo usa el nombre de la presentación con el "orden" más bajo (comportamiento anterior a v0.9.6).';

-- Backfill opcional: copia el nombre de la presentación más antigua (menor
-- "orden") de cada modelo como nombre_modelo inicial, para que el campo
-- aparezca ya prellenado en el panel admin en lugar de vacío.
with primera_presentacion as (
  select distinct on (codigo_modelo) codigo_modelo, nombre
  from public.productos_publicos
  where codigo_modelo is not null and codigo_modelo <> ''
  order by codigo_modelo, orden asc nulls last, sku asc
)
update public.productos_publicos p
set nombre_modelo = pp.nombre
from primera_presentacion pp
where p.codigo_modelo = pp.codigo_modelo
  and p.nombre_modelo is null;
