-- BORRADOR PARA REVISION. NO EJECUTADO EN PRODUCCION.
-- Importadora A y N - snapshots de adquisicion y proveedor
-- Requiere respaldo y preflight antes de aplicar.
BEGIN;

-- Evitar carreras entre una edicion de inventario y el registro de una venta:
-- las funciones bloquean la fila de inventario con FOR UPDATE.
CREATE OR REPLACE FUNCTION public.registrar_venta(
 p_productos jsonb, p_fecha timestamptz DEFAULT now(),
 p_cliente_nombre text DEFAULT NULL, p_cliente_telefono text DEFAULT NULL,
 p_metodo_pago text DEFAULT NULL, p_observacion text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $fn$
DECLARE
 v_venta_id uuid;
 v_item jsonb;
 v_sku text;
 v_cantidad integer;
 v_tipo_precio text;
 v_precio_venta numeric(12,2);
 v_otros_gastos numeric(12,2);
 v_producto record;
 v_inventario record;
 v_precio_sugerido numeric(12,2);
 v_costo_proveedor numeric(12,2);
 v_costo_adquisicion numeric(12,2);
 v_stock_anterior integer;
 v_stock_nuevo integer;
 v_total_venta numeric(12,2) := 0;
 v_total_costo numeric(12,2) := 0;
 v_total_gastos numeric(12,2) := 0;
 v_total_ganancia numeric(12,2) := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
 IF NOT public.puede_editar() THEN RAISE EXCEPTION 'No tienes permiso para registrar ventas.'; END IF;
 IF p_productos IS NULL OR jsonb_typeof(p_productos) <> 'array'
    OR jsonb_array_length(p_productos) = 0 THEN
   RAISE EXCEPTION 'La venta debe contener al menos un producto.';
 END IF;

 INSERT INTO public.ventas(fecha,cliente_nombre,cliente_telefono,metodo_pago,
                           observacion,estado,creado_por)
 VALUES(coalesce(p_fecha,now()),nullif(trim(p_cliente_nombre),''),
        nullif(trim(p_cliente_telefono),''),nullif(trim(p_metodo_pago),''),
        nullif(trim(p_observacion),''),'completada',auth.uid())
 RETURNING id INTO v_venta_id;

 FOR v_item IN SELECT value FROM jsonb_array_elements(p_productos) LOOP
   v_sku := nullif(trim(v_item->>'sku'),'');
   v_cantidad := coalesce((v_item->>'cantidad')::integer,0);
   v_tipo_precio := coalesce(nullif(trim(v_item->>'tipo_precio'),''),'personalizado');
   v_precio_venta := coalesce((v_item->>'precio_venta_unitario')::numeric,-1);
   v_otros_gastos := greatest(coalesce((v_item->>'otros_gastos')::numeric,0),0);
   IF v_sku IS NULL THEN RAISE EXCEPTION 'Uno de los productos no tiene SKU.'; END IF;
   IF v_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad de % debe ser positiva.',v_sku; END IF;
   IF v_tipo_precio NOT IN ('minorista','mayorista','personalizado') THEN
     RAISE EXCEPTION 'Tipo de precio no válido para %.',v_sku;
   END IF;
   IF v_precio_venta < 0 THEN RAISE EXCEPTION 'Precio de venta inválido para %.',v_sku; END IF;

   SELECT p.sku,p.codigo_modelo,p.nombre,p.color_caja,
          CASE WHEN cardinality(p.imagenes)>0 THEN p.imagenes[1] ELSE NULL END imagen_principal
   INTO v_producto FROM public.productos_publicos p WHERE p.sku=v_sku;
   IF NOT FOUND THEN RAISE EXCEPTION 'No existe el producto %.',v_sku; END IF;

   SELECT i.stock,i.precio_base,i.factor_costo,i.factor_adquisicion,
          i.precio_minorista,i.precio_mayorista
   INTO v_inventario FROM public.inventario_privado i WHERE i.sku=v_sku FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'No existe inventario para %.',v_sku; END IF;
   IF v_inventario.precio_base IS NULL OR v_inventario.precio_base < 0
      OR v_inventario.factor_costo IS NULL OR v_inventario.factor_costo <= 0
      OR v_inventario.factor_adquisicion IS NULL OR v_inventario.factor_adquisicion <= 0
      OR v_inventario.factor_adquisicion > v_inventario.factor_costo THEN
     RAISE EXCEPTION 'Factores o precio base incompletos/inválidos para %. Revise inventario.',v_sku;
   END IF;
   IF v_inventario.stock < v_cantidad THEN
     RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, solicitado: %.',
       v_sku,v_inventario.stock,v_cantidad;
   END IF;

   v_precio_sugerido := CASE v_tipo_precio
     WHEN 'mayorista' THEN coalesce(v_inventario.precio_mayorista,v_precio_venta)
     WHEN 'minorista' THEN coalesce(v_inventario.precio_minorista,v_precio_venta)
     ELSE v_precio_venta END;
   v_costo_proveedor := round(v_inventario.precio_base*v_inventario.factor_costo,2);
   v_costo_adquisicion := round(v_inventario.precio_base*v_inventario.factor_adquisicion,2);

   INSERT INTO public.detalle_ventas(
     venta_id,sku,producto_nombre,codigo_modelo,color_caja,imagen_principal,
     tipo_precio,cantidad,precio_sugerido_unitario,precio_venta_unitario,
     precio_base_historico,factor_costo_historico,costo_proveedor_unitario,
     factor_adquisicion_historico,costo_adquisicion_unitario,
     costo_adquisicion_total,ganancia_proveedor_total,otros_gastos)
   VALUES(
     v_venta_id,v_sku,v_producto.nombre,v_producto.codigo_modelo,v_producto.color_caja,
     v_producto.imagen_principal,v_tipo_precio,v_cantidad,
     round(v_precio_sugerido,2),round(v_precio_venta,2),
     round(v_inventario.precio_base,2),v_inventario.factor_costo,v_costo_proveedor,
     v_inventario.factor_adquisicion,v_costo_adquisicion,
     round(v_costo_adquisicion*v_cantidad,2),
     round((v_costo_proveedor-v_costo_adquisicion)*v_cantidad,2),
     round(v_otros_gastos,2));

   v_stock_anterior := v_inventario.stock;
   v_stock_nuevo := v_stock_anterior-v_cantidad;
   UPDATE public.inventario_privado
     SET stock=v_stock_nuevo,actualizado_en=now() WHERE sku=v_sku;
   INSERT INTO public.movimientos_inventario(
     sku,venta_id,tipo,cantidad,stock_anterior,stock_nuevo,observacion,creado_por)
   VALUES(v_sku,v_venta_id,'venta',-v_cantidad,v_stock_anterior,v_stock_nuevo,
          'Descuento automático por venta',auth.uid());

   v_total_venta := v_total_venta + round(v_cantidad*v_precio_venta,2);
   v_total_costo := v_total_costo + round(v_cantidad*v_costo_proveedor,2);
   v_total_gastos := v_total_gastos + round(v_otros_gastos,2);
   v_total_ganancia := v_total_ganancia +
     round(v_cantidad*v_precio_venta-v_cantidad*v_costo_proveedor-v_otros_gastos,2);
 END LOOP;

 UPDATE public.ventas SET
   total_venta=round(v_total_venta,2),
   total_costo_proveedor=round(v_total_costo,2),
   total_otros_gastos=round(v_total_gastos,2),
   total_ganancia=round(v_total_ganancia,2)
 WHERE id=v_venta_id;
 RETURN v_venta_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.editar_venta(
 p_venta_id uuid,p_productos jsonb,p_fecha timestamptz,
 p_cliente_nombre text DEFAULT NULL,p_cliente_telefono text DEFAULT NULL,
 p_metodo_pago text DEFAULT NULL,p_observacion text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $fn$
DECLARE
 v_venta record;
 v_snapshots jsonb := '{}'::jsonb;
 v_snapshot jsonb;
 v_base_snapshot numeric;
 v_factor_costo_snapshot numeric;
 v_factor_adq_snapshot numeric;
 v_detalle record;
 v_item jsonb;
 v_sku text;
 v_cantidad integer;
 v_tipo_precio text;
 v_precio_venta numeric(12,2);
 v_otros_gastos numeric(12,2);
 v_producto record;
 v_inventario record;
 v_precio_sugerido numeric(12,2);
 v_costo_proveedor numeric(12,2);
 v_costo_adquisicion numeric(12,2);
 v_stock_anterior integer;
 v_stock_nuevo integer;
 v_total_venta numeric(12,2) := 0;
 v_total_costo numeric(12,2) := 0;
 v_total_gastos numeric(12,2) := 0;
 v_total_ganancia numeric(12,2) := 0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
 IF NOT public.puede_editar() THEN RAISE EXCEPTION 'No tienes permiso para editar ventas.'; END IF;
 IF p_productos IS NULL OR jsonb_typeof(p_productos)<>'array'
    OR jsonb_array_length(p_productos)=0 THEN
   RAISE EXCEPTION 'La venta debe contener al menos un producto.';
 END IF;

 SELECT * INTO v_venta FROM public.ventas WHERE id=p_venta_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La venta no existe.'; END IF;
 IF v_venta.estado<>'completada' THEN
   RAISE EXCEPTION 'Solo se pueden editar ventas completadas.';
 END IF;

 -- Mantiene la lógica original de reversión de stock y movimientos.
 FOR v_detalle IN SELECT sku,cantidad,precio_base_historico,
                            factor_costo_historico,factor_adquisicion_historico
                  FROM public.detalle_ventas
                  WHERE venta_id=p_venta_id ORDER BY creado_en,id LOOP
   -- Conservar el costo historico del SKU que ya figuraba en la venta.
   -- Si el mismo SKU aparece con distintos factores historicos,
   -- detener la edicion para evitar seleccionar uno arbitrariamente.
   v_snapshot := jsonb_build_object(
      'base',v_detalle.precio_base_historico,
      'costo',v_detalle.factor_costo_historico,
      'adquisicion',v_detalle.factor_adquisicion_historico);
   IF v_snapshots ? v_detalle.sku
      AND (v_snapshots->v_detalle.sku) IS DISTINCT FROM v_snapshot THEN
     RAISE EXCEPTION 'Historial de costos ambiguo para %. Revise antes de editar.',v_detalle.sku;
   END IF;
   v_snapshots := jsonb_set(v_snapshots,ARRAY[v_detalle.sku],v_snapshot,true);
   SELECT stock INTO v_stock_anterior FROM public.inventario_privado
     WHERE sku=v_detalle.sku FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'No existe inventario de %.',v_detalle.sku; END IF;
   v_stock_nuevo := v_stock_anterior+v_detalle.cantidad;
   UPDATE public.inventario_privado SET stock=v_stock_nuevo,actualizado_en=now()
     WHERE sku=v_detalle.sku;
   INSERT INTO public.movimientos_inventario(
     sku,venta_id,tipo,cantidad,stock_anterior,stock_nuevo,observacion,creado_por)
   VALUES(v_detalle.sku,p_venta_id,'anulacion_venta',v_detalle.cantidad,
          v_stock_anterior,v_stock_nuevo,'Reversión automática por edición de venta',auth.uid());
 END LOOP;
 DELETE FROM public.detalle_ventas WHERE venta_id=p_venta_id;

 FOR v_item IN SELECT value FROM jsonb_array_elements(p_productos) LOOP
   v_sku := nullif(trim(v_item->>'sku'),'');
   v_cantidad := coalesce((v_item->>'cantidad')::integer,0);
   v_tipo_precio := coalesce(nullif(trim(v_item->>'tipo_precio'),''),'personalizado');
   v_precio_venta := coalesce((v_item->>'precio_venta_unitario')::numeric,-1);
   v_otros_gastos := greatest(coalesce((v_item->>'otros_gastos')::numeric,0),0);
   IF v_sku IS NULL OR v_cantidad<=0 OR v_precio_venta<0
      OR v_tipo_precio NOT IN ('minorista','mayorista','personalizado') THEN
     RAISE EXCEPTION 'Hay un producto con datos inválidos.';
   END IF;

   SELECT p.sku,p.codigo_modelo,p.nombre,p.color_caja,
          CASE WHEN cardinality(p.imagenes)>0 THEN p.imagenes[1] ELSE NULL END imagen_principal
   INTO v_producto FROM public.productos_publicos p WHERE p.sku=v_sku;
   IF NOT FOUND THEN RAISE EXCEPTION 'No existe el producto %.',v_sku; END IF;

   SELECT i.stock,i.precio_base,i.factor_costo,i.factor_adquisicion,
          i.precio_minorista,i.precio_mayorista
   INTO v_inventario FROM public.inventario_privado i WHERE i.sku=v_sku FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'El producto % no tiene inventario.',v_sku; END IF;
   IF NOT (v_snapshots ? v_sku) AND
      (v_inventario.precio_base IS NULL OR v_inventario.precio_base<0
      OR v_inventario.factor_costo IS NULL OR v_inventario.factor_costo<=0
      OR v_inventario.factor_adquisicion IS NULL OR v_inventario.factor_adquisicion<=0
      OR v_inventario.factor_adquisicion>v_inventario.factor_costo) THEN
     RAISE EXCEPTION 'Factores o precio base incompletos/inválidos para %.',v_sku;
   END IF;
   IF v_inventario.stock<v_cantidad THEN
     RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, solicitado: %.',
       v_sku,v_inventario.stock,v_cantidad;
   END IF;

   v_precio_sugerido := CASE v_tipo_precio
     WHEN 'mayorista' THEN coalesce(v_inventario.precio_mayorista,v_precio_venta)
     WHEN 'minorista' THEN coalesce(v_inventario.precio_minorista,v_precio_venta)
     ELSE v_precio_venta END;
   -- SKU existente: conservar base y factores originales.
   -- SKU nuevo: tomar base y factores vigentes del inventario.
   IF v_snapshots ? v_sku THEN
     v_snapshot := v_snapshots->v_sku;
     v_base_snapshot := (v_snapshot->>'base')::numeric;
     v_factor_costo_snapshot := (v_snapshot->>'costo')::numeric;
     v_factor_adq_snapshot := (v_snapshot->>'adquisicion')::numeric;
   ELSE
     v_base_snapshot := v_inventario.precio_base;
     v_factor_costo_snapshot := v_inventario.factor_costo;
     v_factor_adq_snapshot := v_inventario.factor_adquisicion;
   END IF;
   IF v_base_snapshot IS NULL OR v_factor_costo_snapshot IS NULL
      OR v_factor_adq_snapshot IS NULL THEN
     RAISE EXCEPTION 'Falta historial de costos para %. Revise antes de editar.',v_sku;
   END IF;
   v_costo_proveedor := round(v_base_snapshot*v_factor_costo_snapshot,2);
   v_costo_adquisicion := round(v_base_snapshot*v_factor_adq_snapshot,2);

   INSERT INTO public.detalle_ventas(
     venta_id,sku,producto_nombre,codigo_modelo,color_caja,imagen_principal,
     tipo_precio,cantidad,precio_sugerido_unitario,precio_venta_unitario,
     precio_base_historico,factor_costo_historico,costo_proveedor_unitario,
     factor_adquisicion_historico,costo_adquisicion_unitario,
     costo_adquisicion_total,ganancia_proveedor_total,otros_gastos)
   VALUES(
     p_venta_id,v_sku,v_producto.nombre,v_producto.codigo_modelo,v_producto.color_caja,
     v_producto.imagen_principal,v_tipo_precio,v_cantidad,
     round(v_precio_sugerido,2),round(v_precio_venta,2),
     round(v_base_snapshot,2),v_factor_costo_snapshot,v_costo_proveedor,
     v_factor_adq_snapshot,v_costo_adquisicion,
     round(v_costo_adquisicion*v_cantidad,2),
     round((v_costo_proveedor-v_costo_adquisicion)*v_cantidad,2),
     round(v_otros_gastos,2));

   v_stock_anterior := v_inventario.stock;
   v_stock_nuevo := v_stock_anterior-v_cantidad;
   UPDATE public.inventario_privado SET stock=v_stock_nuevo,actualizado_en=now()
     WHERE sku=v_sku;
   INSERT INTO public.movimientos_inventario(
     sku,venta_id,tipo,cantidad,stock_anterior,stock_nuevo,observacion,creado_por)
   VALUES(v_sku,p_venta_id,'venta',-v_cantidad,v_stock_anterior,v_stock_nuevo,
          'Descuento automático por edición de venta',auth.uid());

   v_total_venta := v_total_venta+round(v_cantidad*v_precio_venta,2);
   v_total_costo := v_total_costo+round(v_cantidad*v_costo_proveedor,2);
   v_total_gastos := v_total_gastos+round(v_otros_gastos,2);
   v_total_ganancia := v_total_ganancia+
     round(v_cantidad*v_precio_venta-v_cantidad*v_costo_proveedor-v_otros_gastos,2);
 END LOOP;

 UPDATE public.ventas SET
   fecha=coalesce(p_fecha,fecha),
   cliente_nombre=nullif(trim(p_cliente_nombre),''),
   cliente_telefono=nullif(trim(p_cliente_telefono),''),
   metodo_pago=nullif(trim(p_metodo_pago),''),
   observacion=nullif(trim(p_observacion),''),
   total_venta=round(v_total_venta,2),
   total_costo_proveedor=round(v_total_costo,2),
   total_otros_gastos=round(v_total_gastos,2),
   total_ganancia=round(v_total_ganancia,2),
   modificada_por=auth.uid(),modificada_en=now()
 WHERE id=p_venta_id;
 RETURN p_venta_id;
END;
$fn$;

-- CREATE OR REPLACE conserva las ACL existentes. El rol anon no debe
-- poder invocar la funcion privilegiada de edicion (actualmente tiene EXECUTE).
REVOKE EXECUTE ON FUNCTION public.editar_venta(
 uuid,jsonb,timestamptz,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_venta(
 jsonb,timestamptz,text,text,text,text) FROM PUBLIC, anon;
COMMIT;
