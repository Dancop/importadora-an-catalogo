import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, WHATSAPP } from './config.js';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const list = document.querySelector('#admin-products');
const status = document.querySelector('#admin-status');
const productSearch = document.querySelector('#product-search');
const clearProductSearch = document.querySelector('#clear-product-search');
const searchResultCount = document.querySelector('#search-result-count');
const noSearchResults = document.querySelector('#no-search-results');
const DEFAULT_TEMPLATE = `*{nombre}*\n\n{descripcion}\n\n*Incluye y presentación:*\n{detalle}\n\n*Precio:* {precio}\n*Disponibilidad:* {disponibilidad}\n*Código:* {codigo}\n\n{enlace}`;
let shareTemplate = DEFAULT_TEMPLATE;
let catalogConfig = { nombre_empresa:'Importadora A&N', mostrar_precios:false, logo_url:null };

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#login-error'); message.textContent = 'Ingresando…';
  const { error } = await db.auth.signInWithPassword({ email: document.querySelector('#email').value, password: document.querySelector('#password').value });
  if (error) message.textContent = 'Correo o contraseña incorrectos.';
});
document.querySelector('#logout').addEventListener('click', () => db.auth.signOut());
db.auth.onAuthStateChange((_event, session) => showSession(session));

document.querySelectorAll('[data-admin-panel]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.adminPanel;
  document.querySelectorAll('[data-admin-panel]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#products-panel').hidden = target !== 'products-panel';
  document.querySelector('#whatsapp-panel').hidden = target !== 'whatsapp-panel';
  document.querySelector('#catalog-settings-panel').hidden = target !== 'catalog-settings-panel';
  document.querySelector('#admin-title').textContent = target === 'products-panel' ? 'Productos' : target === 'catalog-settings-panel' ? 'Catálogo' : 'WhatsApp';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

async function showSession(session) {
  loginView.hidden = !!session; adminView.hidden = !session;
  if (session) await loadProducts();
}

async function loadProducts() {
  status.hidden = false; status.textContent = 'Cargando inventario…';
  const [{ data: products, error: publicError }, { data: inventory, error: privateError }, { data: config }] = await Promise.all([
    db.from('productos_publicos').select('*').order('orden'),
    db.from('inventario_privado').select('*'),
    db.from('configuracion_publica').select('plantilla_whatsapp,mostrar_precios,nombre_empresa,logo_url').eq('id', 'catalogo').single()
  ]);
  if (publicError || privateError) { status.textContent = 'Esta cuenta no tiene autorización o no se pudo cargar el inventario.'; return; }
  shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
  catalogConfig = {
    nombre_empresa: config?.nombre_empresa?.trim() || 'Importadora A&N',
    mostrar_precios: config?.mostrar_precios === true,
    logo_url: config?.logo_url || null
  };
  document.querySelector('#company-name').value = catalogConfig.nombre_empresa;
  document.querySelector('#show-prices').checked = catalogConfig.mostrar_precios;
  document.querySelector('#brand-logo-preview').src = catalogConfig.logo_url || '../assets/logo.png';
  document.querySelector('#admin-company-name').textContent = catalogConfig.nombre_empresa;
  document.querySelector('#share-template').value = shareTemplate;
  updateTemplatePreview();
  const privateMap = new Map(inventory.map(i => [i.sku, i]));
  list.innerHTML = products.map(p => editor(p, privateMap.get(p.sku) || {})).join(''); status.hidden = true;
  list.querySelectorAll('.admin-card').forEach(bindCard);
  applyProductSearch();
}

function editor(p, i) {
  const firstImage = (p.imagenes || [])[0] || '';
  const thumbnail = firstImage || '../assets/logo.png';
  const stock = Number(i.stock || 0);
  const baseValue = i.precio_base ?? '';
  const wholesaleValue = i.precio_mayorista ?? '';
  const retailValue = i.precio_minorista ?? '';
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
        <span class="metric-tile cost-tile"><small>Costo</small><strong data-card-base>${formatAdminPrice(baseValue)}</strong></span>
        <span class="metric-tile wholesale-pill"><small>Mayorista</small><strong data-card-wholesale>${formatAdminPrice(wholesaleValue)}</strong></span>
        <span class="metric-tile retail-pill"><small>Minorista</small><strong data-card-retail>${formatAdminPrice(retailValue)}</strong></span>
      </div>
    </header>
    <details>
      <summary><span>Editar producto</span><small>Stock, precios, información y fotos</small></summary>
      <form>
        <section class="admin-form-section commercial-section" aria-labelledby="commercial-${attr(p.sku)}">
          <div class="admin-section-heading"><div><span class="section-step">1</span><div><h3 id="commercial-${attr(p.sku)}">Stock y precios</h3><p>Modifica el precio o el multiplicador; el otro se calcula solo.</p></div></div></div>
          <div class="field-grid commercial-main-fields">
            <label>Stock disponible<input name="stock" type="number" min="0" value="${i.stock ?? 0}"></label>
            <label>Costo base (Bs)<input name="precio_base" type="number" min="0" step="0.01" inputmode="decimal" value="${baseValue}"></label>
          </div>
          <div class="sale-price-grid">
            <div class="price-box wholesale"><div class="price-box-title"><strong>Venta mayorista</strong><span>Por cantidad</span></div><label>Precio final (Bs)<input name="precio_mayorista" type="number" min="0" step="0.01" inputmode="decimal" value="${wholesaleValue}"></label><label class="multiplier-field">Multiplicador<input name="multiplicador_mayorista" type="number" min="0" step="0.0001" inputmode="decimal" value="${wholesaleMultiplier ?? ''}"></label></div>
            <div class="price-box retail"><div class="price-box-title"><strong>Venta minorista</strong><span>Unidad</span></div><label>Precio final (Bs)<input name="precio_minorista" type="number" min="0" step="0.01" inputmode="decimal" value="${retailValue}"></label><label class="multiplier-field">Multiplicador<input name="multiplicador_minorista" type="number" min="0" step="0.0001" inputmode="decimal" value="${retailMultiplier ?? ''}"></label></div>
          </div>
        </section>

        <section class="admin-form-section identity-section" aria-labelledby="identity-${attr(p.sku)}">
          <div class="admin-section-heading"><div><span class="section-step">2</span><div><h3 id="identity-${attr(p.sku)}">Datos del producto</h3><p>El SKU está protegido porque conecta el catálogo con el inventario.</p></div></div></div>
          <label>Nombre del producto<input name="nombre" value="${attr(p.nombre)}" required></label>
          <div class="field-grid">
            <label>SKU<input name="sku" class="sku-input locked-input" value="${attr(p.sku)}" readonly aria-readonly="true"><small>No se puede modificar.</small></label>
            <label>Código de modelo<input name="codigo_modelo" value="${attr(p.codigo_modelo || '')}" required></label>
            <label>Color de caja / presentación<input name="color_caja" value="${attr(p.color_caja || '')}" placeholder="Ej.: Azul"></label>
            <label>Color interior<input name="color_interior" value="${attr(p.color_interior || '')}" placeholder="Ej.: Beige"><small>Déjalo vacío para no mostrar “Interior…” en el catálogo.</small></label>
          </div>
        </section>

        <section class="admin-form-section content-section" aria-labelledby="content-${attr(p.sku)}">
          <div class="admin-section-heading"><div><span class="section-step">3</span><div><h3 id="content-${attr(p.sku)}">Descripción</h3><p>Información que verá el cliente.</p></div></div></div>
          <label>Descripción general<textarea name="descripcion" rows="4">${text(p.descripcion)}</textarea></label>
          <label>Contenido de esta presentación<textarea name="detalle_distintivo" rows="4">${text(p.detalle_distintivo)}</textarea></label>
        </section>

        <section class="admin-form-section photos-section" aria-labelledby="photos-${attr(p.sku)}">
          <div class="admin-section-heading"><div><span class="section-step">4</span><div><h3 id="photos-${attr(p.sku)}">Fotografías</h3><p>Estas imágenes se mostrarán al elegir esta presentación.</p></div></div></div>
          <label>Agregar fotografías<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
          <div class="photo-list">${(p.imagenes || []).map((url, n) => `<figure><a href="${url}" target="_blank"><img src="${url}" alt="Foto ${n+1}"></a><button type="button" data-remove-photo="${url}">Eliminar</button></figure>`).join('')}</div>
        </section>

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
    card.querySelector('[data-card-base]').textContent = formatAdminPrice(form.precio_base.value);
    card.querySelector('[data-card-wholesale]').textContent = formatAdminPrice(form.precio_mayorista.value);
    card.querySelector('[data-card-retail]').textContent = formatAdminPrice(form.precio_minorista.value);
  };

  const recalculatePricesFromMultipliers = () => {
    updatePriceFromMultiplier('mayorista');
    updatePriceFromMultiplier('minorista');
  };

  const updateStock = () => {
    const stock = Math.max(0, Number(form.stock.value) || 0);
    const badge = card.querySelector('.admin-card-metrics .stock-tile');
    card.querySelector('[data-card-stock]').textContent = stock;
    badge.classList.toggle('out', stock <= 0);
  };

  form.precio_base.addEventListener('input', recalculatePricesFromMultipliers);
  form.precio_mayorista.addEventListener('input', () => updateMultiplierFromPrice('mayorista'));
  form.precio_minorista.addEventListener('input', () => updateMultiplierFromPrice('minorista'));
  form.multiplicador_mayorista.addEventListener('input', () => updatePriceFromMultiplier('mayorista'));
  form.multiplicador_minorista.addEventListener('input', () => updatePriceFromMultiplier('minorista'));
  form.stock.addEventListener('input', updateStock);
  ['nombre','codigo_modelo','color_caja','color_interior','descripcion','detalle_distintivo'].forEach(name => form[name].addEventListener('input', updateHeader));
  form.addEventListener('submit', e => save(e, card.dataset.sku));
  form.querySelector('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(descriptionText(form, card.dataset.sku)));
  form.querySelector('[data-share]').addEventListener('click', () => share(descriptionText(form, card.dataset.sku), card.dataset.firstImage, form.nombre.value));
  form.querySelectorAll('[data-remove-photo]').forEach(b => b.addEventListener('click', () => removePhoto(card.dataset.sku, b.dataset.removePhoto)));
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
  const privateData = { stock: Number(form.stock.value), precio_base: nullableNumber(form.precio_base.value), multiplicador_mayorista: nullableNumber(form.multiplicador_mayorista.value), precio_mayorista: nullableNumber(form.precio_mayorista.value), multiplicador_minorista: nullableNumber(form.multiplicador_minorista.value), precio_minorista: retailPrice, actualizado_en:new Date().toISOString() };
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
    const update = { nombre_empresa:name, logo_url:logoUrl, mostrar_precios:document.querySelector('#show-prices').checked, actualizado_en:new Date().toISOString() };
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
  return Number.isFinite(amount) && amount > 0 ? `Bs ${Math.round(amount)}` : 'Bs —';
}

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
