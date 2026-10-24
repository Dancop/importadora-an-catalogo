-- IMPORTADORA A Y N | BORRADOR V2
-- NO EJECUTAR EN PRODUCCION SIN VALIDACION INTEGRAL Y RESPALDO.
-- Compatible con el INSERT actual de registrar_venta/editar_venta, pero la edicion
-- actual ELIMINA y RECREA lineas; requiere nueva RPC para preservar IDs historicos.
BEGIN;
CREATE OR REPLACE FUNCTION public.completar_finanzas_detalle_venta()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_factor numeric;
BEGIN
  IF NEW.cantidad IS NULL OR NEW.cantidad <= 0
     OR NEW.precio_base_historico IS NULL OR NEW.precio_base_historico < 0
     OR NEW.factor_costo_historico IS NULL OR NEW.factor_costo_historico < 0
     OR NEW.precio_venta_unitario IS NULL OR NEW.precio_venta_unitario < 0
     OR NEW.otros_gastos IS NULL OR NEW.otros_gastos < 0 THEN
    RAISE EXCEPTION 'Datos financieros invalidos para SKU %', NEW.sku;
  END IF;
  -- Una linea historica explicita siempre conserva su factor.
  v_factor := NEW.factor_adquisicion_historico;
  IF v_factor IS NULL THEN
    SELECT factor_adquisicion INTO v_factor
    FROM public.inventario_privado WHERE sku=NEW.sku;
  END IF;
  IF v_factor IS NULL OR v_factor < 0 THEN
    RAISE EXCEPTION 'Falta factor adquisicion para SKU %', NEW.sku;
  END IF;
  NEW.factor_adquisicion_historico := v_factor;
  NEW.costo_adquisicion_unitario := round(NEW.precio_base_historico*v_factor,2);
  NEW.costo_adquisicion_total := round(NEW.costo_adquisicion_unitario*NEW.cantidad,2);
  NEW.costo_proveedor_unitario := round(NEW.precio_base_historico*NEW.factor_costo_historico,2);
  NEW.costo_proveedor_total := round(NEW.costo_proveedor_unitario*NEW.cantidad,2);
  NEW.ganancia_proveedor_total := NEW.costo_proveedor_total-NEW.costo_adquisicion_total;
  NEW.subtotal := round(NEW.precio_venta_unitario*NEW.cantidad,2);
  NEW.descuento_total := 0;
  NEW.ganancia_real := NEW.subtotal-NEW.costo_proveedor_total-NEW.otros_gastos;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS completar_finanzas_detalle_venta_insert ON public.detalle_ventas;
CREATE TRIGGER completar_finanzas_detalle_venta_insert
BEFORE INSERT ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION public.completar_finanzas_detalle_venta();
COMMIT;
-- PENDIENTE: reescribir editar_venta para usar detalle_id, proteger identidad,
-- evitar interbloqueos, y preservar snapshot completo por linea.
