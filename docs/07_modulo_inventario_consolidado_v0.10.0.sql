-- ============================================================
-- IMPORTADORA A&N
-- Módulo: Inventario consolidado por grupos
-- Versión: 0.10.0
-- Fecha: 2026-09-26
--
-- Este script es ADITIVO. No elimina ni modifica el historial
-- de ventas/inventario existente. Primero crea la nueva capa
-- de grupos, stock por grupo, movimientos y transferencias.
-- La migración del inventario histórico se ejecutará después
-- de cerrar la conciliación documentada.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. GRUPOS / CIUDADES
-- ------------------------------------------------------------

create table if not exists public.grupos (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    ciudad text not null,
    activo boolean not null default true,
    creado_en timestamptz not null default now(),
    unique (nombre),
    unique (ciudad)
);

comment on table public.grupos is
'Grupos operativos de Importadora A&N. Cada grupo representa una ubicación/unidad de inventario.';

-- Grupos conocidos actualmente. Se pueden editar después desde el módulo de usuarios/grupos.
insert into public.grupos (nombre, ciudad)
values
    ('Oruro', 'Oruro'),
    ('Santa Cruz', 'Santa Cruz de la Sierra')
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- 2. USUARIOS POR GRUPO
-- ------------------------------------------------------------

create table if not exists public.usuarios_grupo (
    usuario_id uuid not null references auth.users(id) on delete cascade,
    grupo_id uuid not null references public.grupos(id) on delete restrict,
    rol text not null default 'gestor'
        check (rol in ('gestor', 'consulta')),
    creado_en timestamptz not null default now(),
    primary key (usuario_id, grupo_id)
);

comment on table public.usuarios_grupo is
'Asocia usuarios del panel con uno o más grupos. Administrador global no necesita asociación para operar todos los grupos.';

-- ------------------------------------------------------------
-- 3. GRUPO PROPIETARIO DEL PRODUCTO
-- ------------------------------------------------------------

alter table public.productos_publicos
    add column if not exists grupo_propietario_id uuid
    references public.grupos(id) on delete restrict;

create index if not exists productos_publicos_grupo_propietario_idx
    on public.productos_publicos(grupo_propietario_id);

comment on column public.productos_publicos.grupo_propietario_id is
'Grupo que importó/es propietario del producto. No cambia cuando el producto se transfiere a otro grupo.';

-- ------------------------------------------------------------
-- 4. STOCK FÍSICO POR GRUPO
-- ------------------------------------------------------------

create table if not exists public.stock_por_grupo (
    grupo_id uuid not null references public.grupos(id) on delete restrict,
    sku text not null references public.productos_publicos(sku) on update cascade on delete restrict,
    stock integer not null default 0 check (stock >= 0),
    actualizado_en timestamptz not null default now(),
    primary key (grupo_id, sku)
);

create index if not exists stock_por_grupo_sku_idx
    on public.stock_por_grupo(sku);

comment on table public.stock_por_grupo is
'Stock físico disponible de cada SKU en cada grupo/ciudad. La propiedad del producto se mantiene en productos_publicos.grupo_propietario_id.';

-- ------------------------------------------------------------
-- 5. MOVIMIENTOS DEL NUEVO INVENTARIO
-- ------------------------------------------------------------

create table if not exists public.movimientos_inventario_grupo (
    id uuid primary key default gen_random_uuid(),
    grupo_id uuid not null references public.grupos(id) on delete restrict,
    sku text not null references public.productos_publicos(sku) on update cascade on delete restrict,
    tipo text not null
        check (tipo in (
            'entrada',
            'ajuste_entrada',
            'ajuste_salida',
            'venta',
            'anulacion_venta',
            'transferencia_salida',
            'transferencia_entrada'
        )),
    cantidad integer not null check (cantidad <> 0),
    stock_anterior integer not null check (stock_anterior >= 0),
    stock_nuevo integer not null check (stock_nuevo >= 0),
    transferencia_id uuid,
    venta_id uuid references public.ventas(id) on delete restrict,
    observacion text,
    creado_por uuid not null default auth.uid() references auth.users(id),
    creado_en timestamptz not null default now()
);

create index if not exists movimientos_inventario_grupo_grupo_sku_idx
    on public.movimientos_inventario_grupo(grupo_id, sku, creado_en);

create index if not exists movimientos_inventario_grupo_transferencia_idx
    on public.movimientos_inventario_grupo(transferencia_id);

create index if not exists movimientos_inventario_grupo_venta_idx
    on public.movimientos_inventario_grupo(venta_id);

comment on table public.movimientos_inventario_grupo is
'Historial del inventario consolidado por grupo. No reemplaza los movimientos históricos de la etapa anterior.';

-- ------------------------------------------------------------
-- 6. TRANSFERENCIAS
-- ------------------------------------------------------------

