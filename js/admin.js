import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, WHATSAPP } from './config.js';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const list = document.querySelector('#admin-products');
const status = document.querySelector('#admin-status');

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#login-error'); message.textContent = 'Ingresando…';
  const { error } = await db.auth.signInWithPassword({ email: document.querySelector('#email').value, password: document.querySelector('#password').value });
  if (error) message.textContent = 'Correo o contraseña incorrectos.';
});
document.querySelector('#logout').addEventListener('click', () => db.auth.signOut());
db.auth.onAuthStateChange((_event, session) => showSession(session));

async function showSession(session) {
  loginView.hidden = !!session; adminView.hidden = !session;
  if (session) await loadProducts();
}

async function loadProducts() {
  status.hidden = false; status.textContent = 'Cargando inventario…';
  const [{ data: products, error: publicError }, { data: inventory, error: privateError }] = await Promise.all([
    db.from('productos_publicos').select('*').order('orden'),
    db.from('inventario_privado').select('*')
  ]);
  if (publicError || privateError) { status.textContent = 'Esta cuenta no tiene autorización o no se pudo cargar el inventario.'; return; }
  const privateMap = new Map(inventory.map(i => [i.sku, i]));
  list.innerHTML = products.map(p => editor(p, privateMap.get(p.sku))).join(''); status.hidden = true;
  list.querySelectorAll('.admin-card').forEach(bindCard);
}

function editor(p, i) {
  const firstImage = (p.imagenes || [])[0] || '';
  const thumbnail = firstImage || '../assets/logo.png';
  return `<article class="admin-card" data-sku="${p.sku}" data-first-image="${attr(firstImage)}"><header><div class="admin-product-heading"><img class="admin-thumb" src="${attr(thumbnail)}" alt="Miniatura de ${attr(p.nombre)}"><div><small>${p.sku}</small><h2>${p.nombre}</h2><span>${p.color_caja || ''}</span></div></div><span class="availability ${i.stock > 0 ? '' : 'out'}">Stock ${i.stock}</span></header>
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
    form.querySelector('[data-wholesale]').textContent = base && wholesale ? `Bs ${Math.round(base * wholesale)}` : 'Bs —';
    form.querySelector('[data-retail]').textContent = base && retail ? `Bs ${Math.round(base * retail)}` : 'Bs —';
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

async function removePhoto(sku, url) {
  if (!confirm('¿Eliminar esta fotografía?')) return;
  const { data } = await db.from('productos_publicos').select('imagenes').eq('sku', sku).single();
  const path = decodeURIComponent(new URL(url).pathname.split('/productos/')[1]);
  const { error } = await db.storage.from('productos').remove([path]);
  if (!error) await db.from('productos_publicos').update({ imagenes: (data.imagenes || []).filter(x => x !== url) }).eq('sku', sku);
  loadProducts();
}

function descriptionText(form, sku) { return `${form.nombre.value}\n\n${form.descripcion.value}\n\n${form.detalle_distintivo.value}\n\nSKU: ${sku}\nConsulta por WhatsApp: https://wa.me/${WHATSAPP}`; }
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
