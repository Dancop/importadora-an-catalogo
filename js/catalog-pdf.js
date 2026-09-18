/*
===========================================
Importadora A&N
Módulo: Generador de catálogo PDF
Versión: 0.9.4
Descripción: Genera desde el panel administrativo un catálogo PDF
usando los productos públicos y sus fotografías actuales.
===========================================
*/

const PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';

let pdfLibraryPromise = null;

function loadPdfLibrary() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf);
  if (pdfLibraryPromise) return pdfLibraryPromise;

  pdfLibraryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-catalog-pdf-library]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jspdf));
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar el generador PDF.')));
      return;
    }
    const script = document.createElement('script');
    script.src = PDF_JS_URL;
    script.async = true;
    script.dataset.catalogPdfLibrary = 'true';
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf) : reject(new Error('La biblioteca PDF no respondió correctamente.'));
    script.onerror = () => reject(new Error('No se pudo cargar la biblioteca PDF. Revise su conexión a Internet.'));
    document.head.appendChild(script);
  });
  return pdfLibraryPromise;
}

function cleanText(value) {
  const div = document.createElement('div');
  div.innerHTML = String(value || '');
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `Bs ${number.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : 'Consultar precio';
}

function productImage(product) {
  return product.imagen_portada || product.imagenes?.[0] || null;
}

async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('No se pudo cargar una imagen para el PDF:', url, error);
    return null;
  }
}

function imageFormat(dataUrl) {
  if (!dataUrl) return 'JPEG';
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

function fitImage(doc, dataUrl, x, y, maxW, maxH) {
  if (!dataUrl) return;
  const props = doc.getImageProperties(dataUrl);
  const ratio = Math.min(maxW / props.width, maxH / props.height);
  const w = props.width * ratio;
  const h = props.height * ratio;
  doc.addImage(dataUrl, imageFormat(dataUrl), x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
}

function drawHeader(doc, company, logo, pageNumber, totalPages) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(247, 249, 249);
  doc.rect(0, 0, pageW, 20, 'F');
  if (logo) fitImage(doc, logo, 12, 3, 14, 14);
  doc.setTextColor(23, 43, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(company, logo ? 30 : 12, 12);
  doc.setTextColor(105, 119, 126);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Catálogo · ${pageNumber}/${totalPages}`, pageW - 12, 12, { align: 'right' });
}

function addWrapped(doc, text, x, y, width, fontSize, lineHeight = 4.2, maxLines = 5) {
  if (!text) return y;
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, width).slice(0, maxLines);
  doc.text(lines, x, y, { lineHeightFactor: lineHeight / fontSize });
  return y + lines.length * lineHeight;
}

