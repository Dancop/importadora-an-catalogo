/*
===========================================
Importadora A&N
Módulo: Generador de Catálogo en PDF
Descripción: Renderiza el catálogo imprimible/digital
en formato A4 con portada y fichas de producto.
===========================================
*/

let currentProducts = [];
let currentConfig = {};
let isListenerAttached = false;

// Helper para convertir imágenes a Base64 sin detener la ejecución ante fallos
async function urlToBase64(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function initializeCatalogPdf({ products = [], config = {} }) {
  currentProducts = products;
  currentConfig = config;

  const form = document.querySelector('#catalog-pdf-form');
  if (!form || isListenerAttached) return;

  isListenerAttached = true;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await buildAndOpenPdf();
  });
}

async function buildAndOpenPdf() {
  const btn = document.querySelector('#generate-catalog-pdf');
  const msg = document.querySelector('#catalog-pdf-message');

  const options = {
    includeSku: document.querySelector('#pdf-include-sku')?.checked ?? true,
    includeDescription: document.querySelector('#pdf-include-description')?.checked ?? true,
    includeDetail: document.querySelector('#pdf-include-detail')?.checked ?? true,
    includePrice: document.querySelector('#pdf-include-price')?.checked ?? false,
    includeStock: document.querySelector('#pdf-include-stock')?.checked ?? true,
    includeOutOfStock: document.querySelector('#pdf-include-out-of-stock')?.checked ?? false,
  };

  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    if (msg) msg.textContent = 'No se encontró la librería jsPDF.';
    return;
  }

  // Filtrar productos
  const items = currentProducts.filter(p => {
    if (p.disponible === false) return false;
    if (!options.includeOutOfStock && p.stock <= 0) return false;
    return true;
  });

  if (items.length === 0) {
    if (msg) msg.textContent = 'No hay productos disponibles para generar el catálogo.';
    return;
  }

  const originalBtnText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando catálogo PDF…';
  if (msg) msg.textContent = 'Procesando imágenes y creando páginas…';

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ----------------------------------------
    // PÁGINA 1: PORTADA
    // ----------------------------------------
    doc.setFillColor(24, 24, 27); // Gris oscuro elegante (#18181b)
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Logo de la empresa en portada si existe
    if (currentConfig.logo_url) {
      const logoBase64 = await urlToBase64(currentConfig.logo_url);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'JPEG', pageWidth / 2 - 20, 50, 40, 40);
        } catch (_) {}
      }
    }

    doc.setTextColor(212, 175, 55); // Dorado suave (#D4AF37)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(currentConfig.nombre_empresa || 'IMPORTADORA A&N', pageWidth / 2, 110, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text('Catálogo Oficial de Productos', pageWidth / 2, 122, { align: 'center' });

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 30, 130, pageWidth / 2 + 30, 130);

    const fecha = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long' });
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text(`Edición: ${fecha}`, pageWidth / 2, 142, { align: 'center' });

    // ----------------------------------------
    // PÁGINAS DE PRODUCTOS (2 por página)
    // ----------------------------------------
    const itemsPerPage = 2;
    for (let i = 0; i < items.length; i++) {
      const pos = i % itemsPerPage;
      if (pos === 0) {
        doc.addPage();
        // Encabezado de página
        doc.setFillColor(245, 245, 247);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(currentConfig.nombre_empresa || 'IMPORTADORA A&N', margin, 12);
        doc.setFont('helvetica', 'normal');
        doc.text(fecha, pageWidth - margin, 12, { align: 'right' });
      }

      const prod = items[i];
      const y = pos === 0 ? 26 : 154;
      const cardHeight = 118;

      // Tarjeta contenedora
      doc.setDrawColor(225, 225, 230);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, pageWidth - (margin * 2), cardHeight, 3, 3, 'FD');

      // Imagen del producto
      const imgUrl = prod.imagen_portada || (prod.imagenes && prod.imagenes[0]);
      const imgBase64 = await urlToBase64(imgUrl);
      if (imgBase64) {
        try {
          doc.addImage(imgBase64, 'JPEG', margin + 6, y + 9, 62, 62);
        } catch (_) {
          doc.rect(margin + 6, y + 9, 62, 62);
        }
      } else {
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin + 6, y + 9, 62, 62);
        doc.setFontSize(9);
        doc.setTextColor(160, 160, 160);
        doc.text('Sin imagen', margin + 22, y + 42);
      }

      // Columna de datos
      const colX = margin + 74;
      const colWidth = pageWidth - colX - margin - 4;
      let textY = y + 16;

      // Nombre
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(25, 25, 25);
      const nameLines = doc.splitTextToSize(prod.nombre || 'Producto', colWidth);
      doc.text(nameLines, colX, textY);
      textY += (nameLines.length * 6) + 2;

      // SKU y Modelo
      if (options.includeSku) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`Código: ${prod.codigo_modelo || 'N/A'} | SKU: ${prod.sku}`, colX, textY);
        textY += 6;
      }

      // Variante / Color
      if (prod.color_caja || prod.color_interior) {
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const colTxt = `Color: ${[prod.color_caja, prod.color_interior ? `Interior ${prod.color_interior}` : ''].filter(Boolean).join(' · ')}`;
        doc.text(colTxt, colX, textY);
        textY += 6;
      }

      // Descripción
      if (options.includeDescription && prod.descripcion) {
        doc.setFontSize(8.5);
        doc.setTextColor(110, 110, 110);
        const descPlain = prod.descripcion.replace(/<[^>]*>/g, '').trim();
        const descLines = doc.splitTextToSize(descPlain, colWidth);
        doc.text(descLines.slice(0, 3), colX, textY);
        textY += (Math.min(descLines.length, 3) * 4.5) + 3;
      }

      // Incluye / Detalle distintivo
      if (options.includeDetail && prod.detalle_distintivo) {
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        const detPlain = prod.detalle_distintivo.replace(/<[^>]*>/g, '').trim();
        const detLines = doc.splitTextToSize(`Incluye: ${detPlain}`, colWidth);
        doc.text(detLines.slice(0, 2), colX, textY);
        textY += (Math.min(detLines.length, 2) * 4.5) + 3;
      }

      // Precio y Disponibilidad en la parte inferior
      if (options.includePrice && prod.precio_minorista) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(185, 28, 28);
        doc.text(`Bs ${Number(prod.precio_minorista).toFixed(2)}`, colX, y + 104);
      }

      if (options.includeStock) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        const stockTxt = (prod.stock > 0 || prod.disponible) ? '✓ Disponible' : 'Agotado';
        doc.text(stockTxt, pageWidth - margin - 6, y + 104, { align: 'right' });
      }

      // Numeración de página
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    }

    // Crear Blob y mostrar directamente en el navegador
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');

    if (msg) msg.textContent = 'Catálogo PDF generado y abierto en una nueva pestaña.';
  } catch (err) {
    console.error('Error al generar PDF:', err);
    if (msg) msg.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
}