create table if not exists public.transferencias (
    id uuid primary key default gen_random_uuid(),
    grupo_origen_id uuid not null references public.grupos(id) on delete restrict,
    grupo_destino_id uuid not null references public.grupos(id) on delete restrict,
    estado text not null default 'en_transito'
        check (estado in ('en_transito', 'recibida', 'cancelada')),
    fecha_envio timestamptz not null default now(),
    fecha_recepcion timestamptz,
    observacion text,
    creado_por uuid not null default auth.uid() references auth.users(id),
    recibido_por uuid references auth.users(id),
    creado_en timestamptz not null default now(),
    check (grupo_origen_id <> grupo_destino_id)
);

create table if not exists public.detalle_transferencias (
    id uuid primary key default gen_random_uuid(),
    transferencia_id uuid not null references public.transferencias(id) on delete restrict,
    sku text not null references public.productos_publicos(sku) on update cascade on delete restrict,
    cantidad integer not null check (cantidad > 0),
    unique (transferencia_id, sku)
);

create index if not exists transferencias_origen_idx
    on public.transferencias(grupo_origen_id, estado, fecha_envio);

create index if not exists transferencias_destino_idx
    on public.transferencias(grupo_destino_id, estado, fecha_envio);

create index if not exists detalle_transferencias_transferencia_idx
    on public.detalle_transferencias(transferencia_id);

comment on table public.transferencias is
'Transferencias entre grupos. El stock destino no aumenta hasta que el grupo receptor confirma la recepción.';

-- ------------------------------------------------------------
-- 7. GRUPO VENDEDOR EN VENTAS EXISTENTES
-- ------------------------------------------------------------

alter table public.ventas
    add column if not exists grupo_vendedor_id uuid
    references public.grupos(id) on delete restrict;

create index if not exists ventas_grupo_vendedor_idx
    on public.ventas(grupo_vendedor_id, fecha);

comment on column public.ventas.grupo_vendedor_id is
'Grupo que realizó la venta. Es nullable durante la migración histórica y se volverá obligatorio para nuevas ventas.';

-- ------------------------------------------------------------
-- 8. FUNCIÓN DE AUTORIZACIÓN POR GRUPO
-- ------------------------------------------------------------

