import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, WHATSAPP } from './config.js';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const grid = document.querySelector('#products');
const status = document.querySelector('#status');
const dialog = document.querySelector('#product-dialog');
const content = document.querySelector('#dialog-content');
let groups = [];
const DEFAULT_TEMPLATE = `*{nombre}*\n\n{descripcion}\n\n*Incluye y presentación:*\n{detalle}\n\n*Precio:* {precio}\n*Disponibilidad:* {disponibilidad}\n*Código:* {codigo}\n\n{enlace}`;
let shareTemplate = DEFAULT_TEMPLATE;
let showPrices = false;
let companyName = 'Importadora A&N';
let brandLogo = './assets/logo.png';

function applyBrand() {
  document.querySelectorAll('[data-brand-name]').forEach(el => el.textContent = companyName);
  document.querySelectorAll('[data-brand-logo]').forEach(el => el.src = brandLogo);
  document.querySelectorAll('[data-whatsapp-general]').forEach(a => a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, quisiera consultar por los productos de ${companyName}.`)}`);
  document.title = `${companyName} | Catálogo`;
}

const money = value => value == null ? 'Consultar precio' : `Bs ${Number(value).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; }
    catch { return value ? [value] : []; }
  }
  return [];
}

function groupProducts(rows) {
  const map = new Map();
  rows.filter(row => row.disponible !== false).forEach((raw, index) => {
    const row = { ...raw, imagenes: parseImages(raw.imagenes) };
    const code = String(row.codigo_modelo || '').trim();
    const fallback = String(row.sku || row.id || `producto-${index}`).trim();
    const key = code || fallback;
    if (!map.has(key)) map.set(key, { ...row, codigo_modelo: key, variants: [], imagen_portada: row.imagen_portada || null });
    const group = map.get(key);
    if (!group.imagen_portada && row.imagen_portada) group.imagen_portada = row.imagen_portada;
    group.variants.push(row);
  });
  return [...map.values()];
}

function presentationLabel(variant) {
  const exterior = String(variant.color_caja || '').replace(/^caja\s+/i, '').trim();
  const interior = String(variant.color_interior || '').trim();
  return [exterior, interior].filter(Boolean).join(' / ') || 'Presentación';
}

function shortPresentationLabel(variant) {
  return String(variant.color_caja || '').replace(/^caja\s+/i, '').trim() || 'Opción';
}

function productDisplayName(product) {
  const name = String(product?.nombre || '').trim();
  if (!name) return 'Producto';
  const colors = (product?.variants || []).map(v => String(v.color_caja || '').replace(/^caja\s+/i, '').trim()).filter(Boolean).sort((a,b) => b.length-a.length);
  for (const color of colors) {
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = name.replace(new RegExp(`\\s+${escaped}\\s*$`, 'i'), '').trim();
    if (result && result !== name) return result;
  }
  return name;
}

function variantImages(variant, product) {
  const own = parseImages(variant?.imagenes);
  if (own.length) return own;
  return product.variants.flatMap(v => parseImages(v.imagenes));
}

function productCover(product) {
  return product.imagen_portada || product.variants.flatMap(v => parseImages(v.imagenes))[0] || '';
}

function cover(product) {
  const image = productCover(product);
  return image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productDisplayName(product))}" loading="lazy">` : `<div class="image-placeholder"><img src="${escapeHtml(brandLogo)}" alt=""><span>Fotografía próximamente</span></div>`;
}

function card(product) {
  const available = product.variants.some(v => v.disponible);
  const prices = product.variants.map(v => v.precio_minorista).filter(v => v != null);
  const displayName = productDisplayName(product);
  const countBadge = product.variants.length > 1 ? `<span class="variant-count">${product.variants.length} presentaciones</span>` : '';
  const action = product.variants.length > 1 ? 'Elegir presentación →' : 'Ver detalles →';
  const bottom = showPrices
    ? `<div class="card-bottom"><strong>${prices.length ? money(Math.min(...prices)) : 'Consultar precio'}</strong><button class="text-button" type="button">${action}</button></div>`
    : `<div class="card-bottom price-hidden"><button class="text-button catalog-cta" type="button">${action}</button></div>`;
  return `<article class="product-card" data-code="${escapeHtml(product.codigo_modelo)}"><div class="product-image">${cover(product)}<span class="availability ${available ? '' : 'out'}">${available ? 'Disponible' : 'Agotado'}</span>${countBadge}</div><div class="product-info"><p class="category">${escapeHtml(product.categoria)}</p><h3>${escapeHtml(displayName)}</h3><p class="summary">${escapeHtml(product.descripcion)}</p>${bottom}</div></article>`;
}

