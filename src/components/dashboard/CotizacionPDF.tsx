// CotizacionPDF.tsx
// Generador de PDF para la cotización — usa html2canvas + jsPDF
// Importa y llama a generateCotizacionPDF({ datosCliente, items, subtotal, descuento, total, fecha })

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface CotizacionItemPDF {
  id: string | number;
  name: string;
  selectedColor?: string;
  category?: string;
  type?: string;
  stock?: number;
  price: number;
  cantidad: number;
  images?: string[];
}

export interface DatosClientePDF {
  nombre: string;
  telefono: string;
  direccion?: string;
  tipoPago?: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "";
  vigencia?: number; // dias
  descuento?: number;
}

export interface GeneratePDFParams {
  datosCliente: DatosClientePDF;
  items: CotizacionItemPDF[];
  subtotal: number;
  descuentoTotal: number;
  totalFinal: number;
  fecha?: string; // string ya formateada
  logoUrl?: string; // ruta relativa o absolute
  fileName?: string;
}

/**
 * SVG del icono de WhatsApp - CORREGIDO para html2canvas
 */
const WhatsappIconSVG = ({ className = "whatsapp-svg", color = "#25D366" }) => `
  <svg class="${className}" viewBox="0 0 24 24" fill="${color}" style="display: block; flex-shrink: 0; transform: translateY(2px);">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.464"/>
  </svg>
`;

/**
 * generateCotizacionPDF
 * - Crea un HTML offscreen que replica el layout de la imagen y lo renderiza a PDF.
 * - Retorna una Promise que se resuelve tras descargar el PDF.
 *
 * Uso:
 * await generateCotizacionPDF({ datosCliente, items, subtotal, descuentoTotal, totalFinal, fecha, logoUrl })
 */