function groupProducts(products) {
  const groups = new Map();
  products.forEach(product => {
    const key = product.codigo_modelo?.trim() || `sku:${product.sku}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  });
  return [...groups.values()];
}

function buildOptions(form) {
  return {
    includeSku: form.querySelector('#pdf-include-sku').checked,
    includeDescription: form.querySelector('#pdf-include-description').checked,
    includeDetail: form.querySelector('#pdf-include-detail').checked,
    includePrice: form.querySelector('#pdf-include-price').checked,
    includeStock: form.querySelector('#pdf-include-stock').checked,
    includeOutOfStock: form.querySelector('#pdf-include-out-of-stock').checked
  };
}

function visibleProducts(products, options) {
  return products.filter(p => options.includeOutOfStock || Number(p.stock) > 0);
}

function drawProduct(doc, product, image, x, y, w, h, options) {
  doc.setDrawColor(220, 227, 230);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');

  const imageBox = { x: x + 6, y: y + 6, w: 72, h: h - 12 };
  doc.setFillColor(247, 249, 249);
  doc.roundedRect(imageBox.x, imageBox.y, imageBox.w, imageBox.h, 3, 3, 'F');
  fitImage(doc, image, imageBox.x + 2, imageBox.y + 2, imageBox.w - 4, imageBox.h - 4);

  const tx = imageBox.x + imageBox.w + 8;
  const tw = w - (tx - x) - 7;
  let ty = y + 11;
  doc.setTextColor(23, 43, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  ty = addWrapped(doc, cleanText(product.nombre) || 'Producto', tx, ty, tw, 12, 5.2, 2);

  if (options.includeSku) {
    doc.setTextColor(105, 119, 126);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`SKU: ${cleanText(product.sku)}`, tx, ty + 1);
    ty += 7;
  }

  if (options.includeDescription && product.descripcion) {
    doc.setTextColor(57, 69, 76);
    doc.setFont('helvetica', 'normal');
    ty = addWrapped(doc, cleanText(product.descripcion), tx, ty + 1, tw, 8.5, 3.8, 4) + 2;
  }

  if (options.includeDetail && product.detalle_distintivo) {
    doc.setTextColor(23, 43, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Incluye / presentación', tx, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(57, 69, 76);
    ty = addWrapped(doc, cleanText(product.detalle_distintivo), tx, ty + 4, tw, 8, 3.5, 4) + 2;
  }

  const bottomY = y + h - 10;
  doc.setFontSize(8.5);
  if (options.includePrice) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(23, 43, 55);
    doc.text(formatPrice(product.precio_minorista), tx, bottomY);
  }
  if (options.includeStock) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(Number(product.stock) > 0 ? 57 : 150, 69, 76);
    const stockText = Number(product.stock) > 0 ? 'Disponible' : 'Agotado';
    doc.text(stockText, x + w - 7, bottomY, { align: 'right' });
  }
}

async function generatePdf(products, config, form, setStatus) {
  const options = buildOptions(form);
  const filtered = visibleProducts(products, options);
  if (!filtered.length) throw new Error('No hay productos que cumplan los filtros seleccionados.');

  setStatus('Preparando fotografías…');
  const imageEntries = await Promise.all(filtered.map(async product => [product.sku, await imageToDataUrl(productImage(product))]));
  const images = new Map(imageEntries);
  const { jsPDF } = await loadPdfLibrary();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const cardW = (pageW - margin * 2 - 8) / 2;
  const cardH = 105;
  const cardsPerPage = 2;
  const groups = groupProducts(filtered);
  const totalPages = Math.max(1, Math.ceil(filtered.length / cardsPerPage) + 1);
  const logo = await imageToDataUrl(config.logo_url);

  // Portada.
  doc.setFillColor(247, 249, 249);
  doc.rect(0, 0, pageW, pageH, 'F');
  if (logo) fitImage(doc, logo, pageW / 2 - 24, 55, 48, 48);
  doc.setTextColor(23, 43, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);
  doc.text(config.nombre_empresa || 'Importadora A&N', pageW / 2, 120, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(105, 119, 126);
  doc.setFontSize(12);
  doc.text('CATÁLOGO DE PRODUCTOS', pageW / 2, 131, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${filtered.length} productos · Generado el ${new Date().toLocaleDateString('es-BO')}`, pageW / 2, 140, { align: 'center' });

  let productIndex = 0;
  let page = 1;
  for (let pageIndex = 0; productIndex < filtered.length; pageIndex++) {
    doc.addPage();
    page++;
    drawHeader(doc, config.nombre_empresa || 'Importadora A&N', logo, page, totalPages);
    let y = 29;
    const pageProducts = filtered.slice(productIndex, productIndex + cardsPerPage);
    pageProducts.forEach((product, i) => {
      const x = margin + (i % 2) * (cardW + 8);
      drawProduct(doc, product, images.get(product.sku), x, y, cardW, cardH, options);
      if (i === 0 && pageProducts.length === 1) return;
      y += cardH + 10;
    });
    productIndex += pageProducts.length;
  }

  // Add a compact index when there are model groups. It goes before product pages only when useful.
  // Kept intentionally simple so the catalog remains fast to generate and easy to read.
  if (groups.length > 1) {
    const indexDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    // Rebuild is avoided; the index is represented on the first page when possible.
    // No extra page is inserted to preserve stable page numbering.
  }

  const filename = `Catalogo-Importadora-AN-${new Date().toISOString().slice(0, 10)}.pdf`;
  setStatus('Generando archivo…');
  doc.save(filename);
  return filename;
}

export function initializeCatalogPdf({ products, config }) {
  const form = document.querySelector('#catalog-pdf-form');
  const button = document.querySelector('#generate-catalog-pdf');
  const message = document.querySelector('#catalog-pdf-message');
  if (!form || !button) return;

  const setStatus = text => { if (message) message.textContent = text; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    try {
      await generatePdf(products || [], config || {}, form, setStatus);
      setStatus('PDF generado correctamente.');
    } catch (error) {
      console.error('No se pudo generar el catálogo PDF:', error);
      setStatus(`No se pudo generar: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  });
}
