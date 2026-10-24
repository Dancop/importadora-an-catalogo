-- ============================================================
-- IMPORTADORA A&N - v0.8.2
-- Edición transaccional de ventas
-- Autor: Codex + Daniel
-- Ejecutar una sola vez en Supabase SQL Editor.
-- ============================================================

begin;

alter table public.ventas
  add column if not exists modificada_por uuid references auth.users(id),
  add column if not exists modificada_en timestamptz;

create or replace function public.editar_venta(
    p_venta_id uuid,
    p_productos jsonb,
    p_fecha timestamptz,
    p_cliente_nombre text default null,
    p_cliente_telefono text default null,
    p_metodo_pago text default null,
    p_observacion text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_venta record;
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
    v_costo_unitario numeric(12,2);
    v_stock_anterior integer;
    v_stock_nuevo integer;
    v_total_venta numeric(12,2) := 0;
    v_total_costo numeric(12,2) := 0;
    v_total_gastos numeric(12,2) := 0;
    v_total_ganancia numeric(12,2) := 0;
begin
    if auth.uid() is null then raise exception 'Sesión no válida.'; end if;
    if not public.puede_editar() then raise exception 'No tienes permiso para editar ventas.'; end if;
    if p_productos is null or jsonb_typeof(p_productos) <> 'array' or jsonb_array_length(p_productos)=0 then
      raise exception 'La venta debe contener al menos un producto.';
    end if;

    select * into v_venta from public.ventas where id=p_venta_id for update;
    if not found then raise exception 'La venta no existe.'; end if;
    if v_venta.estado <> 'completada' then raise exception 'Solo se pueden editar ventas completadas.'; end if;

    -- Devuelve temporalmente al inventario todo lo registrado originalmente.
    for v_detalle in select sku,cantidad from public.detalle_ventas where venta_id=p_venta_id order by creado_en,id loop
      select stock into v_stock_anterior from public.inventario_privado where sku=v_detalle.sku for update;
      if not found then raise exception 'No existe el inventario del producto %.', v_detalle.sku; end if;
      v_stock_nuevo := v_stock_anterior + v_detalle.cantidad;
      update public.inventario_privado set stock=v_stock_nuevo, actualizado_en=now() where sku=v_detalle.sku;
      insert into public.movimientos_inventario(sku,venta_id,tipo,cantidad,stock_anterior,stock_nuevo,observacion,creado_por)
      values(v_detalle.sku,p_venta_id,'anulacion_venta',v_detalle.cantidad,v_stock_anterior,v_stock_nuevo,'Reversión automática por edición de venta',auth.uid());
    end loop;

    delete from public.detalle_ventas where venta_id=p_venta_id;

    for v_item in select value from jsonb_array_elements(p_productos) loop
      v_sku := nullif(trim(v_item->>'sku'),'');
      v_cantidad := coalesce((v_item->>'cantidad')::integer,0);
      v_tipo_precio := coalesce(nullif(trim(v_item->>'tipo_precio'),''),'personalizado');
      v_precio_venta := coalesce((v_item->>'precio_venta_unitario')::numeric,-1);
      v_otros_gastos := greatest(coalesce((v_item->>'otros_gastos')::numeric,0),0);
      if v_sku is null or v_cantidad<=0 or v_precio_venta<0 then raise exception 'Hay un producto con datos no válidos.'; end if;

      select p.sku,p.codigo_modelo,p.nombre,p.color_caja,
        case when cardinality(p.imagenes)>0 then p.imagenes[1] else null end imagen_principal
      into v_producto from public.productos_publicos p where p.sku=v_sku;
      if not found then raise exception 'No existe el producto con SKU %.',v_sku; end if;

      select i.stock,i.precio_base,i.factor_costo,i.precio_minorista,i.precio_mayorista
      into v_inventario from public.inventario_privado i where i.sku=v_sku for update;
      if not found then raise exception 'El producto % no tiene inventario.',v_sku; end if;
      if v_inventario.stock < v_cantidad then raise exception 'Stock insuficiente para %. Disponible: %, solicitado: %.',v_sku,v_inventario.stock,v_cantidad; end if;

      v_precio_sugerido := case v_tipo_precio when 'mayorista' then coalesce(v_inventario.precio_mayorista,v_precio_venta) when 'minorista' then coalesce(v_inventario.precio_minorista,v_precio_venta) else v_precio_venta end;
      v_costo_unitario := round(v_inventario.precio_base*v_inventario.factor_costo,2);

      insert into public.detalle_ventas(venta_id,sku,producto_nombre,codigo_modelo,color_caja,imagen_principal,tipo_precio,cantidad,precio_sugerido_unitario,precio_venta_unitario,precio_base_historico,factor_costo_historico,costo_proveedor_unitario,otros_gastos)
      values(p_venta_id,v_sku,v_producto.nombre,v_producto.codigo_modelo,v_producto.color_caja,v_producto.imagen_principal,v_tipo_precio,v_cantidad,round(v_precio_sugerido,2),round(v_precio_venta,2),round(v_inventario.precio_base,2),v_inventario.factor_costo,v_costo_unitario,round(v_otros_gastos,2));

      v_stock_anterior := v_inventario.stock;
      v_stock_nuevo := v_stock_anterior-v_cantidad;
      update public.inventario_privado set stock=v_stock_nuevo, actualizado_en=now() where sku=v_sku;
      insert into public.movimientos_inventario(sku,venta_id,tipo,cantidad,stock_anterior,stock_nuevo,observacion,creado_por)
      values(v_sku,p_venta_id,'venta',-v_cantidad,v_stock_anterior,v_stock_nuevo,'Descuento automático por edición de venta',auth.uid());

      v_total_venta := v_total_venta + round(v_cantidad*v_precio_venta,2);
      v_total_costo := v_total_costo + round(v_cantidad*v_costo_unitario,2);
      v_total_gastos := v_total_gastos + round(v_otros_gastos,2);
      v_total_ganancia := v_total_ganancia + round((v_cantidad*v_precio_venta)-(v_cantidad*v_costo_unitario)-v_otros_gastos,2);
    end loop;

    update public.ventas set
      fecha=coalesce(p_fecha,fecha),
      cliente_nombre=nullif(trim(p_cliente_nombre),''),
      cliente_telefono=nullif(trim(p_cliente_telefono),''),
      metodo_pago=nullif(trim(p_metodo_pago),''),
      observacion=nullif(trim(p_observacion),''),
      total_venta=round(v_total_venta,2),
      total_costo_proveedor=round(v_total_costo,2),
      total_otros_gastos=round(v_total_gastos,2),
      total_ganancia=round(v_total_ganancia,2),
      modificada_por=auth.uid(),
      modificada_en=now()
    where id=p_venta_id;

    return p_venta_id;
end;
$$;

revoke all on function public.editar_venta(uuid,jsonb,timestamptz,text,text,text,text) from public;
grant execute on function public.editar_venta(uuid,jsonb,timestamptz,text,text,text,text) to authenticated;

commit;