export async function generateCotizacionPDF(params: GeneratePDFParams): Promise<void> {
  const {
    datosCliente,
    items,
    subtotal,
    descuentoTotal,
    totalFinal,
    fecha = new Date().toLocaleDateString("es-BO"),
    logoUrl = "/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png",
    fileName = "cotizacion.pdf"
  } = params;

  // Determinar si es contra entrega
  const esContraEntrega = datosCliente.tipoPago === "contra-entrega";

  // Calcular abono y saldo - siempre 0 y totalFinal respectivamente
  const abono = 0;
  const saldo = totalFinal;

  // 1) Crear el contenedor offscreen
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.width = "1200px"; // ancho grande para mejor calidad
  wrapper.style.padding = "24px";
  wrapper.style.background = "#ffffff";
  wrapper.id = "cotizacion-pdf-wrapper";

  // 2) Inyectar estilos (imitando el diseño de la imagen que enviaste)
  const style = document.createElement("style");
  style.innerHTML = `
    /* Reset básico */
    * { box-sizing: border-box; }
    body, html { margin: 0; padding: 0; font-family: "Inter", "Helvetica Neue", Arial, sans-serif; color: #0f3b43; }
    .pdf-container { width: 100%; }
    .header { text-align: center; margin-bottom: 18px; }
    .logo { height: 64px; object-fit: contain; display: block; margin: 0 auto 6px; }
    .title { color: #0f5560; font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: left; padding-left: 4px; }
    .card { border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 14px; }
    .table { width: 100%; border-collapse: collapse; font-size: 12px; color: #0f3b43; }
    .table th, .table td { padding: 12px 10px; border-bottom: 1px solid #e6edf0; vertical-align: top; }
    .table thead th { background: #f9fafb; font-weight: 700; text-align: left; color: #0f5560; }
    .desc-cell { font-size: 13px; color: #2f6b71; }
    .items-table th { text-align: left; }
    .items-table .qty { text-align: center; width: 80px; }
    .items-table .unit, .items-table .total { text-align: right; width: 140px; }
    .muted { color: #6b7880; font-size: 12px; }
    .summary { width: 320px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 16px; }
    .summary .title { font-size: 18px; color: #0f5560; margin-bottom: 8px; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .summary .total { font-size: 18px; font-weight: 700; color: #0f5560; }
    .summary .abono { color: #137f46; font-weight: 700; }
    .summary .saldo { color: #c84b00; font-weight: 700; }
    .btn-print { display:none; }
    /* Layout */
    .flex { display:flex; gap: 16px; }
    .left { flex: 1 1 auto; }
    .right { width: 320px; }
    .small { font-size: 12px; color: #0f3b43; }
    .product-name { font-weight: 600; color: #0f3b43; margin:0 0 6px; }
    .product-meta { font-size: 12px; color:#6b7880; margin:0; }
    
    /* Estilos para la cabecera - logo a la derecha */
    .cabecera-cotizacion { text-align: right; margin-bottom: 24px; margin-left: auto; }
    .logo-cabecera { height: 64px; object-fit: contain; display: block; margin-left: auto; margin-bottom: 12px; }
    .info-contacto { text-align: right; margin-bottom: 16px; }
    .direccion { font-size: 13px; color: #000; font-weight: 500; margin-bottom: 8px; }
    .whatsapp-info { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-bottom: 8px; }
    .whatsapp-svg { width: 18px; height: 18px; display: block; flex-shrink: 0; }
    .telefonos { font-size: 13px; color: #000; font-weight: 500; line-height: 1; }
    .no-plomo { font-size: 14px; color: #000; font-weight: bold; margin-top: 4px; }
    .titulo-productos { font-size: 18px; font-weight: 700; color: #0f5560; margin: 0; text-align: left; }
    
    /* Estilos para resumen integrado en tabla */
    .resumen-table { width: 100%; border-collapse: collapse; margin-top: 0; }
    .resumen-row { border-bottom: 1px solid #e5e7eb; }
    .resumen-label { background: #f9fafb; font-weight: 600; color: #0f5560; padding: 10px 12px; }
    .resumen-value { text-align: right; padding: 10px 12px; background: #f9fafb; }
    .resumen-total { background: #f9fafb; font-weight: 700; color: #0f5560; padding: 10px 12px; }
    .resumen-total-value { text-align: right; padding: 10px 12px; background: #f9fafb; font-weight: 700; }
    .resumen-abono-label { background: #f9fafb; font-weight: 600; color: #0f5560; padding: 10px 12px; }
    .resumen-abono-value { text-align: right; padding: 10px 12px; background: #f9fafb; color: #137f46; font-weight: 600; }
    .resumen-saldo-label { background: #f9fafb; font-weight: 600; color: #0f5560; padding: 10px 12px; }
    .resumen-saldo-value { text-align: right; padding: 10px 12px; background: #f9fafb; color: #c84b00; font-weight: 600; }
    .separator-row { border-top: 2px solid #d1d5db; }
    .descuento-label { background: #ffffff; font-weight: 600; color: #dc2626; padding: 10px 12px; }
    .descuento-value { text-align: right; padding: 10px 12px; background: #ffffff; color: #dc2626; font-weight: 600; }
    
    @media print {
      .btn-print { display: none; }
    }
  `;

  // 3) Construir el contenido del resumen de pagos
  let resumenHTML = `
    <!-- Fila de Subtotal - Integrada en la tabla -->
    <tr class="resumen-row">
      <td colspan="3" class="resumen-label">Subtotal</td>
      <td class="qty"></td>
      <td class="unit"></td>
      <td class="total resumen-value">Bs ${formatNumber(subtotal)}</td>
    </tr>
    
    <!-- Fila de Descuento - Solo si hay descuento -->
    ${descuentoTotal > 0 ? `
      <tr class="resumen-row">
        <td colspan="3" class="descuento-label">Descuento</td>
        <td class="qty"></td>
        <td class="unit"></td>
        <td class="total descuento-value">-Bs ${formatNumber(descuentoTotal)}</td>
      </tr>
    ` : ''}
    
    <!-- Fila de Total - Integrada en la tabla -->
    <tr class="resumen-row">
      <td colspan="3" class="resumen-total">Total</td>
      <td class="qty"></td>
      <td class="unit"></td>
      <td class="total resumen-total-value">Bs ${formatNumber(totalFinal)}</td>
    </tr>
  `;

  // Solo agregar Abono y Saldo si NO es contra entrega
  if (!esContraEntrega) {
    resumenHTML += `
      <!-- Línea de separación -->
      <tr class="separator-row">
        <td colspan="6" style="border-top: 2px solid #d1d5db; padding: 4px 0;"></td>
      </tr>
      
      <!-- Fila de Abono - Integrada en la tabla -->
      <tr class="resumen-row">
        <td colspan="3" class="resumen-abono-label">Abono</td>
        <td class="qty"></td>
        <td class="unit"></td>
        <td class="total resumen-abono-value">Bs ${formatNumber(abono)}</td>
      </tr>
      
      <!-- Fila de Saldo - Integrada en la tabla -->
      <tr class="resumen-row">
        <td colspan="3" class="resumen-saldo-label">Saldo</td>
        <td class="qty"></td>
        <td class="unit"></td>
        <td class="total resumen-saldo-value">Bs ${formatNumber(saldo)}</td>
      </tr>
    `;
  }

  // 4) Construir HTML con los datos (tabla y sidebar)
  const leftHTML = `
    <div class="card" style="margin-bottom:12px;">
      <table class="table" style="width:100%; border-bottom:none;">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Tipo de Pago</th>
            <th>Vigencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="small">${escapeHtml(fecha)}</td>
            <td class="small">${escapeHtml(datosCliente.nombre || "")}</td>
            <td class="small">${escapeHtml(datosCliente.telefono || "")}</td>
            <td class="small">${escapeHtml(datosCliente.direccion || "")}</td>
            <td class="small">${formatTipoPago(datosCliente.tipoPago)}</td>
            <td class="small">${(datosCliente.vigencia ?? 0)} días</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <table class="table items-table" style="width:100%; border-bottom: none;">
        <thead>
          <tr>
            <th colspan="3">Producto</th>
            <th class="qty">Cantidad</th>
            <th class="unit">Valor Unitario</th>
            <th class="total">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(itemRowHtml).join("")}
          
          ${resumenHTML}
        </tbody>
      </table>
    </div>
  `;

  // 5) Construir la cabecera con logo a la derecha
  const cabeceraHTML = `
    <div style="display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 20px;">
      <div class="cabecera-cotizacion">
        <img src="${logoUrl}" class="logo-cabecera" alt="NEOLED Logo" />
        <div class="info-contacto">
          <p class="direccion">Av. Heroinas esq. Hamiraya #316</p>
          <div class="whatsapp-info">
            ${WhatsappIconSVG({ className: "whatsapp-svg", color: "#25D366" })}
            <span class="telefonos">77918672 - 77950297</span>
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.appendChild(style);

  wrapper.innerHTML += `
    <div class="pdf-container">
      ${cabeceraHTML}
      
      <div style="display:flex; align-items:flex-start; gap: 16px; margin-bottom: 16px;">
        <div style="flex:1;">
          <h2 class="titulo-productos">Productos Cotizados</h2>
        </div>
      </div>

      <div style="margin-top:8px;">
        <div class="left">
          ${leftHTML}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // 6) Renderizar a canvas con html2canvas
  try {
    // html2canvas opciones para mejor calidad
    const node = wrapper;
    const scale = 2; // mejora calidad en pdf
    const canvas = await html2canvas(node, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight
    });

    // 7) Pasar a jsPDF
    const imgData = canvas.toDataURL("image/png");
    // Tamaño de A4 en pt: 595.28 x 841.89 (portrait). Usamos landscape para que quepa mejor.
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4"
    });

    // Calcular dimensiones para que ocupe toda la pagina (manteniendo ratio)
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // imagen tiene dimensiones canvas.width, canvas.height (px); convertimos a pt manteniendo ratio
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = Math.min(pdfWidth / imgW, pdfHeight / imgH);
    const imgRenderedW = imgW * ratio;
    const imgRenderedH = imgH * ratio;

    const marginX = (pdfWidth - imgRenderedW) / 2;
    const marginY = (pdfHeight - imgRenderedH) / 2;

    pdf.addImage(imgData, "PNG", marginX, marginY, imgRenderedW, imgRenderedH, undefined, "FAST");
    pdf.save(fileName);
  } catch (err) {
    console.error("Error generando PDF:", err);
    throw err;
  } finally {
    // limpiamos el wrapper
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}

