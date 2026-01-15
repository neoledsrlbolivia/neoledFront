// cotizacionPdfUtils.ts
// Tipos y un ejemplo de wrapper para llamar fácilmente a generateCotizacionPDF desde tu CotizacionView.
// Importa esta utilidad donde quieras generar el PDF: e.g. import { downloadCotizacionAsPDF } from "./cotizacionPdfUtils";

import { generateCotizacionPDF, CotizacionItemPDF, DatosClientePDF } from "./CotizacionPDF";

/**
 * Descarga la cotización en PDF con los datos que ya tienes en CotizacionView.
 * Llama a esta función y pásale los datos.
 */
export async function downloadCotizacionAsPDF(args: {
  datosCliente: DatosClientePDF;
  items: CotizacionItemPDF[];
  subtotal: number;
  descuentoTotal: number;
  totalFinal: number;
  fecha?: string;
  logoUrl?: string;
  fileName?: string;
}) {
  const { datosCliente, items, subtotal, descuentoTotal, totalFinal, fecha, logoUrl, fileName } = args;

  // Mapear items y limpiar los datos de color
  const mappedItems = items.map(i => ({
    id: i.id,
    name: i.name,
    // Limpiar el campo selectedColor: remover "null" o valores vacíos
    selectedColor: i.selectedColor && 
                   i.selectedColor.trim() !== "" && 
                   i.selectedColor.toLowerCase() !== "null" 
                   ? i.selectedColor.trim() 
                   : undefined,
    category: i.category,
    type: i.type,
    stock: i.stock,
    price: i.price,
    cantidad: i.cantidad,
    images: i.images
  }));

  await generateCotizacionPDF({
    datosCliente,
    items: mappedItems,
    subtotal,
    descuentoTotal,
    totalFinal,
    fecha,
    logoUrl,
    fileName
  });
}