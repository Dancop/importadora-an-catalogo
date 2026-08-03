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

function groupProducts(rows) {
  const map = new Map();
  rows.filter(row => row.disponible !== false).forEach((row, index) => {
    const code = String(row.codigo_modelo || '').trim();
    const fallback = String(row.sku || row.id || `producto-${index}`).trim();
    const key = code || fallback;
    if (!map.has(key)) map.set(key, { ...row, codigo_modelo: key, variants: [] });
    map.get(key).variants.push(row);
  });
  return [...map.values()];
}

function normalizedHex(value, fallback = '#d4d7db') {
  const hex = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : fallback;
}

function presentationLabel(variant) {
  const exterior = String(variant.color_caja || '').replace(/^caja\s+/i, '').trim();
  const interior = String(variant.color_interior || '').trim();
  return [exterior, interior ? `interior ${interior}` : ''].filter(Boolean).join(' / ') || 'Presentación';
}

function productDisplayName(product) {
  const name = String(product?.nombre || '').trim();
  if (!name) return 'Producto';
  const colors = (product?.variants || [])
    .map(v => String(v.color_caja || '').replace(/^caja\s+/i, '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const color of colors) {
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = name.replace(new RegExp(`\\s+${escaped}\\s*$`, 'i'), '').trim();
    if (result && result !== name) return result;
  }
  return name;
}

function variantThumbnail(variant, product) {
  const image = variantImages(variant, product)[0];
  return image
    ? `<img class="variant-thumb" src="${escapeHtml(image)}" alt="${escapeHtml(presentationLabel(variant))}" loading="lazy">`
    : `<span class="variant-thumb variant-thumb-placeholder" aria-hidden="true">◫</span>`;
}

function colorDot(hex, label, extraClass = '') {
  const validHex = /^#[0-9a-f]{6}$/i.test(String(hex || '').trim());
  const isAssorted = /surtid|variad|multicolor/i.test(String(label || ''));
  const dot = validHex
    ? `<span class="color-dot ${extraClass}" style="--swatch:${escapeHtml(normalizedHex(hex))}" aria-hidden="true"></span>`
    : isAssorted
      ? `<span class="color-dot assorted ${extraClass}" aria-hidden="true"></span>`
      : '';
  return `${dot}<span>${escapeHtml(label)}</span>`;
}

function presentationChips(product, limit = 4) {
  const variants = product.variants.filter(v => v.color_caja || v.color_interior);
  const shown = variants.slice(0, limit);
  if (!shown.length) return '';
  const remaining = variants.length - shown.length;
  return `<div class="presentation-preview"><span class="presentation-preview-title">Presentaciones disponibles</span><div class="presentation-chips">${shown.map(v => {
    const label = presentationLabel(v);
    return `<span class="presentation-chip">${colorDot(v.color_exterior_hex, label)}</span>`;
  }).join('')}${remaining > 0 ? `<span class="presentation-more">+${remaining}</span>` : ''}</div></div>`;
}

function cover(product) {
  const image = product.variants.flatMap(v => v.imagenes || [])[0];
  return image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.nombre)}" loading="lazy">`
    : `<div class="image-placeholder"><img src="${escapeHtml(brandLogo)}" alt=""><span>Fotografía próximamente</span></div>`;
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
  return `<article class="product-card" data-code="${escapeHtml(product.codigo_modelo)}">
    <div class="product-image">${cover(product)}<span class="availability ${available ? '' : 'out'}">${available ? 'Disponible' : 'Agotado'}</span>${countBadge}</div>
    <div class="product-info"><p class="category">${escapeHtml(product.categoria)}</p><h3>${escapeHtml(displayName)}</h3>
    ${presentationChips(product)}
    <p class="summary">${escapeHtml(product.descripcion)}</p>${bottom}</div>
  </article>`;
}

