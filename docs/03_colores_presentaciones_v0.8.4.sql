-- Importadora A&N
-- v0.8.4 - Presentaciones y selector de colores
-- Ejecutar una sola vez en Supabase SQL Editor.

begin;

alter table public.productos_publicos
  add column if not exists color_exterior_hex text,
  add column if not exists color_interior_hex text;

alter table public.productos_publicos
  drop constraint if exists productos_publicos_color_exterior_hex_check,
  add constraint productos_publicos_color_exterior_hex_check
    check (color_exterior_hex is null or color_exterior_hex ~ '^#[0-9A-Fa-f]{6}$');

alter table public.productos_publicos
  drop constraint if exists productos_publicos_color_interior_hex_check,
  add constraint productos_publicos_color_interior_hex_check
    check (color_interior_hex is null or color_interior_hex ~ '^#[0-9A-Fa-f]{6}$');

-- Valores iniciales sugeridos para los productos actuales.
-- Luego pueden corregirse visualmente desde el panel administrativo.
update public.productos_publicos
set color_exterior_hex = case
  when lower(color_caja) like '%negro%' then '#222222'
  when lower(color_caja) like '%azul tiffany%' then '#81D8D0'
  when lower(color_caja) like '%azul%' then '#416B91'
  when lower(color_caja) like '%rosa%' or lower(color_caja) like '%rosad%' then '#E7A8B5'
  when lower(color_caja) like '%rojo%' then '#B84A4A'
  when lower(color_caja) like '%café%' or lower(color_caja) like '%cafe%' or lower(color_caja) like '%marrón%' then '#795548'
  when lower(color_caja) like '%blanco%' then '#FFFFFF'
  else color_exterior_hex
end
where color_exterior_hex is null;

update public.productos_publicos
set color_interior_hex = case
  when lower(color_interior) like '%negro%' then '#222222'
  when lower(color_interior) like '%blanco%' then '#FFFFFF'
  when lower(color_interior) like '%beige%' then '#DCCFB7'
  when lower(color_interior) like '%rosa%' or lower(color_interior) like '%rosad%' then '#E7A8B5'
  when lower(color_interior) like '%rojo%' then '#B84A4A'
  when lower(color_interior) like '%vino%' then '#722F37'
  when lower(color_interior) like '%dorado%' then '#C6A15B'
  when lower(color_interior) like '%champagne%' then '#E6D7B9'
  when lower(color_interior) like '%lila%' then '#B8A1CE'
  when lower(color_interior) like '%azul%' then '#416B91'
  else color_interior_hex
end
where color_interior_hex is null;

commit;