/* ---------- Helpers ---------- */

function formatNumber(v: number) {
  const x = Math.abs(v) < 0.005 ? 0 : v;
  return x.toFixed(2);
}

function escapeHtml(str?: string) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTipoPago(tp?: string) {
  if (!tp) return "";
  if (tp === "contra-entrega") return "Contra Entrega";
  if (tp === "pago-adelantado") return "Pago por Adelantado";
  if (tp === "mitad-adelanto") return "Mitad de Adelanto";
  return tp;
}

function itemRowHtml(item: CotizacionItemPDF) {
  const total = (item.price || 0) * (item.cantidad || 0);
  
  // Construir metadatos de forma condicional - VERSIÓN SIMPLIFICADA Y FUNCIONAL
  const metadataParts: string[] = [];
  
  // Función auxiliar para validar y limpiar un campo
  const getCleanField = (field?: string): string | null => {
    if (!field) return null;
    const trimmed = field.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "null") {
      return null;
    }
    return trimmed;
  };
  
  // Procesar cada campo
  const cleanColor = getCleanField(item.selectedColor);
  const cleanCategory = getCleanField(item.category);
  const cleanType = getCleanField(item.type);
  
  if (cleanColor) {
    metadataParts.push(escapeHtml(cleanColor));
  }
  
  if (cleanCategory) {
    metadataParts.push(escapeHtml(cleanCategory));
  }
  
  if (cleanType) {
    metadataParts.push(escapeHtml(cleanType));
  }
  
  // Agregar stock si existe
  if (item.stock !== undefined && item.stock !== null) {
    metadataParts.push(`Stock: ${escapeHtml(String(item.stock))}`);
  }
  
  // Si hay metadatos, unirlos con " - "
  const metadata = metadataParts.length > 0 
    ? metadataParts.join(" - ") 
    : "";
  
  return `
    <tr>
      <td colspan="3">
        <div>
          <p class="product-name">${escapeHtml(item.name)}</p>
          ${metadata ? `<p class="product-meta">${metadata}</p>` : ''}
        </div>
      </td>
      <td class="qty">${escapeHtml(String(item.cantidad))}</td>
      <td class="unit">Bs ${formatNumber(item.price)}</td>
      <td class="total">Bs ${formatNumber(total)}</td>
    </tr>
  `;
}

function calculateAbono(tipo: DatosClientePDF["tipoPago"] | undefined, total: number) {
  if (!tipo) return 0;
  switch (tipo) {
    case "pago-adelantado":
      return total;
    case "mitad-adelanto":
      return total / 2;
    case "contra-entrega":
      return 0;
    default:
      return 0;
  }
}

function calculateSaldo(tipo: DatosClientePDF["tipoPago"] | undefined, total: number) {
  if (!tipo) return 0;
  switch (tipo) {
    case "pago-adelantado":
      return 0;
    case "mitad-adelanto":
      return total / 2;
    case "contra-entrega":
      return total;
    default:
      return 0;
  }
}