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
    .table thead th { background: #ffffff; font-weight: 700; text-align: left; color: #0f5560; }
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
    @media print {
      .btn-print { display: none; }
    }
  `;

  // 3) Construir HTML con los datos (tabla y sidebar)
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
      <table class="table items-table" style="width:100%;">
        <thead>
          <tr>
            <th colspan="3">Descripción</th>
            <th class="qty">Cantidad</th>
            <th class="unit">Valor Unitario</th>
            <th class="total">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(itemRowHtml).join("")}
        </tbody>
      </table>
    </div>
  `;

  const rightHTML = `
    <div class="summary">
      <div class="title">Resumen de Pagos</div>
      <div class="summary-row"><span class="small">Subtotal:</span><span class="small">Bs ${formatNumber(subtotal)}</span></div>
      <div class="summary-row"><span class="small">Descuento Total:</span><span class="small" style="color:#d33c3c;">-Bs ${formatNumber(descuentoTotal)}</span></div>
      <hr style="border:none;border-top:1px solid #e6edf0;margin:8px 0;">
      <div class="summary-row"><span class="small">Total:</span><span class="total">Bs ${formatNumber(totalFinal)}</span></div>
      <div class="summary-row"><span class="small">Abono:</span><span class="abono">Bs ${formatNumber(calculateAbono(datosCliente.tipoPago, totalFinal))}</span></div>
      <div class="summary-row"><span class="small">Saldo:</span><span class="saldo">Bs ${formatNumber(calculateSaldo(datosCliente.tipoPago, totalFinal))}</span></div>
    </div>
  `;

  wrapper.appendChild(style);

  wrapper.innerHTML += `
    <div class="pdf-container">
      <div class="header">
        <img src="${logoUrl}" class="logo" alt="Logo" />
      </div>

      <div style="display:flex; align-items:flex-start; gap: 16px;">
        <div style="flex:1;">
          <h2 class="title">Productos Cotizados</h2>
        </div>
        <div style="width:320px;"></div>
      </div>

      <div class="flex" style="margin-top:8px;">
        <div class="left">
          ${leftHTML}
        </div>
        <div class="right">
          ${rightHTML}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // 4) Renderizar a canvas con html2canvas
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

    // 5) Pasar a jsPDF
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