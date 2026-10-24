-- CONSULTAS DE VALIDACION DE SOLO LECTURA: ejecutar después del despliegue.
-- Las pruebas de escritura deben realizarse en una base clonada/aislada
-- con usuario autenticado de pruebas. No usar ventas reales.

-- 1. Completitud e identidad algebraica de cada detalle de venta completada
SELECT d.id,d.sku,d.venta_id,
       d.factor_adquisicion_historico,d.factor_costo_historico,
       d.costo_adquisicion_unitario,d.costo_adquisicion_total,
       d.ganancia_proveedor_total
FROM public.detalle_ventas d
JOIN public.ventas v ON v.id=d.venta_id
WHERE v.estado='completada'
  AND (d.factor_adquisicion_historico IS NULL
    OR d.factor_costo_historico IS NULL
    OR d.costo_adquisicion_unitario IS NULL
    OR d.costo_adquisicion_total IS NULL
    OR d.ganancia_proveedor_total IS NULL
    OR d.costo_adquisicion_unitario<>round(d.precio_base_historico*d.factor_adquisicion_historico,2)
    OR d.costo_adquisicion_total<>round(d.costo_adquisicion_unitario*d.cantidad,2)
    OR d.ganancia_proveedor_total<>round((d.costo_proveedor_unitario-d.costo_adquisicion_unitario)*d.cantidad,2));

-- 2. Conciliación por venta (sin diferencias)
SELECT v.id,v.numero,v.total_venta,v.total_costo_proveedor,v.total_ganancia
FROM public.ventas v
JOIN public.detalle_ventas d ON d.venta_id=v.id
WHERE v.estado='completada'
GROUP BY v.id,v.numero,v.total_venta,v.total_costo_proveedor,v.total_ganancia
HAVING v.total_venta<>sum(d.subtotal)
   OR v.total_costo_proveedor<>sum(d.costo_proveedor_total)
   OR v.total_ganancia<>sum(d.ganancia_real);

-- 3. Permisos (anon no debe poder invocar funciones SECURITY DEFINER)
SELECT p.proname,p.proacl FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
AND p.proname IN ('registrar_venta','editar_venta');

-- PLAN DE PRUEBAS EN CLON:
-- A. Venta 1 unidad de SKU con ambos factores; comprobar todos los snapshots.
-- B. Venta con cantidad 3; comprobar multiplicaciones y redondeos.
-- C. Venta con varios SKU y precio personalizado; comprobar totales y stock.
-- D. SKU sin factor_adquisicion; esperar error y rollback sin venta ni stock.
-- E. Stock insuficiente; esperar error y rollback.
-- F. Editar precio/cantidad de venta existente: conservar base y factores originales.
-- G. Editar sustituyendo SKU: nuevo SKU toma factores actuales.
-- H. Editar una venta con datos históricos incompletos: error y rollback.
-- I. Anular venta y verificar stock/estados con la función actual.
-- J. Usuario sin permiso y anon: operaciones rechazadas.
-- K. Comparar snapshot histórico y movimientos antes/después en el clon.
