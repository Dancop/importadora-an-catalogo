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

const COLOR_MAP = {
  negro: '#222222',
  negra: '#222222',
  rosa: '#e7a8b5',
  rosado: '#e7a8b5',
  rosada: '#e7a8b5',
  azul: '#416b91',
  cafe: '#795548',
  marron: '#795548',
  rojo: '#b84a4a',
  roja: '#b84a4a',
  blanco: '#ffffff',
  blanca: '#ffffff',
  gris: '#8a8f98',
  dorado: '#c6a15b',
  dorada: '#c6a15b',
  plateado: '#aeb4ba',
  plateada: '#aeb4ba',
  lila: '#a88bc1',
  morado: '#74558f',
  morada: '#74558f',
  verde: '#618568'
};

function applyBrand() {
  document.querySelectorAll('[data-brand-name]').forEach(el => el.textContent = companyName);
  document.querySelectorAll('[data-brand-logo]').forEach(el => el.src = brandLogo);
  document.querySelectorAll('[data-whatsapp-general]').forEach(a => a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, quisiera consultar por los productos de ${companyName}.`)}`);
  document.title = `${companyName} | Catálogo`;
}

const money = value => value == null ? 'Consultar precio' : `Bs ${Number(value).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicProductName(name, color) {
  const cleanName = String(name ?? '').trim();
  const cleanColor = String(color ?? '').trim();
  if (!cleanName || !cleanColor) return cleanName;

  const colorAtEnd = new RegExp(`\\s+${escapeRegExp(cleanColor)}\\s*$`, 'i');
  const result = cleanName.replace(colorAtEnd, '').trim();
  return result || cleanName;
}

function visualColor(name) {
  return COLOR_MAP[normalizeText(name)] || '#d4d7db';
}

function uniquePresentations(variants) {
  const seen = new Set();
  return variants
    .map(variant => String(variant.color_caja || '').trim())
    .filter(label => {
      const key = normalizeText(label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function groupProducts(rows) {
  const map = new Map();

  rows.filter(row => row.disponible !== false).forEach((row, index) => {
    const modelCode = String(row.codigo_modelo || '').trim();
    const fallback = String(row.sku || row.id || `fila-${index}`).trim();
    const groupKey = modelCode ? `modelo:${modelCode}` : `variante:${fallback}`;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        ...row,
        groupKey,
        codigo_modelo: modelCode || fallback,
        variants: []
      });
    }
    map.get(groupKey).variants.push(row);
  });

  return [...map.values()].map(product => ({
    ...product,
    publicName: publicProductName(product.nombre, product.color_caja),
    presentations: uniquePresentations(product.variants)
  }));
}

function cover(product) {
  const image = product.variants.flatMap(v => v.imagenes || [])[0];
  return image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.publicName)}" loading="lazy">`
    : `<div class="image-placeholder"><img src="${escapeHtml(brandLogo)}" alt=""><span>Fotografía próximamente</span></div>`;
}

function colorDot(label) {
  const value = visualColor(label);
  const light = ['#ffffff', '#d4d7db'].includes(value);
  return `<span class="color-dot${light ? ' light' : ''}" style="--variant-color:${escapeHtml(value)}" aria-hidden="true"></span>`;
}

function presentationChips(product) {
  const labels = product.presentations;
  if (!labels.length) return '';
  const visible = labels.slice(0, 4);
  const remaining = labels.length - visible.length;
  return `<div class="product-presentations" aria-label="Colores disponibles">
    <span class="presentation-label">Colores disponibles</span>
    <div class="presentation-chips">${visible.map(label => `<span class="presentation-chip">${colorDot(label)}<span>${escapeHtml(label)}</span></span>`).join('')}${remaining > 0 ? `<span class="presentation-more">+${remaining}</span>` : ''}</div>
  </div>`;
}

function priceLabel(product) {
  if (!showPrices) return 'Consultar por WhatsApp';
  const prices = product.variants
    .map(v => Number(v.precio_minorista))
    .filter(Number.isFinite);
  if (!prices.length) return 'Consultar precio';

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum ? money(minimum) : `Desde ${money(minimum)}`;
}

function card(product) {
  const available = product.variants.some(v => v.disponible !== false);
  const optionCount = product.presentations.length;
  const optionBadge = optionCount > 1 ? `<span class="options-count">${optionCount} colores</span>` : '';
  const actionLabel = optionCount > 1 ? 'Elegir color →' : 'Ver detalles →';

  return `<article class="product-card" data-group-key="${escapeHtml(product.groupKey)}">
    <div class="product-image">${cover(product)}
      <span class="availability ${available ? '' : 'out'}">${available ? 'Disponible' : 'Agotado'}</span>
      ${optionBadge}
    </div>
    <div class="product-info">
      <p class="category">${escapeHtml(product.categoria)}</p>
      <h3>${escapeHtml(product.publicName)}</h3>
      ${presentationChips(product)}
      <p class="summary">${escapeHtml(product.descripcion)}</p>
      <div class="card-bottom"><strong>${priceLabel(product)}</strong><button class="text-button" type="button">${actionLabel}</button></div>
    </div>
  </article>`;
}

