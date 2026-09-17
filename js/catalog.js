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

function normalizeCategory(value) {
  const category = String(value ?? '').trim();
  if (/^dama$/i.test(category)) return 'Mujer';
  if (/^caballero$/i.test(category)) return 'Hombre';
  return category;
}

function groupProducts(rows) {
  const map = new Map();
  rows.filter(row => row.disponible !== false).forEach((raw, index) => {
    const row = { ...raw, categoria: normalizeCategory(raw.categoria), imagenes: parseImages(raw.imagenes) };
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
  const prices = product.variants.map(v => v.precio_minorista).filter(v => v != null);
  const displayName = productDisplayName(product);
  const countBadge = product.variants.length > 1 ? `<span class="variant-count">${product.variants.length} presentaciones</span>` : '';
  const action = product.variants.length > 1 ? 'Elegir presentación →' : 'Ver detalles →';
  const bottom = showPrices
    ? `<div class="card-bottom"><strong>${prices.length ? money(Math.min(...prices)) : 'Consultar precio'}</strong><button class="text-button" type="button">${action}</button></div>`
    : `<div class="card-bottom price-hidden"><button class="text-button catalog-cta" type="button">${action}</button></div>`;
  return `<article class="product-card" data-code="${escapeHtml(product.codigo_modelo)}"><div class="product-image">${cover(product)}${countBadge}</div><div class="product-info"><p class="category">${escapeHtml(product.categoria)}</p><h3>${escapeHtml(displayName)}</h3><div class="summary rich-summary">${sanitizeRichHtml(product.descripcion)}</div>${bottom}</div></article>`;
}

function render(filter = 'Todos') {
  const visible = filter === 'Todos' ? groups : groups.filter(p => p.categoria === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('.product-card').forEach(el => el.addEventListener('click', () => openProduct(el.dataset.code)));
}


function sanitizeRichHtml(value) {
  const source = String(value ?? '');
  if (!source) return '';
  if (!/<\/?(?:b|strong|i|em|u|s|br|p|ul|ol|li)(?:\s|>)/i.test(source)) return escapeHtml(source).replace(/\r?\n/g, '<br>');
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'text/html');
  const allowed = new Set(['B','STRONG','I','EM','U','S','BR','P','UL','OL','LI']);
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) {
          const fragment = document.createDocumentFragment();
          while (child.firstChild) fragment.appendChild(child.firstChild);
          child.replaceWith(fragment);
        } else {
          [...child.attributes].forEach(attr => child.removeAttribute(attr.name));
          walk(child);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) child.remove();
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function richTextForShare(value) {
  const div = document.createElement('div');
  div.innerHTML = sanitizeRichHtml(value);

  const render = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue.replace(/\u00a0/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName;
    const content = [...node.childNodes].map(render).join('');

    if (tag === 'BR') return '\n';
    if (tag === 'LI') return `• ${content.trim()}\n`;
    if (tag === 'P') return `${content.trim()}\n\n`;
    if (tag === 'UL' || tag === 'OL') return `${content}\n`;
    if (tag === 'STRONG' || tag === 'B') return content.trim() ? `*${content.trim()}*` : '';
    if (tag === 'EM' || tag === 'I') return content.trim() ? `_${content.trim()}_` : '';
    if (tag === 'S') return content.trim() ? `~${content.trim()}~` : '';
    return content;
  };

  return render(div)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function variantGalleryItems(product, variantIndex) {
  const variant = product.variants[variantIndex];
  const images = parseImages(variant?.imagenes);
  if (images.length) return images.map((url, imageIndex) => ({ type:'variant-image', url, variantIndex, imageIndex }));
  return [];
}

function presentationCards(product, selectedIndex) {
  return product.variants.map((variant, variantIndex) => {
    const images = parseImages(variant.imagenes);
    const thumb = images[0] || product.imagen_portada || productCover(product) || brandLogo;
    const label = presentationLabel(variant);
    return `<button type="button" class="presentation-card${variantIndex === selectedIndex ? ' active' : ''}" data-variant-index="${variantIndex}" aria-pressed="${variantIndex === selectedIndex}">
      <img src="${escapeHtml(thumb)}" alt="">
      <span class="presentation-card-copy"><strong>${escapeHtml(label)}</strong><small>${images.length > 1 ? `${images.length} fotos` : '1 foto'}</small></span>
      <span class="presentation-selected" aria-hidden="true">✓</span>
    </button>`;
  }).join('');
}

function presentationUrl(product, variant, variantIndex) {
  const url = new URL(location.href);
  url.searchParams.set('producto', product.codigo_modelo);
  if (variant?.sku) {
    url.searchParams.set('sku', variant.sku);
    url.searchParams.delete('presentacion');
  } else {
    url.searchParams.set('presentacion', String(variantIndex));
    url.searchParams.delete('sku');
  }
  url.hash = '';
  return url.href;
}

function updatePresentationUrl(product, variant, variantIndex) {
  history.replaceState(null, '', presentationUrl(product, variant, variantIndex));
}

function clearPresentationUrl() {
  const url = new URL(location.href);
  url.searchParams.delete('producto');
  url.searchParams.delete('sku');
  url.searchParams.delete('presentacion');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function galleryMarkup(items, activeVisualIndex, productName, isCover, hasPresentationNavigation) {
  const active = items[activeVisualIndex] || items[0];
  const imageCount = items.length;
  const arrowsDisabled = !hasPresentationNavigation && imageCount < 2;
  return `<div class="gallery-stage">
    <button class="gallery-arrow gallery-prev" type="button" aria-label="Anterior" ${arrowsDisabled ? 'disabled' : ''}>‹</button>
    <img class="gallery-main-image" src="${escapeHtml(active.url)}" alt="${escapeHtml(productName)}">
    <button class="gallery-arrow gallery-next" type="button" aria-label="Siguiente" ${arrowsDisabled ? 'disabled' : ''}>›</button>
    <span class="gallery-image-counter"><span data-gallery-current>${activeVisualIndex + 1}</span>/${imageCount}</span>
    ${isCover ? '<span class="gallery-mode-label">Portada del producto</span>' : ''}
  </div>
  <div class="visual-selector" aria-label="Fotografías de la presentación seleccionada">
    ${items.map((item,index) => `<button type="button" class="visual-thumb${index===activeVisualIndex?' active':''}" data-visual-index="${index}" aria-pressed="${index===activeVisualIndex}"><img src="${escapeHtml(item.url)}" alt=""><span>${index + 1}</span></button>`).join('')}
  </div>`;
}

function openProduct(code, initialVariantIndex = null) {
  const product = groups.find(p => p.codigo_modelo === code);
  if (!product) return;
  let selectedIndex = Number.isInteger(initialVariantIndex) && initialVariantIndex >= 0 && initialVariantIndex < product.variants.length
    ? initialVariantIndex
    : (product.variants.length ? 0 : null);
  let galleryMode = selectedIndex != null && parseImages(product.variants[selectedIndex]?.imagenes).length ? 'variant' : 'cover';
  let activeVisualIndex = 0;

  const renderDialog = () => {
    const selected = selectedIndex == null ? null : product.variants[selectedIndex];
    const displayName = productDisplayName(product);
    const selectedLabel = selected ? presentationLabel(selected) : '';
    const selectedPrice = selected && showPrices && selected.precio_minorista != null ? `<strong class="selected-price">${money(selected.precio_minorista)}</strong>` : '';
    const variantItems = selected ? variantGalleryItems(product, selectedIndex) : [];
    const items = galleryMode === 'cover'
      ? [{ type:'cover', url:productCover(product) || brandLogo, variantIndex:null }]
      : (variantItems.length ? variantItems : [{ type:'cover', url:productCover(product) || brandLogo, variantIndex:selectedIndex }]);
    if (activeVisualIndex >= items.length) activeVisualIndex = 0;
    const activeItem = items[activeVisualIndex];
    const isCover = galleryMode === 'cover';
    const selectedSummary = selected
      ? `<div class="selected-summary"><span>Presentación seleccionada</span><strong>${escapeHtml(selectedLabel)}</strong>${selected.sku ? `<small>${escapeHtml(selected.sku)}</small>` : ''}</div>`
      : `<div class="selected-summary empty-selection"><span>Presentación</span><strong>Seleccione una presentación</strong><small>Las fotografías, precio y características se mostrarán aquí.</small></div>`;
    const quickCharacteristics = selected
      ? `<div class="quick-characteristics"><span><b>Exterior:</b> ${escapeHtml(String(selected.color_caja || '').replace(/^caja\s+/i,'') || 'No especificado')}</span>${selected.color_interior ? `<span><b>Interior:</b> ${escapeHtml(selected.color_interior)}</span>` : ''}${selected.piezas ? `<span><b>Incluye:</b> ${escapeHtml(selected.piezas)} artículos</span>` : ''}</div>`
      : '';
    const actionButtons = selected
      ? `<a class="button whatsapp" target="_blank" rel="noopener" data-variant-whatsapp>Consultar por WhatsApp</a><button id="share-product" class="button secondary" type="button">Compartir</button>`
      : `<button class="button whatsapp" type="button" disabled>Seleccione una presentación</button><button id="share-product" class="button secondary" type="button" disabled>Compartir</button>`;

    content.innerHTML = `<div class="dialog-gallery">
        ${galleryMarkup(items, activeVisualIndex, displayName, isCover, product.variants.length > 0)}
        <section class="presentation-selector" aria-label="Presentaciones del producto">
          <div class="presentation-selector-heading"><div><span>Presentaciones</span><small>Seleccione una para ver sus fotografías y detalles</small></div><strong>${product.variants.length}</strong></div>
          <div class="presentation-cards">${presentationCards(product, selectedIndex)}</div>
        </section>
      </div>
      <div class="dialog-details">
        <div class="first-screen-summary">
          <div class="dialog-product-heading"><p class="eyebrow">${escapeHtml(product.categoria)}</p><h2>${escapeHtml(displayName)}</h2>${selectedPrice}</div>
          ${selectedSummary}
          ${quickCharacteristics}
        </div>
        <section class="dialog-description">
          <details open><summary>Descripción</summary><div class="rich-content">${sanitizeRichHtml(product.descripcion)}</div></details>
          ${selected?.detalle_distintivo ? `<details open><summary>Características de esta presentación</summary><div class="rich-content variant-detail">${sanitizeRichHtml(selected.detalle_distintivo)}</div></details>` : ''}
        </section>
        <div class="dialog-actions">${actionButtons}</div>
      </div>`;

    const chooseVisual = index => {
      if (index < 0 || index >= items.length) return;
      activeVisualIndex = index;
      const image = content.querySelector('.gallery-main-image');
      if (image) image.src = items[index].url;
      content.querySelectorAll('[data-visual-index]').forEach(button => {
        const active = Number(button.dataset.visualIndex) === index;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const counter = content.querySelector('[data-gallery-current]');
      if (counter) counter.textContent = String(index + 1);
    };

    const chooseVariant = index => {
      const nextVariant = product.variants[index];
      if (!nextVariant) return;
      selectedIndex = index;
      galleryMode = parseImages(nextVariant.imagenes).length ? 'variant' : 'cover';
      activeVisualIndex = 0;
      updatePresentationUrl(product, nextVariant, index);
      renderDialog();
      requestAnimationFrame(() => content.querySelector(`.presentation-card[data-variant-index="${selectedIndex}"]`)?.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}));
    };

    content.querySelectorAll('[data-variant-index]').forEach(button => button.addEventListener('click', () => chooseVariant(Number(button.dataset.variantIndex))));
    content.querySelectorAll('[data-visual-index]').forEach(button => button.addEventListener('click', () => chooseVisual(Number(button.dataset.visualIndex))));

    // Navegación continua: portada → fotos de presentación 1 → presentación 2 → … → portada.
    // Al llegar al final de una presentación, Siguiente entra en la primera foto de la siguiente.
    // Al retroceder desde la primera foto, Anterior entra en la última foto de la presentación anterior.
    const navigateGallery = direction => {
      if (galleryMode === 'cover') {
        if (direction > 0 && product.variants.length) {
          chooseVariant(0);
        } else if (direction < 0 && product.variants.length) {
          const lastIndex = product.variants.length - 1;
          const lastImages = parseImages(product.variants[lastIndex].imagenes);
          chooseVariant(lastIndex);
          if (lastImages.length > 1) {
            // chooseVariant inicia en la primera; mover a la última después del render.
            requestAnimationFrame(() => chooseVisual(lastImages.length - 1));
          }
        }
        return;
      }

      const images = parseImages(product.variants[selectedIndex]?.imagenes);
      if (direction > 0) {
        if (activeVisualIndex < images.length - 1) {
          chooseVisual(activeVisualIndex + 1);
          return;
        }
        const nextIndex = selectedIndex + 1;
        if (nextIndex < product.variants.length) {
          chooseVariant(nextIndex);
        } else {
          // Desde la última foto de la última presentación, volver a la portada.
          selectedIndex = null;
          galleryMode = 'cover';
          activeVisualIndex = 0;
          clearPresentationUrl();
          renderDialog();
        }
      } else {
        if (activeVisualIndex > 0) {
          chooseVisual(activeVisualIndex - 1);
          return;
        }
        const previousIndex = selectedIndex - 1;
        if (previousIndex >= 0) {
          const previousImages = parseImages(product.variants[previousIndex].imagenes);
          chooseVariant(previousIndex);
          if (previousImages.length > 1) {
            requestAnimationFrame(() => chooseVisual(previousImages.length - 1));
          }
        } else {
          selectedIndex = null;
          galleryMode = 'cover';
          activeVisualIndex = 0;
          clearPresentationUrl();
          renderDialog();
        }
      }
    };

    content.querySelector('.gallery-prev')?.addEventListener('click', () => navigateGallery(-1));
    content.querySelector('.gallery-next')?.addEventListener('click', () => navigateGallery(1));

    let touchStartX = 0;
    const stage = content.querySelector('.gallery-stage');
    stage?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, {passive:true});
    stage?.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 45) navigateGallery(delta < 0 ? 1 : -1);
    }, {passive:true});

    if (selected) {
      const whatsappText = `Hola, quisiera consultar por ${displayName}, presentación ${selectedLabel}${selected.sku ? ` (${selected.sku})` : ''}.`;
      content.querySelector('[data-variant-whatsapp]').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`;
      content.querySelector('#share-product')?.addEventListener('click', () => shareProduct({ ...product, nombre: displayName }, selected, activeItem.url, presentationUrl(product, selected, selectedIndex)));
    }
  };

  renderDialog();
  dialog.showModal();
  document.documentElement.classList.add('product-modal-open');
  document.body.classList.add('product-modal-open');
}

async function shareProduct(product, variant, imageUrl, shareUrl = location.href) {
  const priceText = showPrices && variant.precio_minorista != null ? money(variant.precio_minorista) : 'Consultar por WhatsApp';
  const available = variant.disponible ? 'Disponible' : 'Agotado';
  const text = applyTemplate(shareTemplate, { nombre: product.nombre, descripcion: richTextForShare(product.descripcion), detalle: richTextForShare(variant.detalle_distintivo), precio: priceText, disponibilidad: available, codigo: variant.sku || product.codigo_modelo, enlace: shareUrl });
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
dialog.addEventListener('close', () => {
  document.documentElement.classList.remove('product-modal-open');
  document.body.classList.remove('product-modal-open');
  clearPresentationUrl();
});
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
    const params = new URLSearchParams(location.search);
    const deepLinkCode = params.get('producto');
    const deepLinkSku = params.get('sku');
    const deepLinkIndex = params.get('presentacion');
    if (deepLinkCode) {
      const linkedProduct = groups.find(p => p.codigo_modelo === deepLinkCode);
      if (linkedProduct) {
        let linkedIndex = null;
        if (deepLinkSku) linkedIndex = linkedProduct.variants.findIndex(v => String(v.sku || '') === deepLinkSku);
        if (linkedIndex == null || linkedIndex < 0) linkedIndex = /^\d+$/.test(deepLinkIndex || '') ? Number(deepLinkIndex) : null;
        openProduct(deepLinkCode, linkedIndex >= 0 ? linkedIndex : null);
      }
    }
  } catch (error) {
    console.error('Error al cargar el catálogo:', error);
    status.hidden = false; status.textContent = 'No pudimos cargar el catálogo. Actualiza la página para intentarlo nuevamente.';
  }
}
load();
