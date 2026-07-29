/*
===========================================
Importadora A&N
Módulo: Ventas
Autor: Codex + Daniel
Versión: 0.8.1
Última modificación: 2026-07-29
Descripción: Registro rápido de ventas con precio real editable,
resumen de proveedor y ganancia, descuento automático de stock
e historial separado de operaciones, con fecha de venta editable.
===========================================
*/

let context;
let loaded = false;
let loadingPromise = null;
let products = [];
let cart = [];
let saving = false;

const $ = selector => document.querySelector(selector);
const money = value => `Bs ${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

export function initializeSales(options) {
  context = options;
  bindStaticEvents();
  applyPermissions();
  setDefaultSaleDate();
}

export function openSales() {
  if (!loaded) ensureLoaded();
}

function bindStaticEvents() {
  document.querySelectorAll('[data-sales-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.salesView)));
  $('#sales-product-search')?.addEventListener('input', renderProducts);
  $('#sales-clear-cart')?.addEventListener('click', () => { cart = []; renderCart(); });
  $('#sales-register')?.addEventListener('click', registerSale);
  $('#sales-refresh-history')?.addEventListener('click', loadHistory);
  $('#sales-new-sale')?.addEventListener('click', () => { closeSuccess(); resetSale(); setView('new'); });
  $('#sales-view-history')?.addEventListener('click', () => { closeSuccess(); setView('history'); });
}

function applyPermissions() {
  const readOnly = context.role === 'solo_lectura';
  $('#sales-register').hidden = readOnly;
  if (readOnly) $('#sales-save-message').textContent = 'Tu rol permite consultar ventas, pero no registrar nuevas operaciones.';
}

function setView(view) {
  document.querySelectorAll('[data-sales-view]').forEach(button => button.classList.toggle('active', button.dataset.salesView === view));
  document.querySelectorAll('[data-sales-view-panel]').forEach(panel => { panel.hidden = panel.dataset.salesViewPanel !== view; });
  if (view === 'new') ensureLoaded();
  if (view === 'history') loadHistory();
}

function ensureLoaded() {
  if (loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  const status = $('#sales-products-status');
  status.textContent = 'Cargando productos…';
  loadingPromise = Promise.all([
    withTimeout(context.db.from('productos_publicos').select('sku,nombre,codigo_modelo,color_caja,imagenes').order('orden'), 15000),
    withTimeout(context.db.from('inventario_privado').select('sku,stock,precio_base,factor_costo,precio_minorista,precio_mayorista'), 15000)
  ]).then(([publicResult, privateResult]) => {
    if (publicResult.error) throw publicResult.error;
    if (privateResult.error) throw privateResult.error;
    const inventory = new Map((privateResult.data || []).map(row => [row.sku, row]));
    products = (publicResult.data || []).map(product => {
      const item = inventory.get(product.sku) || {};
      return {
        ...product,
        stock: Number(item.stock) || 0,
        precio_base: Number(item.precio_base) || 0,
        factor_costo: Number(item.factor_costo) || 0,
        precio_minorista: Number(item.precio_minorista) || 0,
        precio_mayorista: Number(item.precio_mayorista) || 0,
        costo_proveedor: (Number(item.precio_base) || 0) * (Number(item.factor_costo) || 0),
        imagen: Array.isArray(product.imagenes) ? product.imagenes[0] : null
      };
    }).filter(product => product.stock > 0);
    loaded = true;
    status.textContent = products.length ? `${products.length} productos disponibles.` : 'No hay productos con stock disponible.';
    renderProducts();
  }).catch(error => {
    console.error('No se pudieron cargar productos para ventas:', error);
    status.innerHTML = 'No se pudieron cargar los productos. <button id="sales-retry-products" class="text-button" type="button">Reintentar</button>';
    $('#sales-retry-products')?.addEventListener('click', () => { loadingPromise = null; ensureLoaded(); });
  }).finally(() => { loadingPromise = null; });
  return loadingPromise;
}

function renderProducts() {
  const container = $('#sales-product-list');
  const term = ($('#sales-product-search')?.value || '').trim().toLowerCase();
  const visible = products.filter(product => [product.nombre, product.sku, product.codigo_modelo, product.color_caja].some(value => String(value || '').toLowerCase().includes(term)));
  container.innerHTML = visible.map(product => `
    <article class="sales-product-card">
      ${product.imagen ? `<img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy">` : '<div class="sales-product-placeholder">Sin foto</div>'}
      <div class="sales-product-info"><strong>${escapeHtml(product.nombre)}</strong><small>${escapeHtml(product.sku)}${product.color_caja ? ` · ${escapeHtml(product.color_caja)}` : ''}</small><span>Stock: ${product.stock}</span></div>
      <div class="sales-price-actions">
        <button type="button" data-add-sale="${escapeHtml(product.sku)}" data-price-type="minorista" ${product.precio_minorista <= 0 ? 'disabled' : ''}><small>Minorista</small><strong>${money(product.precio_minorista)}</strong></button>
        <button type="button" data-add-sale="${escapeHtml(product.sku)}" data-price-type="mayorista" ${product.precio_mayorista <= 0 ? 'disabled' : ''}><small>Mayorista</small><strong>${money(product.precio_mayorista)}</strong></button>
      </div>
    </article>`).join('') || '<div class="sales-empty-state">No encontramos productos con ese texto.</div>';
  container.querySelectorAll('[data-add-sale]').forEach(button => button.addEventListener('click', () => addProduct(button.dataset.addSale, button.dataset.priceType)));
}

function addProduct(sku, type) {
  const product = products.find(item => item.sku === sku);
  if (!product) return;
  const suggested = type === 'mayorista' ? product.precio_mayorista : product.precio_minorista;
  const existing = cart.find(item => item.sku === sku);
  if (existing) {
    existing.tipo_precio = type;
    existing.precio_sugerido = suggested;
    existing.precio_venta = suggested;
  } else {
    cart.push({ ...product, cantidad: 1, tipo_precio: type, precio_sugerido: suggested, precio_venta: suggested });
  }
  renderCart();
  document.querySelector('.sales-cart-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCart() {
  const list = $('#sales-cart-list');
  $('#sales-cart-empty').hidden = cart.length > 0;
  list.innerHTML = cart.map(item => `
    <article class="sales-cart-item" data-cart-sku="${escapeHtml(item.sku)}">
      <div class="sales-cart-product">${item.imagen ? `<img src="${escapeHtml(item.imagen)}" alt="">` : ''}<div><strong>${escapeHtml(item.nombre)}</strong><small>${item.tipo_precio === 'mayorista' ? 'Mayorista' : 'Minorista'} sugerido: ${money(item.precio_sugerido)}</small></div><button type="button" data-remove-cart aria-label="Quitar producto">×</button></div>
      <div class="sales-cart-controls">
        <label>Cantidad<div class="quantity-control"><button type="button" data-qty="-1">−</button><input type="number" min="1" max="${item.stock}" value="${item.cantidad}" inputmode="numeric" data-cart-quantity><button type="button" data-qty="1">＋</button></div></label>
        <label>Precio vendido <div class="price-input"><span>Bs</span><input type="number" min="0" step="0.01" value="${item.precio_venta}" inputmode="decimal" data-cart-price></div></label>
      </div>
      <div class="sales-cart-item-totals"><span>Subtotal <strong>${money(item.cantidad * item.precio_venta)}</strong></span><span>Proveedor <strong>${money(item.cantidad * item.costo_proveedor)}</strong></span><span>Ganancia <strong>${money(item.cantidad * (item.precio_venta - item.costo_proveedor))}</strong></span></div>
    </article>`).join('');

  list.querySelectorAll('[data-cart-sku]').forEach(card => bindCartItem(card));
  renderTotals();
}

function bindCartItem(card) {
  const item = cart.find(row => row.sku === card.dataset.cartSku);
  card.querySelector('[data-remove-cart]').addEventListener('click', () => { cart = cart.filter(row => row.sku !== item.sku); renderCart(); });
  card.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => {
    item.cantidad = Math.max(1, Math.min(item.stock, item.cantidad + Number(button.dataset.qty)));
    renderCart();
  }));
  card.querySelector('[data-cart-quantity]').addEventListener('change', event => {
    item.cantidad = Math.max(1, Math.min(item.stock, Number(event.target.value) || 1));
    renderCart();
  });
  card.querySelector('[data-cart-price]').addEventListener('change', event => {
    item.precio_venta = Math.max(0, Number(event.target.value) || 0);
    renderCart();
  });
}

function totals() {
  return cart.reduce((sum, item) => {
    sum.total += item.cantidad * item.precio_venta;
    sum.proveedor += item.cantidad * item.costo_proveedor;
    return sum;
  }, { total: 0, proveedor: 0 });
}

function renderTotals() {
  const result = totals();
  $('#sale-total').textContent = money(result.total);
  $('#sale-provider-total').textContent = money(result.proveedor);
  $('#sale-profit-total').textContent = money(result.total - result.proveedor);
  $('#sales-register').disabled = !cart.length || saving || context.role === 'solo_lectura';
}

async function registerSale() {
  if (!cart.length || saving) return;
  saving = true;
  const button = $('#sales-register');
  const message = $('#sales-save-message');
  button.disabled = true;
  button.textContent = 'Registrando…';
  message.textContent = '';
  try {
    const payload = cart.map(item => ({
      sku: item.sku,
      cantidad: item.cantidad,
      tipo_precio: item.tipo_precio,
      precio_venta_unitario: item.precio_venta,
      otros_gastos: 0
    }));
    const { data: saleId, error } = await withTimeout(context.db.rpc('registrar_venta', {
      p_productos: payload,
      p_fecha: saleDateToIso($('#sale-date').value),
      p_cliente_nombre: $('#sale-client-name').value.trim() || null,
      p_cliente_telefono: $('#sale-client-phone').value.trim() || null,
      p_metodo_pago: $('#sale-payment-method').value || null,
      p_observacion: $('#sale-observation').value.trim() || null
    }), 20000);
    if (error) throw error;
    const { data: sale } = await context.db.from('ventas').select('numero,total_venta,total_costo_proveedor,total_ganancia').eq('id', saleId).single();
    const completedSale = sale || { total_venta: totals().total, total_costo_proveedor: totals().proveedor, total_ganancia: totals().total - totals().proveedor };
    loaded = false;
    products = [];
    resetSale();
    showSuccess(completedSale);
    if (context.onSaleRegistered) context.onSaleRegistered();
  } catch (error) {
    console.error('No se pudo registrar la venta:', error);
    message.textContent = friendlyError(error);
  } finally {
    saving = false;
    button.textContent = 'Registrar venta';
    renderTotals();
  }
}

function showSuccess(sale) {
  $('#sales-success-number').textContent = sale.numero ? `Venta #${sale.numero}` : 'Venta guardada correctamente';
  $('#sales-success-totals').innerHTML = `<div><span>Total venta</span><strong>${money(sale.total_venta)}</strong></div><div><span>Proveedor</span><strong>${money(sale.total_costo_proveedor)}</strong></div><div><span>Ganancia</span><strong>${money(sale.total_ganancia)}</strong></div>`;
  $('#sales-success').hidden = false;
  document.body.classList.add('sales-modal-open');
}

