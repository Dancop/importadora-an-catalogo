import { db } from './supabase-client.js';
import { WHATSAPP } from './config.js';
const adminView = document.querySelector('#admin-view');
let currentRole = null;
let currentProfile = null;
const list = document.querySelector('#admin-products');
const status = document.querySelector('#admin-status');
const productSearch = document.querySelector('#product-search');
const clearProductSearch = document.querySelector('#clear-product-search');
const searchResultCount = document.querySelector('#search-result-count');
const noSearchResults = document.querySelector('#no-search-results');
const DEFAULT_TEMPLATE = `*{nombre}*\n\n{descripcion}\n\n*Incluye y presentación:*\n{detalle}\n\n*Precio:* {precio}\n*Disponibilidad:* {disponibilidad}\n*Código:* {codigo}\n\n{enlace}`;
let shareTemplate = DEFAULT_TEMPLATE;
let catalogConfig = { nombre_empresa:'Importadora A&N', mostrar_precios:false, mostrar_costo_admin:false, logo_url:null };
let profitabilityRows = [];

document.querySelector('#logout').addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });

document.querySelectorAll('[data-admin-panel]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.adminPanel;
  document.querySelectorAll('[data-admin-panel]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#products-panel').hidden = target !== 'products-panel';
  document.querySelector('#whatsapp-panel').hidden = target !== 'whatsapp-panel';
  document.querySelector('#catalog-settings-panel').hidden = target !== 'catalog-settings-panel';
  document.querySelector('#profitability-panel').hidden = target !== 'profitability-panel';
  document.querySelector('#admin-title').textContent = target === 'products-panel' ? 'Productos' : target === 'profitability-panel' ? 'Rentabilidad' : target === 'catalog-settings-panel' ? 'Catálogo' : 'WhatsApp';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

export async function initializeAdminPanel(role, profile) {
  currentRole = role;
  currentProfile = profile;
  applyRoleUI();
  await loadProducts();
}

function applyRoleUI() {
  const labels = { administrador:'Administrador', editor:'Editor', solo_lectura:'Solo lectura' };
  const badge = document.querySelector('#current-user-badge');
  if (badge) badge.textContent = `${currentProfile?.nombre || 'Usuario'} · ${labels[currentRole]}`;
  document.querySelectorAll('[data-role-only="administrador"]').forEach(element => {
    element.hidden = currentRole !== 'administrador';
  });
  adminView.dataset.role = currentRole;
}

async function loadProducts() {
  status.hidden = false; status.textContent = 'Cargando inventario…';
  const [{ data: products, error: publicError }, { data: inventory, error: privateError }, { data: config }] = await Promise.all([
    db.from('productos_publicos').select('*').order('orden'),
    db.from('inventario_privado').select('*'),
    db.from('configuracion_publica').select('*').eq('id', 'catalogo').single()
  ]);
  if (publicError || privateError) { status.textContent = 'Esta cuenta no tiene autorización o no se pudo cargar el inventario.'; return; }
  shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
  catalogConfig = {
    nombre_empresa: config?.nombre_empresa?.trim() || 'Importadora A&N',
    mostrar_precios: config?.mostrar_precios === true,
    mostrar_costo_admin: config?.mostrar_costo_admin === true,
    logo_url: config?.logo_url || null
  };
  document.querySelector('#company-name').value = catalogConfig.nombre_empresa;
  document.querySelector('#show-prices').checked = catalogConfig.mostrar_precios;
  document.querySelector('#show-admin-cost').checked = catalogConfig.mostrar_costo_admin;
  document.querySelector('#brand-logo-preview').src = catalogConfig.logo_url || '../assets/logo.png';
  document.querySelector('#admin-company-name').textContent = catalogConfig.nombre_empresa;
  document.querySelector('#share-template').value = shareTemplate;
  updateTemplatePreview();
  const privateMap = new Map(inventory.map(i => [i.sku, i]));
  profitabilityRows = products.map(p => buildProfitabilityRow(p, privateMap.get(p.sku) || {}));
  renderProfitability();
  list.innerHTML = products.map(p => editor(p, privateMap.get(p.sku) || {})).join(''); status.hidden = true;
  list.querySelectorAll('.admin-card').forEach(bindCard);
  applyProductSearch();
  applyRoleRestrictions();
}


function applyRoleRestrictions() {
  const readOnly = currentRole === 'solo_lectura';
  document.querySelectorAll('#products-panel input, #products-panel textarea, #products-panel select').forEach(control => {
    if (control.name !== 'sku') control.disabled = readOnly;
  });
  document.querySelectorAll('#products-panel [type="submit"], #products-panel [data-remove-photo]').forEach(button => {
    button.hidden = readOnly;
    button.disabled = readOnly;
  });
  document.querySelectorAll('#products-panel [data-copy], #products-panel [data-share], #products-panel [data-toggle-cost]').forEach(button => {
    button.disabled = false;
  });
  document.querySelectorAll('#products-panel details > summary span').forEach(label => {
    if (readOnly && label.textContent.trim() === 'Editar producto') label.textContent = 'Ver producto';
  });
  if (readOnly) {
    status.hidden = false;
    status.textContent = 'Modo solo lectura: puedes consultar la información, pero no modificarla.';
  }
}

function editor(p, i) {
  const firstImage = (p.imagenes || [])[0] || '';
  const thumbnail = firstImage || '../assets/logo.png';
  const stock = Number(i.stock || 0);
  const baseValue = i.precio_base ?? '';
  const costFactor = i.factor_costo ?? 2.6;
  const ownCostValue = i.costo_propio ?? calculateOwnCost(baseValue, costFactor);
  const wholesaleValue = i.precio_mayorista ?? '';
  const retailValue = i.precio_minorista ?? '';
  const providerProfit = calculateProfit(ownCostValue, baseValue);
  const wholesaleProfit = calculateProfit(wholesaleValue, ownCostValue);
  const retailProfit = calculateProfit(retailValue, ownCostValue);
  const wholesaleMultiplier = calculateMultiplier(baseValue, wholesaleValue, i.multiplicador_mayorista);
  const retailMultiplier = calculateMultiplier(baseValue, retailValue, i.multiplicador_minorista);
  const searchText = normalizeSearch([p.sku, p.codigo_modelo, p.nombre, p.color_caja, p.color_interior, p.descripcion, p.detalle_distintivo].filter(Boolean).join(' '));
  return `<article class="admin-card" data-sku="${attr(p.sku)}" data-first-image="${attr(firstImage)}" data-search="${attr(searchText)}">
    <header class="admin-card-summary">
      <div class="admin-product-heading">
        <img class="admin-thumb" src="${attr(thumbnail)}" alt="Miniatura de ${attr(p.nombre)}">
        <div class="admin-product-copy">
          <small data-card-sku>${text(p.sku)}</small>
          <h2 data-card-name>${text(p.nombre)}</h2>
          <span data-card-color>${text(p.color_caja || '')}${p.color_interior ? ` · Interior ${text(p.color_interior)}` : ''}</span>
        </div>
      </div>
      <div class="admin-card-metrics" aria-label="Resumen comercial">
        <span class="metric-tile stock-tile ${stock > 0 ? '' : 'out'}"><small>Stock</small><strong data-card-stock>${stock}</strong></span>
        <span class="metric-tile cost-tile ${catalogConfig.mostrar_costo_admin ? 'cost-visible' : 'cost-hidden'}"><small>Proveedor recibe</small><strong data-card-cost data-cost-value="${attr(ownCostValue)}">${catalogConfig.mostrar_costo_admin ? formatAdminPrice(ownCostValue) : '••••••'}</strong><em>Proveedor gana <b data-card-provider-profit>${formatAdminPrice(providerProfit)}</b></em><button class="cost-visibility-button" type="button" data-toggle-cost aria-label="${catalogConfig.mostrar_costo_admin ? 'Ocultar monto del proveedor' : 'Mostrar monto del proveedor'}">${catalogConfig.mostrar_costo_admin ? 'Ocultar' : 'Mostrar'}</button></span>
        <span class="metric-tile wholesale-pill"><small>Mayorista</small><strong data-card-wholesale>${formatAdminPrice(wholesaleValue)}</strong><em>Ganas <b data-card-wholesale-profit>${formatAdminPrice(wholesaleProfit)}</b></em></span>
        <span class="metric-tile retail-pill"><small>Minorista</small><strong data-card-retail>${formatAdminPrice(retailValue)}</strong><em>Ganas <b data-card-retail-profit>${formatAdminPrice(retailProfit)}</b></em></span>
      </div>
    </header>
    <details>
      <summary><span>Editar producto</span><small>Stock, precios, información y fotos</small></summary>
      <form>
        <input name="costo_propio" type="hidden" value="${ownCostValue}">
        <section class="admin-form-section commercial-section" aria-labelledby="commercial-${attr(p.sku)}">
          <div class="admin-section-heading"><div><span class="section-step">1</span><div><h3 id="commercial-${attr(p.sku)}">Stock, costos y precios</h3><p>Primero se calcula tu costo; luego puedes definir cada precio o su multiplicador.</p></div></div></div>
          <label class="stock-field">Stock disponible<input name="stock" type="number" min="0" value="${i.stock ?? 0}"></label>
          <div class="cost-calculation-box">
            <div class="price-box-title"><strong>Cálculo de mi costo</strong><span>Información interna</span></div>
            <div class="field-grid cost-fields">
              <label>Precio base (Bs)<input name="precio_base" type="number" min="0" step="0.01" inputmode="decimal" value="${baseValue}" autocomplete="off"><small>Lo que costó originalmente el producto a tu proveedor.</small></label>
              <label>Factor de costo<input name="factor_costo" type="number" min="0" step="0.01" inputmode="decimal" value="${costFactor}"><small>Puedes modificarlo cuando corresponda.</small></label>
            </div>
            <div class="own-cost-result" aria-live="polite"><span>Proveedor recibe</span><strong data-own-cost>${formatAdminPrice(ownCostValue)}</strong><small>Precio base × factor de costo</small><em>Ganancia del proveedor: <b data-provider-profit>${formatAdminPrice(providerProfit)}</b></em></div>
          </div>
          <div class="sale-price-grid">
            <div class="price-box wholesale"><div class="price-box-title"><strong>Venta mayorista</strong><span>Por cantidad</span></div><label>Precio final (Bs)<input name="precio_mayorista" type="number" min="0" step="0.01" inputmode="decimal" value="${wholesaleValue}"></label><p class="profit-line">Ganas <strong data-wholesale-profit>${formatAdminPrice(wholesaleProfit)}</strong> por unidad</p><label class="multiplier-field">Multiplicador<input name="multiplicador_mayorista" type="number" min="0" step="0.0001" inputmode="decimal" value="${wholesaleMultiplier ?? ''}"></label></div>
            <div class="price-box retail"><div class="price-box-title"><strong>Venta minorista</strong><span>Unidad</span></div><label>Precio final (Bs)<input name="precio_minorista" type="number" min="0" step="0.01" inputmode="decimal" value="${retailValue}"></label><p class="profit-line">Ganas <strong data-retail-profit>${formatAdminPrice(retailProfit)}</strong> por unidad</p><label class="multiplier-field">Multiplicador<input name="multiplicador_minorista" type="number" min="0" step="0.0001" inputmode="decimal" value="${retailMultiplier ?? ''}"></label></div>
          </div>
        </section>

        <div class="admin-secondary-grid">
          <details class="form-accordion">
            <summary><span><b>2</b> Datos del producto</span><small>Nombre, modelo y colores</small></summary>
            <section class="admin-form-section identity-section" aria-labelledby="identity-${attr(p.sku)}">
              <div class="admin-section-heading"><div><div><h3 id="identity-${attr(p.sku)}">Información del producto</h3><p>Abre esta sección solo cuando necesites cambiar los datos visibles.</p></div></div></div>
              <label>Nombre del producto<input name="nombre" value="${attr(p.nombre)}" required></label>
              <div class="field-grid">
                <label>SKU<input name="sku" class="sku-input locked-input" value="${attr(p.sku)}" readonly aria-readonly="true"><small>Identificador protegido; no se modifica.</small></label>
                <label>Código de modelo<input name="codigo_modelo" value="${attr(p.codigo_modelo || '')}" required></label>
                <label>Color de caja / presentación<input name="color_caja" value="${attr(p.color_caja || '')}" placeholder="Ej.: Azul"></label>
                <label>Color interior<input name="color_interior" value="${attr(p.color_interior || '')}" placeholder="Ej.: Beige"><small>Déjalo vacío para ocultarlo en el catálogo.</small></label>
              </div>
            </section>
          </details>

          <details class="form-accordion">
            <summary><span><b>3</b> Descripción</span><small>Texto que verá el cliente</small></summary>
            <section class="admin-form-section content-section" aria-labelledby="content-${attr(p.sku)}">
              <div class="admin-section-heading"><div><div><h3 id="content-${attr(p.sku)}">Contenido del catálogo</h3><p>Edita únicamente cuando cambie la presentación o su contenido.</p></div></div></div>
              <label>Descripción general<textarea name="descripcion" rows="4">${text(p.descripcion)}</textarea></label>
              <label>Contenido de esta presentación<textarea name="detalle_distintivo" rows="4">${text(p.detalle_distintivo)}</textarea></label>
            </section>
          </details>

          <details class="form-accordion">
            <summary><span><b>4</b> Fotografías</span><small>${(p.imagenes || []).length} imagen(es)</small></summary>
            <section class="admin-form-section photos-section" aria-labelledby="photos-${attr(p.sku)}">
              <div class="admin-section-heading"><div><div><h3 id="photos-${attr(p.sku)}">Imágenes de la presentación</h3><p>Estas fotografías cambian cuando el cliente selecciona esta variante.</p></div></div></div>
              <label>Agregar fotografías<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
              <div class="photo-list">${(p.imagenes || []).map((url, n) => `<figure><a href="${url}" target="_blank"><img src="${url}" alt="Foto ${n+1}"></a><button type="button" data-remove-photo="${url}">Eliminar</button></figure>`).join('')}</div>
            </section>
          </details>
        </div>

        <p class="form-message" data-message></p>
        <div class="admin-actions sticky-save-actions"><button class="button primary" type="submit">Guardar cambios</button><button class="button secondary" type="button" data-copy>Copiar descripción</button><button class="button whatsapp" type="button" data-share>Compartir</button></div>
      </form>
    </details>
  </article>`;
}
function bindCard(card) {
  const form = card.querySelector('form');

  const updateHeader = () => {
    const name = form.nombre.value.trim() || 'Producto sin nombre';
    const sku = card.dataset.sku;
    const color = form.color_caja.value.trim();
    const interior = form.color_interior.value.trim();
    card.querySelector('[data-card-name]').textContent = name;
    card.querySelector('[data-card-sku]').textContent = sku;
    card.querySelector('[data-card-color]').textContent = [color, interior ? `Interior ${interior}` : ''].filter(Boolean).join(' · ');
    card.dataset.search = normalizeSearch([sku, form.codigo_modelo.value, name, color, interior, form.descripcion.value, form.detalle_distintivo.value].filter(Boolean).join(' '));
    applyProductSearch();
  };

  const updatePriceFromMultiplier = type => {
    const base = Number(form.precio_base.value);
    const multiplier = Number(form[`multiplicador_${type}`].value);
    const priceInput = form[`precio_${type}`];
    priceInput.value = base > 0 && multiplier >= 0 ? roundPrice(base * multiplier) : '';
    updatePriceBadges();
  };

  const updateMultiplierFromPrice = type => {
    const base = Number(form.precio_base.value);
    const price = Number(form[`precio_${type}`].value);
    const multiplierInput = form[`multiplicador_${type}`];
    multiplierInput.value = base > 0 && price >= 0 ? roundMultiplier(price / base) : '';
    updatePriceBadges();
  };

  const updatePriceBadges = () => {
    const costDisplay = card.querySelector('[data-card-cost]');
    costDisplay.dataset.costValue = form.costo_propio.value;
    if (card.querySelector('.cost-tile').classList.contains('cost-visible')) costDisplay.textContent = formatAdminPrice(form.costo_propio.value);
    const ownCost = form.costo_propio.value;
    const providerProfit = calculateProfit(ownCost, form.precio_base.value);
    const wholesaleProfit = calculateProfit(form.precio_mayorista.value, ownCost);
    const retailProfit = calculateProfit(form.precio_minorista.value, ownCost);
    card.querySelector('[data-card-wholesale]').textContent = formatAdminPrice(form.precio_mayorista.value);
    card.querySelector('[data-card-retail]').textContent = formatAdminPrice(form.precio_minorista.value);
    card.querySelector('[data-card-provider-profit]').textContent = formatAdminPrice(providerProfit);
    card.querySelector('[data-card-wholesale-profit]').textContent = formatAdminPrice(wholesaleProfit);
    card.querySelector('[data-card-retail-profit]').textContent = formatAdminPrice(retailProfit);
    card.querySelector('[data-provider-profit]').textContent = formatAdminPrice(providerProfit);
    card.querySelector('[data-wholesale-profit]').textContent = formatAdminPrice(wholesaleProfit);
    card.querySelector('[data-retail-profit]').textContent = formatAdminPrice(retailProfit);
  };

  const recalculatePricesFromMultipliers = () => {
    updatePriceFromMultiplier('mayorista');
    updatePriceFromMultiplier('minorista');
  };

  const updateOwnCost = () => {
    const ownCost = calculateOwnCost(form.precio_base.value, form.factor_costo.value);
    form.costo_propio.value = ownCost === '' ? '' : ownCost;
    card.querySelector('[data-own-cost]').textContent = formatAdminPrice(ownCost);
    const costTile = card.querySelector('.cost-tile');
    const cardCost = card.querySelector('[data-card-cost]');
    cardCost.dataset.costValue = ownCost;
    cardCost.textContent = costTile.classList.contains('cost-visible') ? formatAdminPrice(ownCost) : '••••••';
    recalculatePricesFromMultipliers();
    updatePriceBadges();
  };

  const updateStock = () => {
    const stock = Math.max(0, Number(form.stock.value) || 0);
    const badge = card.querySelector('.admin-card-metrics .stock-tile');
    card.querySelector('[data-card-stock]').textContent = stock;
    badge.classList.toggle('out', stock <= 0);
  };

  form.precio_base.addEventListener('input', updateOwnCost);
  form.factor_costo.addEventListener('input', updateOwnCost);
  form.precio_mayorista.addEventListener('input', () => updateMultiplierFromPrice('mayorista'));
  form.precio_minorista.addEventListener('input', () => updateMultiplierFromPrice('minorista'));
  form.multiplicador_mayorista.addEventListener('input', () => updatePriceFromMultiplier('mayorista'));
  form.multiplicador_minorista.addEventListener('input', () => updatePriceFromMultiplier('minorista'));
  form.stock.addEventListener('input', updateStock);
  ['nombre','codigo_modelo','color_caja','color_interior','descripcion','detalle_distintivo'].forEach(name => form[name].addEventListener('input', updateHeader));
  form.addEventListener('submit', e => save(e, card.dataset.sku));
  form.querySelector('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(descriptionText(form, card.dataset.sku)));
  form.querySelector('[data-share]').addEventListener('click', () => share(descriptionText(form, card.dataset.sku), card.dataset.firstImage, form.nombre.value));
  card.querySelector('[data-toggle-cost]').addEventListener('click', event => toggleCardCost(card, event.currentTarget));
  form.querySelectorAll('[data-remove-photo]').forEach(b => b.addEventListener('click', () => removePhoto(card.dataset.sku, b.dataset.removePhoto)));
}

function toggleCardCost(card, button) {
  const tile = card.querySelector('.cost-tile');
  const value = card.querySelector('[data-card-cost]');
  const show = tile.classList.contains('cost-hidden');
  tile.classList.toggle('cost-hidden', !show);
  tile.classList.toggle('cost-visible', show);
  value.textContent = show ? formatAdminPrice(value.dataset.costValue) : '••••••';
  button.textContent = show ? 'Ocultar' : 'Mostrar';
  button.setAttribute('aria-label', show ? 'Ocultar monto del proveedor' : 'Mostrar monto del proveedor');
}

async function save(event, sku) {
  event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('[data-message]');
  message.textContent = 'Guardando…';
  const fixedSku = sku;
  let images = [...form.querySelectorAll('.photo-list img')].map(i => i.src);
  try { images = images.concat(await uploadPhotos(fixedSku, [...form.photos.files], images.length)); }
  catch (e) { message.textContent = e.message; return; }
  const retailPrice = nullableNumber(form.precio_minorista.value);
  const publicData = { nombre: form.nombre.value.trim(), codigo_modelo: form.codigo_modelo.value.trim(), color_caja:form.color_caja.value.trim(), color_interior:form.color_interior.value.trim() || null, descripcion: form.descripcion.value.trim(), detalle_distintivo: form.detalle_distintivo.value.trim(), precio_minorista: retailPrice, imagenes: images, actualizado_en:new Date().toISOString() };
  const privateData = { stock: Number(form.stock.value), precio_base: nullableNumber(form.precio_base.value), factor_costo: nullableNumber(form.factor_costo.value), costo_propio: nullableNumber(form.costo_propio.value), multiplicador_mayorista: nullableNumber(form.multiplicador_mayorista.value), multiplicador_minorista: nullableNumber(form.multiplicador_minorista.value), actualizado_en:new Date().toISOString() };
  const [{ error: e1 }, { error: e2 }] = await Promise.all([db.from('productos_publicos').update(publicData).eq('sku', sku), db.from('inventario_privado').update(privateData).eq('sku', sku)]);
  if (e1 || e2) message.textContent = `No se guardó: ${(e1 || e2).message}`; else { message.textContent = 'Cambios guardados.'; setTimeout(loadProducts, 700); }
}

async function uploadPhotos(sku, files, existing) {
  if (existing + files.length > 6) throw new Error('Máximo 6 fotografías por producto.');
  const urls = [];
  for (let index = 0; index < files.length; index++) {
    const blob = await compress(files[index]);
    const path = `${sku}/${Date.now()}-${index}.jpg`;
    const { error } = await db.storage.from('productos').upload(path, blob, { contentType:'image/jpeg' });
    if (error) throw error;
    urls.push(db.storage.from('productos').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

function compress(file) {
  return new Promise((resolve, reject) => { const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const scale = Math.min(1, 1600 / Math.max(img.width, img.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); canvas.toBlob(blob => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error('No se pudo procesar la fotografía.')); }, 'image/jpeg', .82); };
    img.onerror = () => reject(new Error('La fotografía no es válida.')); img.src = url;
  });
}

document.querySelector('#company-logo').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  document.querySelector('#brand-logo-preview').src = URL.createObjectURL(file);
});

document.querySelector('#catalog-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#catalog-settings-message');
  const name = document.querySelector('#company-name').value.trim();
  const logoFile = document.querySelector('#company-logo').files[0];
  message.textContent = 'Guardando configuración…';
  let logoUrl = catalogConfig.logo_url;
  try {
    if (logoFile) {
      const blob = await compress(logoFile);
      const path = `marca/logo-${Date.now()}.jpg`;
      const { error: uploadError } = await db.storage.from('productos').upload(path, blob, { contentType:'image/jpeg' });
      if (uploadError) throw uploadError;
      logoUrl = db.storage.from('productos').getPublicUrl(path).data.publicUrl;
    }
    const update = { nombre_empresa:name, logo_url:logoUrl, mostrar_precios:document.querySelector('#show-prices').checked, mostrar_costo_admin:document.querySelector('#show-admin-cost').checked, actualizado_en:new Date().toISOString() };
    const { error } = await db.from('configuracion_publica').update(update).eq('id','catalogo');
    if (error) throw error;
    catalogConfig = update;
    document.querySelector('#admin-company-name').textContent = name;
    document.querySelector('#brand-logo-preview').src = logoUrl || '../assets/logo.png';
    document.querySelector('#company-logo').value = '';
    message.textContent = 'Configuración guardada. El catálogo ya fue actualizado.';
  } catch (error) { message.textContent = `No se guardó: ${error.message}`; }
});