create or replace function public.puede_operar_grupo(p_grupo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select exists (
        select 1
        from public.administradores a
        where a.usuario_id = auth.uid()
          and a.rol = 'administrador'
    )
    or exists (
        select 1
        from public.usuarios_grupo ug
        join public.administradores a on a.usuario_id = ug.usuario_id
        where ug.usuario_id = auth.uid()
          and ug.grupo_id = p_grupo_id
          and ug.rol = 'gestor'
          and a.rol in ('administrador', 'editor')
    );
$$;

-- ------------------------------------------------------------
-- 9. RPC: REGISTRAR ENTRADA DE INVENTARIO
-- ------------------------------------------------------------

create or replace function public.registrar_entrada_inventario(
    p_grupo_id uuid,
    p_productos jsonb,
    p_observacion text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_movimiento_id uuid;
    v_item jsonb;
    v_sku text;
    v_cantidad integer;
    v_stock integer;
begin
    if auth.uid() is null then
        raise exception 'Sesión no válida.';
    end if;

    if not public.puede_operar_grupo(p_grupo_id) then
        raise exception 'No tienes permiso para operar este grupo.';
    end if;

    if jsonb_typeof(p_productos) <> 'array' or jsonb_array_length(p_productos) = 0 then
        raise exception 'La entrada debe contener al menos un producto.';
    end if;

    for v_item in select * from jsonb_array_elements(p_productos)
    loop
        v_sku := nullif(trim(v_item->>'sku'), '');
        v_cantidad := (v_item->>'cantidad')::integer;

        if v_sku is null or v_cantidad is null or v_cantidad <= 0 then
            raise exception 'SKU y cantidad positiva son obligatorios.';
        end if;

        if not exists (select 1 from public.productos_publicos p where p.sku = v_sku) then
            raise exception 'El SKU % no existe.', v_sku;
        end if;

        select coalesce(s.stock, 0)
        into v_stock
        from public.stock_por_grupo s
        where s.grupo_id = p_grupo_id
          and s.sku = v_sku
        for update;

        insert into public.stock_por_grupo(grupo_id, sku, stock, actualizado_en)
        values (p_grupo_id, v_sku, v_cantidad, now())
        on conflict (grupo_id, sku)
        do update set stock = public.stock_por_grupo.stock + excluded.stock,
                      actualizado_en = now();

        v_stock := coalesce(v_stock, 0);

        insert into public.movimientos_inventario_grupo(
            grupo_id, sku, tipo, cantidad, stock_anterior, stock_nuevo, observacion
        )
        values (
            p_grupo_id, v_sku, 'entrada', v_cantidad,
            v_stock, v_stock + v_cantidad, p_observacion
        )
        returning id into v_movimiento_id;
    end loop;

    return v_movimiento_id;
end;
$$;

-- ------------------------------------------------------------
-- 10. RPC: AJUSTAR INVENTARIO
-- ------------------------------------------------------------

create or replace function public.ajustar_inventario(
    p_grupo_id uuid,
    p_sku text,
    p_nueva_cantidad integer,
    p_observacion text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_stock integer;
    v_delta integer;
    v_tipo text;
    v_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Sesión no válida.';
    end if;

    if not public.puede_operar_grupo(p_grupo_id) then
        raise exception 'No tienes permiso para operar este grupo.';
    end if;

    if p_nueva_cantidad < 0 then
        raise exception 'El stock no puede ser negativo.';
    end if;

    if nullif(trim(p_observacion), '') is null then
        raise exception 'Todo ajuste debe tener una observación.';
    end if;

    select coalesce(stock, 0)
    into v_stock
    from public.stock_por_grupo
    where grupo_id = p_grupo_id and sku = p_sku
    for update;

    if not exists (select 1 from public.productos_publicos where sku = p_sku) then
        raise exception 'El SKU % no existe.', p_sku;
    end if;

    v_delta := p_nueva_cantidad - coalesce(v_stock, 0);

    if v_delta = 0 then
        raise exception 'El stock ya tiene esa cantidad.';
    end if;

    v_tipo := case when v_delta > 0 then 'ajuste_entrada' else 'ajuste_salida' end;

    insert into public.stock_por_grupo(grupo_id, sku, stock, actualizado_en)
    values (p_grupo_id, p_sku, p_nueva_cantidad, now())
    on conflict (grupo_id, sku)
    do update set stock = excluded.stock, actualizado_en = now();

    insert into public.movimientos_inventario_grupo(
        grupo_id, sku, tipo, cantidad, stock_anterior, stock_nuevo, observacion
    )
    values (
        p_grupo_id, p_sku, v_tipo, v_delta,
        coalesce(v_stock, 0), p_nueva_cantidad, p_observacion
    )
    returning id into v_id;

    return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 11. RPC: CREAR TRANSFERENCIA
-- ------------------------------------------------------------

create or replace function public.crear_transferencia(
    p_grupo_origen_id uuid,
    p_grupo_destino_id uuid,
    p_productos jsonb,
    p_observacion text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_transferencia_id uuid;
    v_item jsonb;
    v_sku text;
    v_cantidad integer;
    v_stock integer;
    v_stock_nuevo integer;
begin
    if p_grupo_origen_id = p_grupo_destino_id then
        raise exception 'El grupo origen y destino deben ser diferentes.';
    end if;

    if not public.puede_operar_grupo(p_grupo_origen_id) then
        raise exception 'No tienes permiso para operar el grupo origen.';
    end if;

    if jsonb_typeof(p_productos) <> 'array' or jsonb_array_length(p_productos) = 0 then
        raise exception 'La transferencia debe contener al menos un producto.';
    end if;

    insert into public.transferencias(
        grupo_origen_id, grupo_destino_id, observacion
    ) values (
        p_grupo_origen_id, p_grupo_destino_id, p_observacion
    ) returning id into v_transferencia_id;

    for v_item in select * from jsonb_array_elements(p_productos)
    loop
        v_sku := nullif(trim(v_item->>'sku'), '');
        v_cantidad := (v_item->>'cantidad')::integer;

        if v_sku is null or v_cantidad is null or v_cantidad <= 0 then
            raise exception 'SKU y cantidad positiva son obligatorios.';
        end if;

        select coalesce(stock, 0)
        into v_stock
        from public.stock_por_grupo
        where grupo_id = p_grupo_origen_id and sku = v_sku
        for update;

        if coalesce(v_stock, 0) < v_cantidad then
            raise exception 'Stock insuficiente para %.', v_sku;
        end if;

        v_stock := coalesce(v_stock, 0);
        v_stock_nuevo := v_stock - v_cantidad;

        update public.stock_por_grupo
        set stock = v_stock_nuevo, actualizado_en = now()
        where grupo_id = p_grupo_origen_id and sku = v_sku;

        insert into public.detalle_transferencias(transferencia_id, sku, cantidad)
        values (v_transferencia_id, v_sku, v_cantidad);

        insert into public.movimientos_inventario_grupo(
            grupo_id, sku, tipo, cantidad, stock_anterior, stock_nuevo,
            transferencia_id, observacion
        )
        values (
            p_grupo_origen_id, v_sku, 'transferencia_salida', -v_cantidad,
            v_stock, v_stock_nuevo, v_transferencia_id, p_observacion
        );
    end loop;

    return v_transferencia_id;
end;
$$;

-- ------------------------------------------------------------
-- 12. RPC: RECIBIR TRANSFERENCIA
-- ------------------------------------------------------------

create or replace function public.recibir_transferencia(p_transferencia_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_transferencia record;
    v_item record;
    v_stock integer;
    v_movimiento_id uuid;
begin
    select * into v_transferencia
    from public.transferencias
    where id = p_transferencia_id
    for update;

    if not found then
        raise exception 'Transferencia no encontrada.';
    end if;

    if v_transferencia.estado <> 'en_transito' then
        raise exception 'La transferencia no está en tránsito.';
    end if;

    if not public.puede_operar_grupo(v_transferencia.grupo_destino_id) then
        raise exception 'No tienes permiso para recibir en el grupo destino.';
    end if;

    for v_item in
        select dt.sku, dt.cantidad
        from public.detalle_transferencias dt
        where dt.transferencia_id = p_transferencia_id
    loop
        select coalesce(stock, 0)
        into v_stock
        from public.stock_por_grupo
        where grupo_id = v_transferencia.grupo_destino_id
          and sku = v_item.sku
        for update;

        insert into public.stock_por_grupo(grupo_id, sku, stock, actualizado_en)
        values (
            v_transferencia.grupo_destino_id,
            v_item.sku,
            v_item.cantidad,
            now()
        )
        on conflict (grupo_id, sku)
        do update set stock = public.stock_por_grupo.stock + excluded.stock,
                      actualizado_en = now();

        insert into public.movimientos_inventario_grupo(
            grupo_id, sku, tipo, cantidad, stock_anterior, stock_nuevo,
            transferencia_id, observacion
        )
        values (
            v_transferencia.grupo_destino_id,
            v_item.sku,
            'transferencia_entrada',
            v_item.cantidad,
            v_stock,
            v_stock + v_item.cantidad,
            p_transferencia_id,
            'Recepción de transferencia'
        )
        returning id into v_movimiento_id;
    end loop;

    update public.transferencias
    set estado = 'recibida',
        fecha_recepcion = now(),
        recibido_por = auth.uid()
    where id = p_transferencia_id;

    return p_transferencia_id;
end;
$$;

-- ------------------------------------------------------------
-- 13. RLS
-- ------------------------------------------------------------

alter table public.grupos enable row level security;
alter table public.usuarios_grupo enable row level security;
alter table public.stock_por_grupo enable row level security;
alter table public.movimientos_inventario_grupo enable row level security;
alter table public.transferencias enable row level security;
alter table public.detalle_transferencias enable row level security;

drop policy if exists "grupos_select_panel" on public.grupos;
create policy "grupos_select_panel"
on public.grupos for select to authenticated
using (public.puede_ver_panel());

drop policy if exists "usuarios_grupo_select_panel" on public.usuarios_grupo;
create policy "usuarios_grupo_select_panel"
on public.usuarios_grupo for select to authenticated
using (public.puede_ver_panel());

drop policy if exists "stock_por_grupo_select_panel" on public.stock_por_grupo;
create policy "stock_por_grupo_select_panel"
on public.stock_por_grupo for select to authenticated
using (public.puede_ver_panel());

drop policy if exists "movimientos_inventario_grupo_select_panel" on public.movimientos_inventario_grupo;
create policy "movimientos_inventario_grupo_select_panel"
on public.movimientos_inventario_grupo for select to authenticated
using (public.puede_ver_panel());

drop policy if exists "transferencias_select_panel" on public.transferencias;
create policy "transferencias_select_panel"
on public.transferencias for select to authenticated
using (public.puede_ver_panel());

drop policy if exists "detalle_transferencias_select_panel" on public.detalle_transferencias;
create policy "detalle_transferencias_select_panel"
on public.detalle_transferencias for select to authenticated
using (public.puede_ver_panel());

revoke all on public.grupos from anon, authenticated;
revoke all on public.usuarios_grupo from anon, authenticated;
revoke all on public.stock_por_grupo from anon, authenticated;
revoke all on public.movimientos_inventario_grupo from anon, authenticated;
revoke all on public.transferencias from anon, authenticated;
revoke all on public.detalle_transferencias from anon, authenticated;

grant select on public.grupos to authenticated;
grant select on public.usuarios_grupo to authenticated;
grant select on public.stock_por_grupo to authenticated;
grant select on public.movimientos_inventario_grupo to authenticated;
grant select on public.transferencias to authenticated;
grant select on public.detalle_transferencias to authenticated;

grant execute on function public.puede_operar_grupo(uuid) to authenticated;
grant execute on function public.registrar_entrada_inventario(uuid, jsonb, text) to authenticated;
grant execute on function public.ajustar_inventario(uuid, text, integer, text) to authenticated;
grant execute on function public.crear_transferencia(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.recibir_transferencia(uuid) to authenticated;

commit;