function closeSuccess() {
  $('#sales-success').hidden = true;
  document.body.classList.remove('sales-modal-open');
}

function resetSale() {
  cart = [];
  ['#sale-client-name','#sale-client-phone','#sale-observation','#sales-product-search'].forEach(selector => { if ($(selector)) $(selector).value = ''; });
  $('#sale-payment-method').value = '';
  setDefaultSaleDate();
  $('#sales-save-message').textContent = '';
  renderCart();
  ensureLoaded();
}

async function loadHistory() {
  const status = $('#sales-history-status');
  const list = $('#sales-history-list');
  status.textContent = 'Cargando historial…';
  const { data, error } = await withTimeout(context.db.from('ventas').select('id,numero,fecha,cliente_nombre,metodo_pago,estado,total_venta,total_costo_proveedor,total_ganancia').order('fecha', { ascending: false }).limit(50), 15000).catch(error => ({ error }));
  if (error) {
    console.error('No se pudo cargar el historial:', error);
    status.textContent = 'No se pudo cargar el historial.';
    list.innerHTML = '';
    return;
  }
  status.textContent = data.length ? `${data.length} ventas recientes.` : '';
  list.innerHTML = data.map(sale => `<article class="sales-history-item"><div class="sales-history-main"><span class="sale-number">#${sale.numero || '—'}</span><div><strong>${escapeHtml(sale.cliente_nombre || 'Cliente no especificado')}</strong><small>${formatDate(sale.fecha)}${sale.metodo_pago ? ` · ${escapeHtml(sale.metodo_pago)}` : ''}</small></div></div><div class="sales-history-values"><span>Total <strong>${money(sale.total_venta)}</strong></span><span>Proveedor <strong>${money(sale.total_costo_proveedor)}</strong></span><span>Ganancia <strong>${money(sale.total_ganancia)}</strong></span></div><span class="sale-status ${sale.estado}">${escapeHtml(sale.estado)}</span></article>`).join('') || '<div class="sales-empty-state">Todavía no hay ventas registradas.</div>';
}


function setDefaultSaleDate() {
  const input = $('#sale-date');
  if (!input) return;
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  input.value = localDate;
  input.max = localDate;
}

function saleDateToIso(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function friendlyError(error) {
  const message = error?.message || 'No se pudo registrar la venta.';
  if (/stock insuficiente/i.test(message)) return message;
  if (/permiso|autoriz/i.test(message)) return 'Tu cuenta no tiene permiso para registrar ventas.';
  if (/tiempo de espera/i.test(message)) return 'La operación tardó demasiado. Comprueba tu conexión antes de volver a intentarlo.';
  return `No se pudo registrar: ${message}`;
}
function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), milliseconds); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
