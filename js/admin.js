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
  const wholesalePrice = formatAdminPrice(i.precio_mayorista);
  const retailPrice = formatAdminPrice(i.precio_minorista);
  const searchText = normalizeSearch([p.sku, p.nombre, p.color_caja, p.descripcion, p.detalle_distintivo].filter(Boolean).join(' '));
  return `<article class="admin-card" data-sku="${attr(p.sku)}" data-first-image="${attr(firstImage)}" data-search="${attr(searchText)}"><header><div class="admin-product-heading"><img class="admin-thumb" src="${attr(thumbnail)}" alt="Miniatura de ${attr(p.nombre)}"><div><small>${text(p.sku)}</small><h2>${text(p.nombre)}</h2><span>${text(p.color_caja || '')}</span></div></div><div class="admin-card-metrics"><span class="availability ${stock > 0 ? '' : 'out'}">Stock <strong>${stock}</strong></span><span class="price-pill wholesale-pill"><small>Mayorista</small><strong data-card-wholesale>${wholesalePrice}</strong></span><span class="price-pill retail-pill"><small>Minorista</small><strong data-card-retail>${retailPrice}</strong></span></div></header>
  <details><summary>Editar producto</summary><form>
    <label>Nombre<input name="nombre" value="${attr(p.nombre)}" required></label>
    <label>Descripción<textarea name="descripcion" rows="4">${text(p.descripcion)}</textarea></label>
    <label>Contenido y presentación<textarea name="detalle_distintivo" rows="4">${text(p.detalle_distintivo)}</textarea></label>
    <div class="field-grid"><label>Stock exacto<input name="stock" type="number" min="0" value="${i.stock}"></label><label>Precio base<input name="precio_base" type="number" min="0" step="0.01" value="${i.precio_base ?? ''}"></label></div>
    <div class="price-box wholesale"><div><label>Multiplicador mayorista<input name="multiplicador_mayorista" type="number" min="0" step="0.01" value="${i.multiplicador_mayorista ?? ''}"></label><p>Resultado: <strong data-wholesale>Bs ${i.precio_mayorista ?? '—'}</strong></p></div></div>
    <div class="price-box retail"><div><label>Multiplicador minorista<input name="multiplicador_minorista" type="number" min="0" step="0.01" value="${i.multiplicador_minorista ?? ''}"></label><p>Resultado: <strong data-retail>Bs ${i.precio_minorista ?? '—'}</strong></p></div></div>
    <label>Fotografías<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div class="photo-list">${(p.imagenes || []).map((url, n) => `<figure><a href="${url}" target="_blank"><img src="${url}" alt="Foto ${n+1}"></a><button type="button" data-remove-photo="${url}">Eliminar</button></figure>`).join('')}</div>
    <p class="form-message" data-message></p><div class="admin-actions"><button class="button primary" type="submit">Guardar cambios</button><button class="button secondary" type="button" data-copy>Copiar descripción</button><button class="button whatsapp" type="button" data-share>Compartir</button></div>
  </form></details></article>`;
}

function bindCard(card) {
  const form = card.querySelector('form');
  const calculate = () => {
    const base = Number(form.precio_base.value);
    const wholesale = Number(form.multiplicador_mayorista.value);
    const retail = Number(form.multiplicador_minorista.value);
    const wholesaleText = base && wholesale ? `Bs ${Math.round(base * wholesale)}` : 'Bs —';
    const retailText = base && retail ? `Bs ${Math.round(base * retail)}` : 'Bs —';
    form.querySelector('[data-wholesale]').textContent = wholesaleText;
    form.querySelector('[data-retail]').textContent = retailText;
    card.querySelector('[data-card-wholesale]').textContent = wholesaleText;
    card.querySelector('[data-card-retail]').textContent = retailText;
  };
  ['precio_base','multiplicador_mayorista','multiplicador_minorista'].forEach(n => form[n].addEventListener('input', calculate));
  form.addEventListener('submit', e => save(e, card.dataset.sku));
  form.querySelector('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(descriptionText(form, card.dataset.sku)));
  form.querySelector('[data-share]').addEventListener('click', () => share(descriptionText(form, card.dataset.sku), card.dataset.firstImage, form.nombre.value));
  form.querySelectorAll('[data-remove-photo]').forEach(b => b.addEventListener('click', () => removePhoto(card.dataset.sku, b.dataset.removePhoto)));
}

async function save(event, sku) {
  event.preventDefault(); const form = event.currentTarget; const message = form.querySelector('[data-message]');
  message.textContent = 'Guardando…';
  let images = [...form.querySelectorAll('.photo-list img')].map(i => i.src);
  try { images = images.concat(await uploadPhotos(sku, [...form.photos.files], images.length)); }
  catch (e) { message.textContent = e.message; return; }
  const publicData = { nombre: form.nombre.value.trim(), descripcion: form.descripcion.value.trim(), detalle_distintivo: form.detalle_distintivo.value.trim(), imagenes: images };
  const privateData = { stock: Number(form.stock.value), precio_base: form.precio_base.value === '' ? null : Number(form.precio_base.value), multiplicador_mayorista: Number(form.multiplicador_mayorista.value), multiplicador_minorista: Number(form.multiplicador_minorista.value) };
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
  const base = Number(form.precio_base.value);
  const multiplier = Number(form.multiplicador_minorista.value);
  const price = base && multiplier ? `Bs ${Math.round(base * multiplier)}` : 'Consultar precio';
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
