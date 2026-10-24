-- IMPORTADORA A Y N | CANDIDATO V3 | NO EJECUTAR EN PRODUCCION
-- Función y trigger financieros; requiere validación integral y aprobación antes de desplegar.
-- Mantiene los factores históricos existentes en UPDATE. Para INSERT usa los
-- factores proporcionados o los actuales del inventario. No modifica inventario.
BEGIN;
CREATE OR REPLACE FUNCTION public.completar_finanzas_detalle_venta_v3()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $fn$
DECLARE
  v_adquisicion numeric;
  v_costo numeric;
BEGIN
  IF NEW.cantidad IS NULL OR NEW.cantidad <= 0
     OR NEW.precio_venta_unitario IS NULL OR NEW.precio_venta_unitario < 0
     OR NEW.precio_base_historico IS NULL OR NEW.precio_base_historico < 0 THEN
    RAISE EXCEPTION 'Cantidad, precio o base histórica inválidos';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.sku IS DISTINCT FROM OLD.sku OR NEW.venta_id IS DISTINCT FROM OLD.venta_id THEN
      RAISE EXCEPTION 'No se permite reasignar el SKU ni la venta de un detalle existente';
    END IF;
    -- El historial no se puede revalorizar silenciosamente.
    IF NEW.precio_base_historico IS DISTINCT FROM OLD.precio_base_historico
       OR NEW.factor_costo_historico IS DISTINCT FROM OLD.factor_costo_historico
       OR NEW.factor_adquisicion_historico IS DISTINCT FROM OLD.factor_adquisicion_historico THEN
      RAISE EXCEPTION 'Los factores y el precio base históricos son inmutables';
    END IF;
  END IF;

  IF NEW.factor_adquisicion_historico IS NULL OR NEW.factor_costo_historico IS NULL THEN
    SELECT factor_adquisicion, factor_costo
      INTO v_adquisicion, v_costo
      FROM public.inventario_privado WHERE sku = NEW.sku;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventario inexistente para %', NEW.sku; END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.factor_adquisicion_historico := COALESCE(NEW.factor_adquisicion_historico, v_adquisicion);
      NEW.factor_costo_historico := COALESCE(NEW.factor_costo_historico, v_costo);
    END IF;
  END IF;

  IF NEW.factor_adquisicion_historico IS NULL OR NEW.factor_costo_historico IS NULL
     OR NEW.factor_adquisicion_historico <= 0 OR NEW.factor_costo_historico <= 0
     OR NEW.factor_costo_historico < NEW.factor_adquisicion_historico THEN
    RAISE EXCEPTION 'Factores históricos inválidos para %', NEW.sku;
  END IF;

  NEW.costo_adquisicion_unitario := round(NEW.precio_base_historico * NEW.factor_adquisicion_historico, 2);
  NEW.costo_adquisicion_total := round(NEW.costo_adquisicion_unitario * NEW.cantidad, 2);
  NEW.costo_proveedor_unitario := round(NEW.precio_base_historico * NEW.factor_costo_historico, 2);
  NEW.costo_proveedor_total := round(NEW.costo_proveedor_unitario * NEW.cantidad, 2);
  NEW.ganancia_proveedor_total := NEW.costo_proveedor_total - NEW.costo_adquisicion_total;
  NEW.subtotal := round(NEW.precio_venta_unitario * NEW.cantidad, 2);
  NEW.descuento_total := greatest(round((NEW.precio_sugerido_unitario - NEW.precio_venta_unitario) * NEW.cantidad, 2), 0);
  NEW.otros_gastos := COALESCE(NEW.otros_gastos, 0);
  IF NEW.otros_gastos < 0 THEN RAISE EXCEPTION 'Gastos negativos no permitidos'; END IF;
  NEW.ganancia_real := NEW.subtotal - NEW.costo_proveedor_total - NEW.otros_gastos;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_completar_finanzas_detalle_v3 ON public.detalle_ventas;
CREATE TRIGGER trg_completar_finanzas_detalle_v3
BEFORE INSERT OR UPDATE ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION public.completar_finanzas_detalle_venta_v3();
COMMIT;
-- IMPORTANTE: esta migración no arregla la función editar_venta actual, que
-- borra detalles y recrea líneas. Debe instalarse conjuntamente con la RPC
-- que conserve id_detalle y los históricos, y el frontend compatible.
