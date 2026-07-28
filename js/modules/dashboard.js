/*
===========================================
Importadora A&N
Módulo: Dashboard
Autor: Codex + Daniel
Versión: 0.7.0
Última modificación: 2026-07-28
Descripción: Resumen financiero, stock bajo y
actividad reciente del panel administrativo.
===========================================
*/
let context = null;

export function initializeDashboard(options) {
  context = options;
  const date = document.querySelector('#dashboard-date');
  if (date) date.textContent = new Intl.DateTimeFormat('es-BO', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());
}

export async function refreshDashboard() {
  if (!context?.db || document.querySelector('#dashboard-panel')?.hidden) return;
  const status = document.querySelector('#dashboard-status');
  const cards = document.querySelector('#dashboard-cards');
  const lowStock = document.querySelector('#dashboard-low-stock');
  const recentSales = document.querySelector('#dashboard-recent-sales');
  if (!status || !cards) return;
  status.hidden = false;
  status.textContent = 'Actualizando resumen…';

  const start = new Date();
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(end.getDate()+1);

  const [summaryResult, inventoryResult, salesResult] = await Promise.all([
    context.db.rpc('obtener_resumen_financiero', { p_desde:start.toISOString(), p_hasta:end.toISOString() }),
    context.db.from('inventario_privado').select('sku, stock').order('stock', { ascending:true }).limit(6),
    context.db.from('ventas').select('id, numero, fecha, total_venta, total_ganancia, estado').order('fecha', { ascending:false }).limit(5)
  ]);

  const summary = summaryResult.data?.[0] || {};
  cards.innerHTML = [
    card('Ventas hoy', summary.ventas_completadas || 0, 'operaciones completadas'),
    card('Ingresos hoy', money(summary.ingresos), 'total cobrado'),
    card('Ganancia hoy', money(summary.ganancia_real), 'ganancia real', 'positive'),
    card('Proveedor pendiente', money(summary.saldo_pendiente_proveedor), 'saldo acumulado', 'provider')
  ].join('');

  if (inventoryResult.error) {
    lowStock.innerHTML = empty('No se pudo cargar el inventario.');
  } else if (!inventoryResult.data?.length) {
    lowStock.innerHTML = empty('No hay productos registrados.');
  } else {
    const skus = inventoryResult.data.map(item => item.sku);
    const { data: products } = await context.db.from('productos_publicos').select('sku,nombre,imagenes').in('sku', skus);
    const map = new Map((products || []).map(item => [item.sku,item]));
    lowStock.innerHTML = inventoryResult.data.map(item => {
      const product = map.get(item.sku) || {};
      const image = product.imagenes?.[0] || '../assets/logo.png';
      return `<button class="dashboard-list-item" type="button" data-dashboard-product><img src="${escapeAttr(image)}" alt=""><span><strong>${escapeHtml(product.nombre || item.sku)}</strong><small>${escapeHtml(item.sku)}</small></span><b class="stock-pill ${item.stock <= 2 ? 'critical' : ''}">${item.stock}</b></button>`;
    }).join('');
    lowStock.querySelectorAll('[data-dashboard-product]').forEach(button => button.addEventListener('click', () => context.openPanel('products-panel')));
  }

  if (salesResult.error) {
    recentSales.innerHTML = empty('No se pudo cargar el historial.');
  } else if (!salesResult.data?.length) {
    recentSales.innerHTML = empty('Todavía no hay ventas registradas.');
  } else {
    recentSales.innerHTML = salesResult.data.map(sale => `<div class="dashboard-list-item"><span class="sale-number">#${sale.numero || '—'}</span><span><strong>${money(sale.total_venta)}</strong><small>${formatDate(sale.fecha)} · ${sale.estado}</small></span><b>${money(sale.total_ganancia)}</b></div>`).join('');
  }

  status.hidden = true;
}

function card(label, value, helper, tone='') { return `<article class="dashboard-card ${tone}"><small>${label}</small><strong>${value}</strong><span>${helper}</span></article>`; }
function money(value) { return `Bs ${new Intl.NumberFormat('es-BO',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value)||0)}`; }
function formatDate(value) { return new Intl.DateTimeFormat('es-BO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function empty(message) { return `<div class="dashboard-empty">${message}</div>`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(value) { return String(value ?? '').replace(/[&"]/g, c => c === '&' ? '&amp;' : '&quot;'); }