async function removePhoto(sku, url) {
  if (!confirm('¿Eliminar esta fotografía?')) return;
  const { data } = await db.from('productos_publicos').select('imagenes').eq('sku', sku).single();
  const path = decodeURIComponent(new URL(url).pathname.split('/productos/')[1]);
  const { error } = await db.storage.from('productos').remove([path]);
  if (!error) await db.from('productos_publicos').update({ imagenes: (data.imagenes || []).filter(x => x !== url) }).eq('sku', sku);
  loadProducts();
}

function descriptionText(form, sku) {
  const retailPrice = Number(form.precio_minorista.value);
  const price = retailPrice > 0 ? `Bs ${formatNumber(retailPrice)}` : 'Consultar precio';
  const availability = Number(form.stock.value) > 0 ? 'Disponible' : 'Agotado';
  return applyTemplate(shareTemplate, {
    nombre: form.nombre.value.trim(), descripcion: form.descripcion.value.trim(),
    detalle: form.detalle_distintivo.value.trim(), precio: price,
    disponibilidad: availability, codigo: sku,
    enlace: new URL('../', location.href).href
  });
}

function applyTemplate(template, values) {
  return template.replace(/\{(nombre|descripcion|detalle|precio|disponibilidad|codigo|enlace)\}/g, (_match, key) => values[key] ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

function updateTemplatePreview() {
  const template = document.querySelector('#share-template').value;
  document.querySelector('#template-preview').textContent = applyTemplate(template, {
    nombre:'Set Ejecutivo TOMI para Caballero', descripcion:'Un set de estilo sobrio y funcional.',
    detalle:'Incluye reloj de pulsera, billetera y bolígrafo.', precio:'Bs 180',
    disponibilidad:'Disponible', codigo:'GFT-M-003-NE', enlace:new URL('../', location.href).href
  });
}

document.querySelector('#share-template').addEventListener('input', updateTemplatePreview);
document.querySelectorAll('[data-variable]').forEach(button => button.addEventListener('click', () => {
  const textarea = document.querySelector('#share-template');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.setRangeText(button.dataset.variable, start, end, 'end');
  textarea.focus();
  updateTemplatePreview();
}));
document.querySelector('#reset-template').addEventListener('click', () => {
  document.querySelector('#share-template').value = DEFAULT_TEMPLATE;
  updateTemplatePreview();
});
document.querySelector('#template-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#template-message');
  const template = document.querySelector('#share-template').value.trim();
  if (!template) { document.querySelector('#share-template').value = DEFAULT_TEMPLATE; updateTemplatePreview(); message.textContent = 'Se restauró el texto original porque el mensaje no puede quedar vacío.'; return; }
  message.textContent = 'Guardando…';
  const { error } = await db.from('configuracion_publica').update({ plantilla_whatsapp: template, actualizado_en: new Date().toISOString() }).eq('id', 'catalogo');
  if (error) message.textContent = `No se guardó: ${error.message}`;
  else { shareTemplate = template; message.textContent = 'Plantilla guardada.'; }
});
updateTemplatePreview();
async function share(value, imageUrl, productName) {
  if (navigator.share && imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const safeName = productName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'image/jpeg' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: productName, text: value, files: [file] });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  if (navigator.share) {
    try { await navigator.share({ title: productName, text: value }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(value)}`, '_blank', 'noopener');
}
function attr(v) { return String(v ?? '').replace(/[&"]/g, c => c === '&' ? '&amp;' : '&quot;'); }
function text(v) { return String(v ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function calculateOwnCost(baseValue, factorValue) {
  const base = Number(baseValue);
  const factor = Number(factorValue);
  return base >= 0 && factor >= 0 && Number.isFinite(base) && Number.isFinite(factor) ? roundPrice(base * factor) : '';
}

function calculateProfit(totalValue, costValue) {
  const total = Number(totalValue);
  const cost = Number(costValue);
  return Number.isFinite(total) && Number.isFinite(cost) ? roundPrice(total - cost) : '';
}

function calculateMultiplier(baseValue, priceValue, fallbackValue = null) {
  const base = Number(baseValue);
  const price = Number(priceValue);
  if (base > 0 && Number.isFinite(price)) return roundMultiplier(price / base);
  const fallback = Number(fallbackValue);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function roundPrice(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function roundMultiplier(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

function formatMultiplier(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `${amount.toFixed(2)}×` : '—';
}

function nullableNumber(value) {
  return value === '' ? null : Number(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(Number(value));
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatAdminPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Bs —';
  if (amount < 0) return `-Bs ${Math.abs(Math.round(amount))}`;
  return `Bs ${Math.round(amount)}`;
}


function buildProfitabilityRow(product, inventory) {
  const stock = Math.max(0, Number(inventory.stock) || 0);
  const base = Number(inventory.precio_base) || 0;
  const factor = Number(inventory.factor_costo ?? 2.6) || 0;
  const providerReceives = Number(inventory.costo_propio) || calculateOwnCost(base, factor) || 0;
  const wholesalePrice = Number(inventory.precio_mayorista) || 0;
  const retailPrice = Number(inventory.precio_minorista) || 0;
  const providerProfit = calculateProfit(providerReceives, base) || 0;
  const wholesaleProfit = calculateProfit(wholesalePrice, providerReceives) || 0;
  const retailProfit = calculateProfit(retailPrice, providerReceives) || 0;
  return {
    sku: product.sku,
    name: product.nombre || 'Producto sin nombre',
    color: [product.color_caja, product.color_interior ? `Interior ${product.color_interior}` : ''].filter(Boolean).join(' · '),
    image: (product.imagenes || [])[0] || '../assets/logo.png',
    stock,
    providerReceives,
    providerProfit,
    wholesalePrice,
    wholesaleProfit,
    retailPrice,
    retailProfit,
    search: normalizeSearch([product.sku, product.codigo_modelo, product.nombre, product.color_caja, product.color_interior].filter(Boolean).join(' '))
  };
}

function renderProfitability() {
  const summary = document.querySelector('#profitability-summary');
  const detail = document.querySelector('#profitability-detail');
  if (!summary || !detail) return;
  const totals = profitabilityRows.reduce((acc, row) => {
    acc.units += row.stock;
    acc.providerReceives += row.providerReceives * row.stock;
    acc.providerProfit += row.providerProfit * row.stock;
    acc.wholesaleProfit += row.wholesaleProfit * row.stock;
    acc.retailProfit += row.retailProfit * row.stock;
    return acc;
  }, { units:0, providerReceives:0, providerProfit:0, wholesaleProfit:0, retailProfit:0 });
  summary.innerHTML = `
    <article class="profit-summary-card"><small>Unidades disponibles</small><strong>${totals.units}</strong><span>Stock total registrado</span></article>
    <article class="profit-summary-card internal"><small>Proveedor recibe</small><strong>${formatAdminPrice(totals.providerReceives)}</strong><span>Total según stock</span></article>
    <article class="profit-summary-card"><small>Ganancia del proveedor</small><strong>${formatAdminPrice(totals.providerProfit)}</strong><span>Potencial según stock</span></article>
    <article class="profit-summary-card wholesale"><small>Tu ganancia mayorista</small><strong>${formatAdminPrice(totals.wholesaleProfit)}</strong><span>Potencial según stock</span></article>
    <article class="profit-summary-card retail"><small>Tu ganancia minorista</small><strong>${formatAdminPrice(totals.retailProfit)}</strong><span>Potencial según stock</span></article>`;
  applyProfitabilitySearch();
}

function profitabilityRowMarkup(row) {
  return `<article class="profitability-row" data-profit-search="${attr(row.search)}">
    <div class="profit-product-cell" data-label="Producto">
      <img src="${attr(row.image)}" alt="Miniatura de ${attr(row.name)}">
      <div><strong>${text(row.name)}</strong><small>${text(row.sku)}</small><span>${text(row.color)}</span></div>
    </div>
    <div class="profit-cell stock" data-label="Stock"><strong>${row.stock}</strong><small>unidades</small></div>
    <div class="profit-cell" data-label="Proveedor recibe"><strong>${formatAdminPrice(row.providerReceives)}</strong><small>${formatAdminPrice(row.providerReceives * row.stock)} total</small></div>
    <div class="profit-cell" data-label="Gana proveedor"><strong>${formatAdminPrice(row.providerProfit)}</strong><small>${formatAdminPrice(row.providerProfit * row.stock)} total</small></div>
    <div class="profit-cell wholesale" data-label="Mayorista"><strong>${formatAdminPrice(row.wholesalePrice)}</strong><small>Ganas ${formatAdminPrice(row.wholesaleProfit)}</small><em>${formatAdminPrice(row.wholesaleProfit * row.stock)} total</em></div>
    <div class="profit-cell retail" data-label="Minorista"><strong>${formatAdminPrice(row.retailPrice)}</strong><small>Ganas ${formatAdminPrice(row.retailProfit)}</small><em>${formatAdminPrice(row.retailProfit * row.stock)} total</em></div>
  </article>`;
}

function applyProfitabilitySearch() {
  const input = document.querySelector('#profitability-search');
  const clear = document.querySelector('#clear-profitability-search');
  const count = document.querySelector('#profitability-result-count');
  const empty = document.querySelector('#profitability-empty');
  const detail = document.querySelector('#profitability-detail');
  if (!input || !detail) return;
  const query = normalizeSearch(input.value);
  const rows = profitabilityRows.filter(row => !query || row.search.includes(query));
  detail.innerHTML = `<div class="profitability-table-head" aria-hidden="true"><span>Producto</span><span>Stock</span><span>Proveedor recibe</span><span>Gana proveedor</span><span>Mayorista</span><span>Minorista</span></div>${rows.map(profitabilityRowMarkup).join('')}`;
  clear.hidden = !query;
  count.textContent = query ? `${rows.length} de ${profitabilityRows.length} productos` : `${profitabilityRows.length} productos`;
  empty.hidden = rows.length > 0 || profitabilityRows.length === 0;
}

const profitabilitySearch = document.querySelector('#profitability-search');
const clearProfitabilitySearch = document.querySelector('#clear-profitability-search');
if (profitabilitySearch) profitabilitySearch.addEventListener('input', applyProfitabilitySearch);
if (clearProfitabilitySearch) clearProfitabilitySearch.addEventListener('click', () => {
  profitabilitySearch.value = '';
  applyProfitabilitySearch();
  profitabilitySearch.focus();
});

function applyProductSearch() {
  const cards = [...list.querySelectorAll('.admin-card')];
  const query = normalizeSearch(productSearch.value);
  let visible = 0;
  cards.forEach(card => {
    const matches = !query || card.dataset.search.includes(query);
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  clearProductSearch.hidden = !query;
  noSearchResults.hidden = visible > 0 || cards.length === 0;
  searchResultCount.textContent = query ? `${visible} de ${cards.length} productos` : `${cards.length} productos`;
}

productSearch.addEventListener('input', applyProductSearch);
clearProductSearch.addEventListener('click', () => {
  productSearch.value = '';
  applyProductSearch();
  productSearch.focus();
});