function render(filter = 'Todos') {
  const visible = filter === 'Todos' ? groups : groups.filter(p => p.categoria === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('.product-card').forEach(cardEl => cardEl.addEventListener('click', () => openProduct(cardEl.dataset.groupKey)));
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

function variantMarkup(v, index, selectedIndex) {
  const title = v.color_caja || 'Presentación';
  const unavailable = v.disponible === false;
  return `<button type="button" class="variant-card${index === selectedIndex ? ' active' : ''}" data-variant-index="${index}" ${unavailable ? 'disabled aria-disabled="true"' : ''}>
    <span class="variant-card-top"><strong class="variant-name">${colorDot(title)}${escapeHtml(title)}</strong>${v.color_interior ? `<small>Interior ${escapeHtml(v.color_interior)}</small>` : ''}</span>
    <span class="variant-description">${escapeHtml(v.detalle_distintivo || '')}</span>
    <span class="variant-footer"><span class="availability ${unavailable ? 'out' : ''}">${unavailable ? 'Agotado' : 'Disponible'}</span><strong>${showPrices ? money(v.precio_minorista) : 'Consultar por WhatsApp'}</strong></span>
  </button>`;
}

function initialVariantIndex(product) {
  const availableWithImage = product.variants.findIndex(v => v.disponible !== false && (v.imagenes || []).length);
  if (availableWithImage >= 0) return availableWithImage;
  const available = product.variants.findIndex(v => v.disponible !== false);
  return available >= 0 ? available : 0;
}

function openProduct(groupKey) {
  const product = groups.find(p => p.groupKey === groupKey);
  if (!product) return;
  let selectedIndex = initialVariantIndex(product);
  let galleryIndex = 0;

  const renderDialog = () => {
    const selected = product.variants[selectedIndex];
    const images = variantImages(selected, product);
    content.innerHTML = `<div class="dialog-gallery" data-dialog-gallery>${galleryMarkup(images, product.publicName)}</div>
      <div class="dialog-details">
        <p class="eyebrow">${escapeHtml(product.categoria)}</p>
        <h2>${escapeHtml(product.publicName)}</h2>
        <p>${escapeHtml(product.descripcion)}</p>
        <div class="presentation-heading"><div><h3>Elige un color o presentación</h3><p>La fotografía, el precio y el código se actualizan según tu elección.</p></div></div>
        <div class="variants">${product.variants.map((v, index) => variantMarkup(v, index, selectedIndex)).join('')}</div>
        <div class="dialog-actions"><a class="button whatsapp" target="_blank" rel="noopener" data-variant-whatsapp>Consultar por WhatsApp</a><button id="share-product" class="button secondary" type="button">Compartir</button></div>
      </div>`;

    const setGallery = next => {
      const slides = [...content.querySelectorAll('.gallery-slide')];
      const thumbs = [...content.querySelectorAll('.gallery-thumb')];
      if (!slides.length) return;
      galleryIndex = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('active', i === galleryIndex));
      thumbs.forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
      content.querySelector('[data-gallery-current]').textContent = galleryIndex + 1;
      slides[galleryIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    content.querySelector('.gallery-prev').addEventListener('click', () => setGallery(galleryIndex - 1));
    content.querySelector('.gallery-next').addEventListener('click', () => setGallery(galleryIndex + 1));
    content.querySelectorAll('[data-gallery-go]').forEach(button => button.addEventListener('click', () => setGallery(Number(button.dataset.galleryGo))));
    const track = content.querySelector('.gallery-track');
    track.addEventListener('scroll', () => {
      const width = track.clientWidth || 1;
      const next = Math.round(track.scrollLeft / width);
      if (next !== galleryIndex) {
        galleryIndex = Math.max(0, Math.min(next, images.length - 1));
        content.querySelectorAll('.gallery-thumb').forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
        content.querySelector('[data-gallery-current]').textContent = galleryIndex + 1;
      }
    }, { passive: true });

    content.querySelectorAll('[data-variant-index]').forEach(button => button.addEventListener('click', () => {
      selectedIndex = Number(button.dataset.variantIndex);
      galleryIndex = 0;
      renderDialog();
    }));

    const selectedLabel = selected.color_caja || 'Presentación';
    const whatsappText = `Hola, quisiera consultar por ${product.publicName}, presentación ${selectedLabel} (${selected.sku || product.codigo_modelo}).`;
    content.querySelector('[data-variant-whatsapp]').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`;
    content.querySelector('#share-product').addEventListener('click', () => shareProduct(product, selected, images[galleryIndex] || images[0]));
  };

  renderDialog();
  dialog.showModal();
}

async function shareProduct(product, variant, imageUrl) {
  const priceText = showPrices && variant.precio_minorista != null ? money(variant.precio_minorista) : 'Consultar por WhatsApp';
  const available = variant.disponible ? 'Disponible' : 'Agotado';
  const presentation = [variant.color_caja ? `Caja ${variant.color_caja}` : '', variant.color_interior ? `interior ${variant.color_interior}` : ''].filter(Boolean).join(', ');
  const text = applyTemplate(shareTemplate, {
    nombre: product.publicName,
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
      const safeName = product.publicName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'image/jpeg' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: product.publicName, text, files: [file] });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  if (navigator.share) {
    try { await navigator.share({ title: product.publicName, text }); return; }
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
    const [productsResult, configResult] = await Promise.all([
      db.from('productos_publicos').select('*').order('orden'),
      db.from('configuracion_publica').select('plantilla_whatsapp,mostrar_precios,nombre_empresa,logo_url').eq('id', 'catalogo').single()
    ]);

    if (productsResult.error) throw productsResult.error;

    const config = configResult.data;
    shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
    showPrices = config?.mostrar_precios === true;
    companyName = config?.nombre_empresa?.trim() || 'Importadora A&N';
    brandLogo = config?.logo_url || './assets/logo.png';
    applyBrand();

    groups = groupProducts(productsResult.data || []);
    render();

    if (!groups.length) {
      status.textContent = 'No hay productos disponibles en este momento.';
      status.hidden = false;
    }
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    grid.innerHTML = '';
    status.textContent = 'No pudimos cargar el catálogo. Actualiza la página para intentar nuevamente.';
    status.hidden = false;
  } finally {
    if (groups.length) status.hidden = true;
  }
}

load();
