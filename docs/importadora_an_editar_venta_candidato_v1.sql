-- CANDIDATO PARA REVISION / NO EJECUTAR EN PRODUCCION
-- Instalar conjuntamente con importadora_an_finanzas_trigger_candidato_v3.sql.
-- Conserva la firma existente; cada linea historica envia id_detalle.
CREATE OR REPLACE FUNCTION public.editar_venta(
 p_venta_id uuid,p_productos jsonb,p_fecha timestamptz,
 p_cliente_nombre text DEFAULT NULL,p_cliente_telefono text DEFAULT NULL,
 p_metodo_pago text DEFAULT NULL,p_observacion text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth
AS $fn$
DECLARE
 v_item jsonb; v_sku text; v_id uuid; v_qty int; v_precio numeric;
 v_gastos numeric; v_tipo text; v_original record; v_inv record;
 v_prod record; v_old int; v_new int; v_delta int; v_stock int;
 v_sugerido numeric; v_sku_lock text;
 v_ids uuid[] := ARRAY[]::uuid[];
 v_items jsonb := '[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida.'; END IF;
 IF NOT public.puede_editar() THEN RAISE EXCEPTION 'No tienes permiso para editar ventas.'; END IF;
 IF p_productos IS NULL OR jsonb_typeof(p_productos)<>'array'
    OR jsonb_array_length(p_productos)=0 THEN
   RAISE EXCEPTION 'La venta debe contener al menos un producto.';
 END IF;
 PERFORM 1 FROM public.ventas WHERE id=p_venta_id AND estado='completada' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La venta no existe o no está completada.'; END IF;

 -- Validar TODO antes de escribir y evitar IDs históricos duplicados.
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_productos) LOOP
   IF jsonb_typeof(v_item)<>'object' THEN RAISE EXCEPTION 'Línea inválida'; END IF;
   v_sku:=nullif(btrim(v_item->>'sku'),'');
   v_qty:=(v_item->>'cantidad')::int;
   v_precio:=(v_item->>'precio_venta_unitario')::numeric;
   v_gastos:=coalesce((v_item->>'otros_gastos')::numeric,0);
   v_tipo:=coalesce(nullif(btrim(v_item->>'tipo_precio'),''),'personalizado');
   v_id:=nullif(v_item->>'id_detalle','')::uuid;
   IF v_sku IS NULL OR v_qty IS NULL OR v_qty<=0
      OR v_precio IS NULL OR v_precio<0 OR v_gastos<0 THEN
      RAISE EXCEPTION 'Hay un producto con datos no válidos.';
   END IF;
   IF v_id IS NOT NULL THEN
     IF v_id=ANY(v_ids) THEN RAISE EXCEPTION 'ID de detalle repetido: %',v_id; END IF;
     SELECT id,sku INTO v_original FROM public.detalle_ventas
       WHERE id=v_id AND venta_id=p_venta_id;
     IF NOT FOUND OR v_original.sku IS DISTINCT FROM v_sku THEN
       RAISE EXCEPTION 'ID de detalle ajeno a la venta o SKU incorrecto.';
     END IF;
     v_ids:=array_append(v_ids,v_id);
   END IF;
   v_items:=v_items||jsonb_build_array(jsonb_build_object(
     'id_detalle',v_id,'sku',v_sku,'cantidad',v_qty,
     'precio_venta_unitario',v_precio,'otros_gastos',v_gastos,
     'tipo_precio',v_tipo));
 END LOOP;

 -- Bloquear inventario en orden determinista; sumar cantidades por SKU.
 FOR v_sku_lock IN
   SELECT sku FROM (
      SELECT sku FROM public.detalle_ventas WHERE venta_id=p_venta_id
      UNION SELECT value->>'sku' FROM jsonb_array_elements(v_items)
   ) z ORDER BY sku
 LOOP
   SELECT * INTO v_inv FROM public.inventario_privado
      WHERE sku=v_sku_lock FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'No existe inventario para %',v_sku_lock; END IF;
   SELECT coalesce(sum(cantidad),0)::int INTO v_old
     FROM public.detalle_ventas WHERE venta_id=p_venta_id AND sku=v_sku_lock;
   SELECT coalesce(sum((value->>'cantidad')::int),0)::int INTO v_new
     FROM jsonb_array_elements(v_items) WHERE value->>'sku'=v_sku_lock;
   IF v_inv.stock+v_old-v_new<0 THEN
     RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, solicitado: %.',
       v_sku_lock,v_inv.stock+v_old,v_new;
   END IF;
 END LOOP;

 -- Eliminar solamente las líneas omitidas.
 DELETE FROM public.detalle_ventas d WHERE d.venta_id=p_venta_id
   AND NOT (d.id=ANY(v_ids));

 -- Conservar IDs, base, factores y costos unitarios de líneas existentes.
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
   v_id:=(v_item->>'id_detalle')::uuid;
   v_sku:=v_item->>'sku';
   v_qty:=(v_item->>'cantidad')::int;
   v_precio:=(v_item->>'precio_venta_unitario')::numeric;
   v_gastos:=(v_item->>'otros_gastos')::numeric;
   v_tipo:=v_item->>'tipo_precio';
   IF v_id IS NOT NULL THEN
     UPDATE public.detalle_ventas
     SET cantidad=v_qty,precio_venta_unitario=round(v_precio,2),
         otros_gastos=round(v_gastos,2),tipo_precio=v_tipo
     WHERE id=v_id AND venta_id=p_venta_id;
   ELSE
     SELECT p.sku,p.nombre,p.codigo_modelo,p.color_caja,
       CASE WHEN cardinality(p.imagenes)>0 THEN p.imagenes[1] ELSE NULL END AS imagen
       INTO v_prod FROM public.productos_publicos p WHERE p.sku=v_sku;
     IF NOT FOUND THEN RAISE EXCEPTION 'Producto inexistente: %',v_sku; END IF;
     SELECT * INTO v_inv FROM public.inventario_privado WHERE sku=v_sku;
     v_sugerido:=CASE v_tipo
       WHEN 'mayorista' THEN coalesce(v_inv.precio_mayorista,v_precio)
       WHEN 'minorista' THEN coalesce(v_inv.precio_minorista,v_precio)
       ELSE v_precio END;
     INSERT INTO public.detalle_ventas(
       venta_id,sku,producto_nombre,codigo_modelo,color_caja,imagen_principal,
       tipo_precio,cantidad,precio_sugerido_unitario,precio_venta_unitario,
       precio_base_historico,factor_costo_historico,factor_adquisicion_historico,
       costo_proveedor_unitario,otros_gastos)
     VALUES(p_venta_id,v_sku,v_prod.nombre,v_prod.codigo_modelo,v_prod.color_caja,
       v_prod.imagen,v_tipo,v_qty,round(v_sugerido,2),round(v_precio,2),
       round(v_inv.precio_base,2),v_inv.factor_costo,v_inv.factor_adquisicion,
       round(v_inv.precio_base*v_inv.factor_costo,2),round(v_gastos,2));
   END IF;
 END LOOP;

 -- IMPORTANTE: usar las cantidades originales capturadas ANTES de editar.
 -- Este candidato no aplica aún el delta neto: no ejecutar hasta incorporar
 -- una instantánea transaccional de cantidades originales y auditar movimientos.
 RAISE EXCEPTION 'CANDIDATO INCOMPLETO: falta delta neto de inventario';
END
$fn$;