function render(filter = 'Todos') {
  const visible = filter === 'Todos' ? groups : groups.filter(p => p.categoria === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('.product-card').forEach(cardEl => cardEl.addEventListener('click', () => openProduct(cardEl.dataset.code)));
}

function variantImages(variant, product) {
  const own = (variant.imagenes || []).filter(Boolean);
  if (own.length) return own;
  return product.variants.flatMap(v => v.imagenes || []).filter(Boolean);
}

function galleryMarkup(images, productName) {
  const list = images.length ? images : [brandLogo];
  return `<div class="gallery-stage">
      <button class="gallery-arrow gallery-prev" type="button" aria-label="Fotografía anterior">‹</button>
      <div class="gallery-track">${list.map((url, index) => `<figure class="gallery-slide${index === 0 ? ' active' : ''}" data-gallery-index="${index}"><img src="${escapeHtml(url)}" alt="${escapeHtml(productName)} - fotografía ${index + 1}"></figure>`).join('')}</div>
      <button class="gallery-arrow gallery-next" type="button" aria-label="Fotografía siguiente">›</button>
    </div>
    <div class="gallery-thumbs" aria-label="Seleccionar fotografía">${list.map((url, index) => `<button type="button" class="gallery-thumb${index === 0 ? ' active' : ''}" data-gallery-go="${index}" aria-label="Ver fotografía ${index + 1}"><img src="${escapeHtml(url)}" alt=""></button>`).join('')}</div>
    <p class="gallery-counter"><span data-gallery-current>1</span> de <span data-gallery-total>${list.length}</span></p>`;
}

function variantMarkup(v, index, selectedIndex, product) {
  const exterior = String(v.color_caja || '').replace(/^caja\s+/i, '').trim() || 'Sin especificar';
  const interior = String(v.color_interior || '').trim();
  const label = [exterior, interior].filter(Boolean).join(' / ');
  const priceMarkup = showPrices && v.precio_minorista != null
    ? `<strong class="variant-price">${money(v.precio_minorista)}</strong>`
    : '';
  return `<button type="button" class="variant-card${index === selectedIndex ? ' active' : ''}" data-variant-index="${index}" ${v.disponible ? '' : 'disabled'} aria-pressed="${index === selectedIndex}">
    ${variantThumbnail(v, product)}
    <span class="variant-card-copy">
      <strong class="variant-name">${escapeHtml(label || 'Presentación')}</strong>
      <span class="variant-color-summary">
        ${colorDot(v.color_exterior_hex, exterior, 'exterior')}
        ${interior ? `<span class="variant-interior">/ ${colorDot(v.color_interior_hex, interior, 'interior')}</span>` : ''}
      </span>
      <span class="availability ${v.disponible ? '' : 'out'}">${v.disponible ? 'Disponible' : 'Agotado'}</span>
    </span>
    ${priceMarkup}
    <span class="variant-selected-mark" aria-hidden="true">✓</span>
  </button>`;
}

function openProduct(code) {
  const product = groups.find(p => p.codigo_modelo === code);
  if (!product) return;
  let selectedIndex = product.variants.findIndex(v => v.disponible && (v.imagenes || []).length);
  if (selectedIndex < 0) selectedIndex = product.variants.findIndex(v => v.disponible);
  if (selectedIndex < 0) selectedIndex = 0;
  let galleryIndex = 0;

  const renderDialog = () => {
    const selected = product.variants[selectedIndex];
    const images = variantImages(selected, product);
    const displayName = productDisplayName(product);
    const selectedLabel = presentationLabel(selected);
    const selectedPrice = showPrices && selected.precio_minorista != null
      ? `<strong class="selected-price">${money(selected.precio_minorista)}</strong>`
      : '';

    content.innerHTML = `<div class="dialog-gallery" data-dialog-gallery>${galleryMarkup(images, displayName)}</div>
      <div class="dialog-details">
        <div class="dialog-product-heading">
          <p class="eyebrow">${escapeHtml(product.categoria)}</p>
          <h2>${escapeHtml(displayName)}</h2>
          ${selectedPrice}
        </div>
        <section class="presentation-selector" aria-label="Presentaciones del producto">
          <div class="presentation-heading">
            <div><h3>Elige una presentación</h3><p>Selecciona una opción para cambiar la fotografía y los detalles.</p></div>
            <div class="variant-navigation" aria-label="Navegar presentaciones">
              <button type="button" class="variant-nav variant-prev" aria-label="Presentación anterior">‹</button>
              <button type="button" class="variant-nav variant-next" aria-label="Presentación siguiente">›</button>
            </div>
          </div>
          <p class="selected-presentation">Seleccionado: <strong>${escapeHtml(selectedLabel)}</strong></p>
          <div class="variants" data-variants-strip>${product.variants.map((v, index) => variantMarkup(v, index, selectedIndex, product)).join('')}</div>
        </section>
        <section class="dialog-description">
          <h3>Descripción</h3>
          <p>${escapeHtml(product.descripcion)}</p>
          ${selected.detalle_distintivo ? `<p class="variant-detail">${escapeHtml(selected.detalle_distintivo)}</p>` : ''}
        </section>
        <div class="dialog-actions"><a class="button whatsapp" target="_blank" rel="noopener" data-variant-whatsapp>Consultar por WhatsApp</a><button id="share-product" class="button secondary" type="button">Compartir</button></div>
      </div>`;

    const setGallery = next => {
      const slides = [...content.querySelectorAll('.gallery-slide')];
      const thumbs = [...content.querySelectorAll('.gallery-thumb')];
      if (!slides.length) return;
      galleryIndex = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === galleryIndex));
      thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
      const current = content.querySelector('[data-gallery-current]');
      if (current) current.textContent = galleryIndex + 1;
      slides[galleryIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    content.querySelector('.gallery-prev')?.addEventListener('click', () => setGallery(galleryIndex - 1));
    content.querySelector('.gallery-next')?.addEventListener('click', () => setGallery(galleryIndex + 1));
    content.querySelectorAll('[data-gallery-go]').forEach(button => button.addEventListener('click', () => setGallery(Number(button.dataset.galleryGo))));
    const track = content.querySelector('.gallery-track');
    track?.addEventListener('scroll', () => {
      const width = track.clientWidth || 1;
      const next = Math.round(track.scrollLeft / width);
      if (next !== galleryIndex) {
        galleryIndex = Math.max(0, Math.min(next, images.length - 1));
        content.querySelectorAll('.gallery-thumb').forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
        const current = content.querySelector('[data-gallery-current]');
        if (current) current.textContent = galleryIndex + 1;
      }
    }, { passive: true });

    const selectVariant = index => {
      const next = product.variants[index];
      if (!next || !next.disponible || index === selectedIndex) return;
      selectedIndex = index;
      galleryIndex = 0;
      renderDialog();
      requestAnimationFrame(() => {
        const active = content.querySelector('.variant-card.active');
        active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    };

    content.querySelectorAll('[data-variant-index]').forEach(button => button.addEventListener('click', () => selectVariant(Number(button.dataset.variantIndex))));

    const moveVariant = direction => {
      const available = product.variants.map((v, i) => v.disponible ? i : -1).filter(i => i >= 0);
      if (!available.length) return;
      const position = Math.max(0, available.indexOf(selectedIndex));
      selectVariant(available[(position + direction + available.length) % available.length]);
    };
    content.querySelector('.variant-prev')?.addEventListener('click', () => moveVariant(-1));
    content.querySelector('.variant-next')?.addEventListener('click', () => moveVariant(1));

    const whatsappText = `Hola, quisiera consultar por ${displayName}, presentación ${selectedLabel} (${selected.sku}).`;
    content.querySelector('[data-variant-whatsapp]').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`;
    content.querySelector('#share-product').addEventListener('click', () => shareProduct({ ...product, nombre: displayName }, selected, images[galleryIndex] || images[0]));
  };

  renderDialog();
  dialog.showModal();
}

async function shareProduct(product, variant, imageUrl) {
  const priceText = showPrices && variant.precio_minorista != null ? money(variant.precio_minorista) : 'Consultar por WhatsApp';
  const available = variant.disponible ? 'Disponible' : 'Agotado';
  const presentation = [variant.color_caja ? `Exterior: ${String(variant.color_caja).replace(/^caja\s+/i, '')}` : '', variant.color_interior ? `Interior: ${variant.color_interior}` : ''].filter(Boolean).join('\n');
  const text = applyTemplate(shareTemplate, {
    nombre: product.nombre,
    descripcion: product.descripcion,
    detalle: [presentation, variant.detalle_distintivo].filter(Boolean).join('\n'),
    precio: priceText,
    disponibilidad: available,
    codigo: variant.sku || product.codigo_modelo,
    enlace: location.href
  });
  if (navigator.share && imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const safeName = product.nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'image/jpeg' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: product.nombre, text, files: [file] });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  if (navigator.share) {
    try { await navigator.share({ title: product.nombre, text }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function applyTemplate(template, values) {
  return template.replace(/\{(nombre|descripcion|detalle|precio|disponibilidad|codigo|enlace)\}/g, (_match, key) => values[key] ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
  button.classList.add('active'); render(button.dataset.filter);
}));

async function load() {
  status.hidden = false;
  status.textContent = 'Cargando productos…';
  try {
    const [{ data, error }, { data: config }] = await Promise.all([
      db.from('productos_publicos').select('*').order('orden'),
      db.from('configuracion_publica').select('plantilla_whatsapp,mostrar_precios,nombre_empresa,logo_url').eq('id', 'catalogo').single()
    ]);
    if (error) throw error;
    shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
    showPrices = config?.mostrar_precios === true;
    companyName = config?.nombre_empresa?.trim() || 'Importadora A&N';
    brandLogo = config?.logo_url || './assets/logo.png';
    applyBrand();
    groups = groupProducts(data || []);
    render();
    status.hidden = true;
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    status.hidden = false;
    status.textContent = 'No pudimos cargar el catálogo. Actualiza la página para intentarlo nuevamente.';
  }
}
load();
