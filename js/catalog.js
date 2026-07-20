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

const money = value => value == null ? 'Consultar precio' : `Bs ${Number(value).toLocaleString('es-BO')}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function groupProducts(rows) {
  const map = new Map();
  rows.forEach(row => {
    if (!map.has(row.codigo_modelo)) map.set(row.codigo_modelo, { ...row, variants: [] });
    map.get(row.codigo_modelo).variants.push(row);
  });
  return [...map.values()];
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
  const price = showPrices && prices.length ? money(Math.min(...prices)) : 'Consultar por WhatsApp';
  return `<article class="product-card" data-code="${escapeHtml(product.codigo_modelo)}">
    <div class="product-image">${cover(product)}<span class="availability ${available ? '' : 'out'}">${available ? 'Disponible' : 'Agotado'}</span></div>
    <div class="product-info"><p class="category">${escapeHtml(product.categoria)}</p><h3>${escapeHtml(product.nombre)}</h3>
    <p class="summary">${escapeHtml(product.descripcion)}</p><div class="card-bottom"><strong>${price}</strong><button class="text-button">Ver detalles →</button></div></div>
  </article>`;
}

function render(filter = 'Todos') {
  const visible = filter === 'Todos' ? groups : groups.filter(p => p.categoria === filter);
  grid.innerHTML = visible.map(card).join('');
  grid.querySelectorAll('.product-card').forEach(cardEl => cardEl.addEventListener('click', () => openProduct(cardEl.dataset.code)));
}

function openProduct(code) {
  const product = groups.find(p => p.codigo_modelo === code);
  const images = product.variants.flatMap(v => v.imagenes || []);
  content.innerHTML = `<div class="dialog-gallery">${images.length ? images.map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.nombre)}">`).join('') : cover(product)}</div>
    <div class="dialog-details"><p class="eyebrow">${escapeHtml(product.categoria)}</p><h2>${escapeHtml(product.nombre)}</h2><p>${escapeHtml(product.descripcion)}</p>
    <h3>Presentaciones</h3><div class="variants">${product.variants.map(v => `<div><div><strong>${escapeHtml(v.color_caja || 'Presentación')}</strong>${v.color_interior ? `<span>Interior ${escapeHtml(v.color_interior)}</span>` : ''}</div><p>${escapeHtml(v.detalle_distintivo)}</p><footer><span class="availability ${v.disponible ? '' : 'out'}">${v.disponible ? 'Disponible' : 'Agotado'}</span><strong>${showPrices ? money(v.precio_minorista) : 'Consultar por WhatsApp'}</strong></footer></div>`).join('')}</div>
    <div class="dialog-actions"><a class="button whatsapp" target="_blank" rel="noopener" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, quisiera consultar por ${product.nombre} (${product.codigo_modelo}).`)}">Consultar por WhatsApp</a><button id="share-product" class="button secondary">Compartir</button></div></div>`;
  content.querySelector('#share-product').addEventListener('click', () => shareProduct(product, images[0]));
  dialog.showModal();
}

async function shareProduct(product, imageUrl) {
  const prices = product.variants.map(v => v.precio_minorista).filter(v => v != null);
  const priceText = showPrices && prices.length
    ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `Desde ${money(Math.min(...prices))}`)
    : 'Consultar por WhatsApp';
  const available = product.variants.some(v => v.disponible) ? 'Disponible' : 'Agotado';
  const presentations = product.variants.map(v => `• Caja ${v.color_caja}${v.color_interior ? `, interior ${v.color_interior}` : ''}`).join('\n');
  const text = applyTemplate(shareTemplate, {
    nombre: product.nombre, descripcion: product.descripcion,
    detalle: `Presentaciones:\n${presentations}`, precio: priceText,
    disponibilidad: available, codigo: product.codigo_modelo, enlace: location.href
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
  const [{ data, error }, { data: config }] = await Promise.all([
    db.from('productos_publicos').select('*').order('orden'),
    db.from('configuracion_publica').select('plantilla_whatsapp,mostrar_precios,nombre_empresa,logo_url').eq('id', 'catalogo').single()
  ]);
  if (error) { status.textContent = 'No pudimos cargar el catálogo. Intenta nuevamente.'; return; }
  shareTemplate = config?.plantilla_whatsapp?.trim() || DEFAULT_TEMPLATE;
  showPrices = config?.mostrar_precios === true;
  companyName = config?.nombre_empresa?.trim() || 'Importadora A&N';
  brandLogo = config?.logo_url || './assets/logo.png';
  applyBrand();
  groups = groupProducts(data); status.hidden = true; render();
}
load();
