/*
===========================================
Importadora A&N
Módulo: Generador de Catálogo en PDF
Descripción: Renderiza el catálogo optimizado para móvil
en formato A4 (1 producto por página, foto destacada).
===========================================
*/

let currentProducts = [];
let currentConfig = {};
let isListenerAttached = false;

// Limpia etiquetas HTML y decodifica entidades como &nbsp;, &amp;, etc.
function cleanHtmlText(value) {
  if (!value) return '';
  const doc = new DOMParser().parseFromString(value, 'text/html');
  const text = doc.body.textContent || '';
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Procesa las imágenes de la presentación (array nativo o string JSON)
function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

// Convierte imágenes a Base64 sin detener la ejecución ante fallos
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
  if (msg) msg.textContent = 'Procesando imágenes en alta resolución…';

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ==========================================
    // PÁGINA 1: PORTADA
    // ==========================================
    doc.setFillColor(24, 24, 27); // Fondo oscuro #18181b
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    if (currentConfig.logo_url) {
      const logoBase64 = await urlToBase64(currentConfig.logo_url);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'JPEG', pageWidth / 2 - 20, 50, 40, 40);
        } catch (_) {}
      }
    }

    doc.setTextColor(212, 175, 55); // Dorado #D4AF37
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

    // ==========================================
    // PÁGINAS DE PRODUCTOS (1 producto por página)
    // ==========================================
    for (let i = 0; i < items.length; i++) {
      doc.addPage();
      const prod = items[i];

      // Encabezado superior
      doc.setFillColor(245, 245, 247);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(currentConfig.nombre_empresa || 'IMPORTADORA A&N', margin, 12);
      doc.setFont('helvetica', 'normal');
      doc.text(fecha, pageWidth - margin, 12, { align: 'right' });

      // Tarjeta contenedora de página completa
      const cardY = 24;
      const cardWidth = pageWidth - (margin * 2); // 180 mm
      const cardHeight = 254;

      doc.setDrawColor(228, 228, 231);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 4, 4, 'FD');

      // 1. Fotografía grande de la presentación (130 x 130 mm)
      const imgSize = 130;
      const imgX = (pageWidth - imgSize) / 2;
      const imgY = cardY + 8;

      // Base suave para encuadrar la imagen
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(imgX - 2, imgY - 2, imgSize + 4, imgSize + 4, 2, 2, 'F');

      const fotosPresentacion = parseImages(prod.imagenes);
      const imgUrl = fotosPresentacion[0] || prod.imagen_portada || null;
      const imgBase64 = await urlToBase64(imgUrl);

      if (imgBase64) {
        try {
          doc.addImage(imgBase64, 'JPEG', imgX, imgY, imgSize, imgSize);
        } catch (_) {
          doc.rect(imgX, imgY, imgSize, imgSize);
        }
      } else {
        doc.setDrawColor(220, 220, 220);
        doc.rect(imgX, imgY, imgSize, imgSize);
        doc.setFontSize(10);
        doc.setTextColor(160, 160, 160);
        doc.text('Fotografía no disponible', pageWidth / 2, imgY + (imgSize / 2), { align: 'center' });
      }

      // 2. Información del producto debajo de la imagen
      const textWidth = cardWidth - 24; // 156 mm
      let textY = imgY + imgSize + 9;

      // Nombre del producto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(24, 24, 27);
      const nameLines = doc.splitTextToSize(prod.nombre || 'Producto', textWidth);
      doc.text(nameLines, pageWidth / 2, textY, { align: 'center' });
      textY += (nameLines.length * 6.5) + 2;

      // SKU y Código de modelo
      if (options.includeSku) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(113, 113, 122);
        const codeTxt = `Modelo: ${prod.codigo_modelo || 'N/A'}   |   SKU: ${prod.sku}`;
        doc.text(codeTxt, pageWidth / 2, textY, { align: 'center' });
        textY += 6;
      }

      // Línea divisoria decorativa
      doc.setDrawColor(235, 235, 240);
      doc.setLineWidth(0.4);
      doc.line(pageWidth / 2 - 25, textY, pageWidth / 2 + 25, textY);
      textY += 6;

      // Descripción comercial (limpia de HTML)
      if (options.includeDescription && prod.descripcion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(82, 82, 91);
        const descPlain = cleanHtmlText(prod.descripcion);
        const descLines = doc.splitTextToSize(descPlain, textWidth);
        doc.text(descLines.slice(0, 3), pageWidth / 2, textY, { align: 'center' });
        textY += (Math.min(descLines.length, 3) * 5) + 3;
      }

      // Detalle distintivo / Lo que incluye
      if (options.includeDetail && prod.detalle_distintivo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(63, 63, 70);
        const detPlain = cleanHtmlText(prod.detalle_distintivo);
        const detLines = doc.splitTextToSize(`Incluye: ${detPlain}`, textWidth);
        doc.text(detLines.slice(0, 2), pageWidth / 2, textY, { align: 'center' });
        textY += (Math.min(detLines.length, 2) * 5) + 3;
      }

      // 3. Franja inferior: Precio y Estado de disponibilidad
      const bottomY = cardY + cardHeight - 12;

      if (options.includePrice && prod.precio_minorista) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(185, 28, 28);
        doc.text(`Bs ${Number(prod.precio_minorista).toFixed(2)}`, margin + 12, bottomY);
      }

      if (options.includeStock) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const isAvailable = (prod.stock > 0 || prod.disponible);
        if (isAvailable) {
          doc.setTextColor(22, 101, 52); // Verde
          doc.text('● Disponible', pageWidth - margin - 12, bottomY, { align: 'right' });
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Agotado', pageWidth - margin - 12, bottomY, { align: 'right' });
        }
      }

      // Numeración de página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    }

    // Salida y apertura directa
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