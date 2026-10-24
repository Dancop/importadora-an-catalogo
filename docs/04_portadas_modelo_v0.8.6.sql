-- Importadora A&N v0.8.6
-- Imagen de portada compartida por código de modelo.

alter table public.productos_publicos
  add column if not exists imagen_portada text;

comment on column public.productos_publicos.imagen_portada is
  'URL pública de la imagen de portada del modelo. Debe repetirse en las variantes que comparten codigo_modelo.';