function render(filter = 'Todos') {
  const visible = filter === 'Todos' ? groups : groups.filter(p => p.categoria === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('.product-card').forEach(el => el.addEventListener('click', () => openProduct(el.dataset.code)));
}

function visualItems(product) {
  const items = [];
  const coverUrl = productCover(product);
  if (coverUrl) items.push({ type:'cover', url:coverUrl, label:'Portada', variantIndex:null });
  product.variants.forEach((variant, variantIndex) => {
    const url = variantImages(variant, product)[0];
    if (url) items.push({ type:'variant', url, label:shortPresentationLabel(variant), variantIndex });
  });
  if (!items.length) items.push({ type:'cover', url:brandLogo, label:'Portada', variantIndex:null });
  return items;
}

function galleryMarkup(items, activeVisualIndex, productName) {
  const active = items[activeVisualIndex] || items[0];
  return `<div class="gallery-stage">
    <button class="gallery-arrow gallery-prev" type="button" aria-label="Imagen anterior">‹</button>
    <img class="gallery-main-image" src="${escapeHtml(active.url)}" alt="${escapeHtml(productName)}">
    <button class="gallery-arrow gallery-next" type="button" aria-label="Imagen siguiente">›</button>
    <span class="gallery-image-counter"><span data-gallery-current>${activeVisualIndex + 1}</span>/${items.length}</span>
  </div>
  <div class="visual-selector" aria-label="Portada y presentaciones">
    ${items.map((item,index) => `<button type="button" class="visual-thumb${index===activeVisualIndex?' active':''}" data-visual-index="${index}" aria-pressed="${index===activeVisualIndex}"><img src="${escapeHtml(item.url)}" alt=""><span>${escapeHtml(item.label)}</span></button>`).join('')}
  </div>`;
}

function openProduct(code) {
  const product = groups.find(p => p.codigo_modelo === code);
  if (!product) return;
  let selectedIndex = product.variants.findIndex(v => v.disponible && parseImages(v.imagenes).length);
  if (selectedIndex < 0) selectedIndex = product.variants.findIndex(v => v.disponible);
  if (selectedIndex < 0) selectedIndex = 0;
  const items = visualItems(product);
  let activeVisualIndex = items.findIndex(i => i.type === 'cover');
  if (activeVisualIndex < 0) activeVisualIndex = Math.max(0, items.findIndex(i => i.variantIndex === selectedIndex));

  const renderDialog = () => {
    const selected = product.variants[selectedIndex];
    const displayName = productDisplayName(product);
    const selectedLabel = presentationLabel(selected);
    const selectedPrice = showPrices && selected.precio_minorista != null ? `<strong class="selected-price">${money(selected.precio_minorista)}</strong>` : '';
    const item = items[activeVisualIndex] || items[0];
    const isCover = item.type === 'cover';

    content.innerHTML = `<div class="dialog-gallery">${galleryMarkup(items, activeVisualIndex, displayName)}</div>
      <div class="dialog-details">
        <div class="first-screen-summary">
          <div class="dialog-product-heading"><p class="eyebrow">${escapeHtml(product.categoria)}</p><h2>${escapeHtml(displayName)}</h2>${selectedPrice}</div>
          <div class="selected-summary"><span>Presentación seleccionada</span><strong>${escapeHtml(selectedLabel)}</strong><small>${selected.disponible ? 'Disponible' : 'Agotado'}${selected.sku ? ` · ${escapeHtml(selected.sku)}` : ''}</small></div>
          <div class="quick-characteristics"><span><b>Exterior:</b> ${escapeHtml(String(selected.color_caja || '').replace(/^caja\s+/i,'') || 'No especificado')}</span>${selected.color_interior ? `<span><b>Interior:</b> ${escapeHtml(selected.color_interior)}</span>` : ''}${selected.piezas ? `<span><b>Incluye:</b> ${escapeHtml(selected.piezas)} artículos</span>` : ''}</div>
        </div>
        <section class="dialog-description"><details open><summary>Descripción</summary><p>${escapeHtml(product.descripcion)}</p></details>${selected.detalle_distintivo ? `<details><summary>Características de esta presentación</summary><p class="variant-detail">${escapeHtml(selected.detalle_distintivo)}</p></details>` : ''}</section>
        <div class="dialog-actions"><a class="button whatsapp" target="_blank" rel="noopener" data-variant-whatsapp>Consultar por WhatsApp</a><button id="share-product" class="button secondary" type="button">Compartir</button></div>
      </div>`;

    const chooseVisual = index => {
      const nextItem = items[index];
      if (!nextItem) return;
      activeVisualIndex = index;
      if (nextItem.variantIndex != null) {
        const nextVariant = product.variants[nextItem.variantIndex];
        if (nextVariant?.disponible) selectedIndex = nextItem.variantIndex;
      }
      renderDialog();
      requestAnimationFrame(() => content.querySelector(`.visual-thumb[data-visual-index="${activeVisualIndex}"]`)?.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}));
    };

    content.querySelectorAll('[data-visual-index]').forEach(button => button.addEventListener('click', () => chooseVisual(Number(button.dataset.visualIndex))));
    content.querySelector('.gallery-prev')?.addEventListener('click', () => chooseVisual((activeVisualIndex - 1 + items.length) % items.length));
    content.querySelector('.gallery-next')?.addEventListener('click', () => chooseVisual((activeVisualIndex + 1) % items.length));

    let touchStartX = 0;
    const stage = content.querySelector('.gallery-stage');
    stage?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, {passive:true});
    stage?.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 45) chooseVisual((activeVisualIndex + (delta < 0 ? 1 : -1) + items.length) % items.length);
    }, {passive:true});

    const whatsappText = `Hola, quisiera consultar por ${displayName}, presentación ${selectedLabel} (${selected.sku}).`;
    content.querySelector('[data-variant-whatsapp]').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`;
    content.querySelector('#share-product')?.addEventListener('click', () => shareProduct({ ...product, nombre: displayName }, selected, item.url));
    content.querySelector('.gallery-main-image')?.classList.toggle('showing-cover', isCover);
  };

  renderDialog();
  dialog.showModal();
}

async function shareProduct(product, variant, imageUrl) {
  const priceText = showPrices && variant.precio_minorista != null ? money(variant.precio_minorista) : 'Consultar por WhatsApp';
  const available = variant.disponible ? 'Disponible' : 'Agotado';
  const presentation = [variant.color_caja ? `Exterior: ${String(variant.color_caja).replace(/^caja\s+/i, '')}` : '', variant.color_interior ? `Interior: ${variant.color_interior}` : ''].filter(Boolean).join('\n');
  const text = applyTemplate(shareTemplate, { nombre: product.nombre, descripcion: product.descripcion, detalle: [presentation, variant.detalle_distintivo].filter(Boolean).join('\n'), precio: priceText, disponibilidad: available, codigo: variant.sku || product.codigo_modelo, enlace: location.href });
  if (navigator.share && imageUrl) {
    try {
      const response = await fetch(imageUrl); const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const safeName = product.nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'image/jpeg' });
      if (!navigator.canShare || navigator.canShare({ files:[file] })) { await navigator.share({ title:product.nombre, text, files:[file] }); return; }
    } catch (error) { if (error?.name === 'AbortError') return; }
  }
  if (navigator.share) { try { await navigator.share({ title:product.nombre, text }); return; } catch (error) { if (error?.name === 'AbortError') return; } }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function applyTemplate(template, values) {
  return template.replace(/\{(nombre|descripcion|detalle|precio|disponibilidad|codigo|enlace)\}/g, (_m,key) => values[key] ?? '').replace(/\n{3,}/g,'\n\n').trim();
}

dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter').forEach(b => b.classList.remove('active')); button.classList.add('active'); render(button.dataset.filter); }));

async function load() {
  status.hidden = false; status.textContent = 'Cargando productos…';
  try {
    const [{ data, error }, { data: config }] = await Promise.all([
      db.from('productos_publicos').select('*').order('orden'),
      db.from('configuracion_publica').select('plantilla_whatsapp,mostrar_precios,nombre_empresa,logo_url').eq('id','catalogo').single()
    ]);
    if (error) throw error;
    shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
    showPrices = config?.mostrar_precios === true;
    companyName = config?.nombre_empresa?.trim() || 'Importadora A&N';
    brandLogo = config?.logo_url || './assets/logo.png';
    applyBrand(); groups = groupProducts(data || []); render(); status.hidden = true;
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    status.hidden = false; status.textContent = 'No pudimos cargar el catálogo. Actualiza la página para intentarlo nuevamente.';
  }
}
load();
