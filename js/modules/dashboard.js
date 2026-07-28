/*
===========================================
Importadora A&N
Módulo: Dashboard
Autor: Codex + Daniel
Versión: 0.7.2
Última modificación: 2026-07-28
Descripción: Resumen financiero, productos más
vendidos y actividad reciente del panel.
===========================================
*/
let context = null;
let refreshSequence = 0;

export function initializeDashboard(options) {
  context = options;
  const date = document.querySelector('#dashboard-date');
  if (date) date.textContent = new Intl.DateTimeFormat('es-BO', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());
}

export async function refreshDashboard() {
  if (!context?.db || document.querySelector('#dashboard-panel')?.hidden) return;
  const sequence = ++refreshSequence;
  const status = document.querySelector('#dashboard-status');
  const cards = document.querySelector('#dashboard-cards');
  const bestSellers = document.querySelector('#dashboard-best-sellers');
  const recentSales = document.querySelector('#dashboard-recent-sales');
  if (!status || !cards || !bestSellers || !recentSales) return;

  status.hidden = false;
  status.textContent = 'Actualizando resumen…';

  const start = new Date();
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(end.getDate()+1);

  try {
    const results = await Promise.allSettled([
      withTimeout(context.db.rpc('obtener_resumen_financiero', { p_desde:start.toISOString(), p_hasta:end.toISOString() }), 10000),
      withTimeout(context.db.from('detalle_ventas').select('sku, producto_nombre, cantidad, ventas!inner(estado)').eq('ventas.estado', 'completada').limit(500), 10000),
      withTimeout(context.db.from('ventas').select('id, numero, fecha, total_venta, total_ganancia, estado').order('fecha', { ascending:false }).limit(5), 10000)
    ]);
    if (sequence !== refreshSequence) return;

    const summaryResult = settledValue(results[0]);
    const detailResult = settledValue(results[1]);
    const salesResult = settledValue(results[2]);
    const summary = summaryResult?.data?.[0] || {};

    cards.innerHTML = [
      card('Ventas hoy', summary.ventas_completadas || 0, 'operaciones completadas'),
      card('Ingresos hoy', money(summary.ingresos), 'total cobrado'),
      card('Ganancia hoy', money(summary.ganancia_real), 'ganancia real', 'positive'),
      card('Proveedor pendiente', money(summary.saldo_pendiente_proveedor), 'saldo acumulado', 'provider')
    ].join('');

    renderBestSellers(bestSellers, detailResult);
    renderRecentSales(recentSales, salesResult);
  } catch (error) {
    console.error('No se pudo actualizar el dashboard:', error);
    cards.innerHTML = [card('Ventas hoy', 0, 'sin datos disponibles'), card('Ingresos hoy', money(0), 'sin datos disponibles'), card('Ganancia hoy', money(0), 'sin datos disponibles', 'positive'), card('Proveedor pendiente', money(0), 'sin datos disponibles', 'provider')].join('');
    bestSellers.innerHTML = empty('No se pudieron cargar los productos más vendidos.');
    recentSales.innerHTML = empty('No se pudo cargar el historial.');
  } finally {
    if (sequence === refreshSequence) status.hidden = true;
  }
}

function renderBestSellers(container, result) {
  if (!result || result.error) {
    container.innerHTML = empty('No se pudieron cargar los productos más vendidos.');
    return;
  }
  const totals = new Map();
  for (const item of result.data || []) {
    const current = totals.get(item.sku) || { sku:item.sku, nombre:item.producto_nombre || item.sku, cantidad:0 };
    current.cantidad += Number(item.cantidad) || 0;
    totals.set(item.sku, current);
  }
  const ranking = [...totals.values()].sort((a,b) => b.cantidad-a.cantidad).slice(0,5);
  if (!ranking.length) {
    container.innerHTML = empty('Aún no hay ventas para calcular este ranking.');
    return;
  }
  container.innerHTML = ranking.map((item,index) => `<button class="dashboard-list-item" type="button" data-dashboard-product><span class="ranking-number">${index+1}</span><span><strong>${escapeHtml(item.nombre)}</strong><small>${escapeHtml(item.sku)}</small></span><b>${item.cantidad} ud.</b></button>`).join('');
  container.querySelectorAll('[data-dashboard-product]').forEach(button => button.addEventListener('click', () => context.openPanel('products-panel')));
}

function renderRecentSales(container, result) {
  if (!result || result.error) {
    container.innerHTML = empty('No se pudo cargar el historial.');
  } else if (!result.data?.length) {
    container.innerHTML = empty('Todavía no hay ventas registradas.');
  } else {
    container.innerHTML = result.data.map(sale => `<div class="dashboard-list-item"><span class="sale-number">#${sale.numero || '—'}</span><span><strong>${money(sale.total_venta)}</strong><small>${formatDate(sale.fecha)} · ${escapeHtml(sale.estado)}</small></span><b>${money(sale.total_ganancia)}</b></div>`).join('');
  }
}

function settledValue(result) { return result?.status === 'fulfilled' ? result.value : null; }
function card(label, value, helper, tone='') { return `<article class="dashboard-card ${tone}"><small>${label}</small><strong>${value}</strong><span>${helper}</span></article>`; }
function money(value) { return `Bs ${new Intl.NumberFormat('es-BO',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value)||0)}`; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-BO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(date); }
function empty(message) { return `<div class="dashboard-empty">${escapeHtml(message)}</div>`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), milliseconds); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
