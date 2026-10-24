-- ============================================================
-- IMPORTADORA A&N
-- v0.9.5 — Orden público del catálogo por ventas recientes
-- ============================================================
--
-- Objetivo:
--   Ordenar los modelos públicos del catálogo según sus ventas
--   completadas de los últimos N días, agrupando todas las
--   presentaciones/SKU bajo su codigo_modelo.
--
-- Seguridad:
--   La función NO devuelve cantidades vendidas, importes, clientes,
--   fechas de venta ni ningún otro dato comercial. Solo devuelve el
--   codigo_modelo (que ya es público en el catálogo) y su posición.
--   El acceso se concede explícitamente a anon y authenticated.
--
-- Fallback:
--   Si la RPC no está disponible o falla, catalog.js conserva el orden
--   existente de productos_publicos.orden.
--
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. ÍNDICES PARA EL CÁLCULO DEL RANKING
-- ------------------------------------------------------------

create index if not exists ventas_estado_fecha_idx
    on public.ventas(estado, fecha);

create index if not exists detalle_ventas_codigo_modelo_idx
    on public.detalle_ventas(codigo_modelo);

-- ------------------------------------------------------------
-- 2. FUNCIÓN PÚBLICA SEGURA PARA EL ORDEN DEL CATÁLOGO
-- ------------------------------------------------------------

create or replace function public.obtener_orden_catalogo_por_ventas(
    p_dias integer default 60
)
returns table (
    codigo_modelo text,
    posicion bigint
)
language sql
stable
security definer
set search_path = public
as $$
    with parametros as (
        select greatest(1, least(coalesce(p_dias, 60), 365))::integer as dias
    ),
    modelos_publicos as (
        select
            trim(pp.codigo_modelo) as codigo_modelo,
            min(coalesce(pp.orden, 2147483647)) as orden_manual
        from public.productos_publicos pp
        where pp.disponible is true
          and nullif(trim(pp.codigo_modelo), '') is not null
        group by trim(pp.codigo_modelo)
    ),
    ventas_por_modelo as (
        select
            coalesce(
                nullif(trim(d.codigo_modelo), ''),
                nullif(trim(pp.codigo_modelo), '')
            ) as codigo_modelo,
            sum(d.cantidad)::bigint as unidades_vendidas
        from public.detalle_ventas d
        join public.ventas v
          on v.id = d.venta_id
        left join public.productos_publicos pp
          on pp.sku = d.sku
        cross join parametros p
        where v.estado = 'completada'
          and v.fecha >= now() - make_interval(days => p.dias)
          and v.fecha < now()
        group by 1
    ),
    ranking as (
        select
            m.codigo_modelo,
            row_number() over (
                order by
                    coalesce(v.unidades_vendidas, 0) desc,
                    m.orden_manual asc,
                    m.codigo_modelo asc
            ) as posicion
        from modelos_publicos m
        left join ventas_por_modelo v
          on v.codigo_modelo = m.codigo_modelo
    )
    select
        codigo_modelo,
        posicion
    from ranking
    order by posicion;
$$;

comment on function public.obtener_orden_catalogo_por_ventas(integer) is
'Devuelve únicamente el orden de los modelos públicos según unidades vendidas en los últimos N días. No expone cantidades ni otros datos comerciales.';

-- Evita dejar EXECUTE abierto al rol PUBLIC por defecto.
revoke all on function public.obtener_orden_catalogo_por_ventas(integer) from public;
grant execute on function public.obtener_orden_catalogo_por_ventas(integer) to anon, authenticated;

commit;
