-- SOLO LECTURA: ejecutar ANTES del despliegue y guardar resultados fuera de Supabase.
-- No sustituye un respaldo PITR ni un volcado de la base de datos.
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS firma,
       pg_get_functiondef(p.oid) AS definicion_original,
       p.proacl AS permisos_originales
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
  AND p.proname IN ('registrar_venta','editar_venta');

-- Huella del estado financiero actual: conservar resultado exportado.
SELECT count(DISTINCT d.sku) AS sku,
       count(*) AS registros,
       sum(d.cantidad) AS unidades,
       sum(d.subtotal) AS ingresos,
       sum(d.costo_adquisicion_total) AS adquisicion,
       sum(d.costo_proveedor_total) AS proveedor,
       sum(d.ganancia_proveedor_total) AS ganancia_proveedor,
       sum(d.ganancia_real) AS ganancia_nuestra
FROM public.detalle_ventas d
JOIN public.ventas v ON v.id=d.venta_id
WHERE v.estado='completada';

-- Preflight: no autorizar nuevas ventas de SKU sin factor de adquisición.
SELECT sku,precio_base,factor_costo,factor_adquisicion,stock
FROM public.inventario_privado
WHERE factor_adquisicion IS NULL
   OR factor_adquisicion<=0
   OR factor_costo IS NULL
   OR factor_costo<=0
ORDER BY sku;
