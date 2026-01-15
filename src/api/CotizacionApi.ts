import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para el backend (igual que en ventas)
interface BackendProduct {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  variantes: BackendVariant[];
}

interface BackendVariant {
  idvariante: number;
  idproducto: number;
  nombre_variante: string;
  precio_venta: string;
  precio_compra: string;
  idcolor_disenio: number;
  idcolor_luz: number;
  idwatt: number;
  idtamano: number;
  stock: number;
  stock_minimo: number;
  estado: number;
  color_disenio: string;
  color_luz: string;
  watt: string;
  tamano: string;
  imagenes: string[];
}

interface BackendCotizacion {
  idcotizacion: number;
  vigencia: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: string;
  sub_total: string;
  descuento: string;
  total: string;
  abono: string;
  saldo: string;
  estado: number;
  idusuario: number;
  fecha_creacion: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

interface BackendDetalleCotizacion {
  iddetalle_cotizacion: number;
  idcotizacion: number;
  idvariante: number;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
  nombre_variante?: string;
  producto_nombre?: string;
  color_disenio?: string;
}

// Interfaces para el frontend (igual que en ventas)
export interface Variante {
  id: number;
  idproducto: number;
  nombre_variante: string;
  precio_venta: number;
  precio_compra: number;
  idcolor_disenio: number;
  idcolor_luz: number;
  idwatt: number;
  idtamano: number;
  stock: number;
  stock_minimo: number;
  estado: number;
  color_disenio: string;
  color_luz: string;
  watt: string;
  tamano: string;
  imagenes: string[];
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  variantes: Variante[];
}

export interface Cotizacion {
  idcotizacion: number;
  vigencia: string; // Cambiado a string para mostrar formato legible
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";
  sub_total: number;
  descuento: number;
  total: number;
  abono: number;
  saldo: number;
  estado: number;
  idusuario: number;
  fecha_creacion: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
}

export interface DetalleCotizacion {
  iddetalle_cotizacion: number;
  idcotizacion: number;
  idvariante: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  nombre_variante?: string;
  producto_nombre?: string;
  color_disenio?: string;
}

// MODIFICADO: Actualizado para incluir "Contra Entrega"
export interface CotizacionRequest {
  vigencia: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string;
  tipo_pago: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";
  sub_total: number;
  descuento: number;
  total: number;
  abono: number;
  saldo: number;
  items: Array<{
    idvariante: number;
    cantidad: number;
    precio_unitario: number;
    subtotal_linea: number;
  }>;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mapeadores (igual que en ventas)
function mapBackendProduct(product: BackendProduct): Producto {
  return {
    id: product.idproducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    estado: product.estado,
    idubicacion: product.idubicacion,
    nombre_ubicacion: product.nombre_ubicacion,
    variantes: product.variantes.map(mapBackendVariant)
  };
}

function mapBackendVariant(variant: BackendVariant): Variante {
  return {
    id: variant.idvariante,
    idproducto: variant.idproducto,
    nombre_variante: variant.nombre_variante,
    precio_venta: parseFloat(variant.precio_venta),
    precio_compra: parseFloat(variant.precio_compra),
    idcolor_disenio: variant.idcolor_disenio,
    idcolor_luz: variant.idcolor_luz,
    idwatt: variant.idwatt,
    idtamano: variant.idtamano,
    stock: variant.stock,
    stock_minimo: variant.stock_minimo,
    estado: variant.estado,
    // Limpiar color_disenio si es "null" o vacío
    color_disenio: variant.color_disenio && 
                  variant.color_disenio.trim() !== "" && 
                  variant.color_disenio.toLowerCase() !== "null"
                  ? variant.color_disenio.trim()
                  : "",
    color_luz: variant.color_luz,
    watt: variant.watt,
    tamano: variant.tamano,
    imagenes: variant.imagenes
  };
}

// Mapeador CORREGIDO para cotizaciones - maneja correctamente la vigencia
function mapBackendCotizacion(cotizacion: BackendCotizacion): Cotizacion {
  // Convertir vigencia a formato legible
  let vigenciaLegible = "No definida";
  
  if (cotizacion.vigencia && cotizacion.vigencia !== "0") {
    const dias = parseInt(cotizacion.vigencia);
    if (!isNaN(dias) && dias > 0) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + dias);
      vigenciaLegible = fecha.toLocaleDateString('es-ES');
    }
  }

  // Formatear fecha de creación
  let fechaCreacionLegible = "Fecha no disponible";
  if (cotizacion.fecha_creacion) {
    try {
      const fecha = new Date(cotizacion.fecha_creacion);
      if (!isNaN(fecha.getTime())) {
        fechaCreacionLegible = fecha.toLocaleDateString('es-ES');
      }
    } catch (error) {
      console.warn("Error formateando fecha de creación:", error);
    }
  }

  return {
    idcotizacion: cotizacion.idcotizacion,
    vigencia: vigenciaLegible, // Usamos el string formateado
    cliente_nombre: cotizacion.cliente_nombre,
    cliente_telefono: cotizacion.cliente_telefono,
    cliente_direccion: cotizacion.cliente_direccion,
    tipo_pago: cotizacion.tipo_pago as "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega",
    sub_total: parseFloat(cotizacion.sub_total),
    descuento: parseFloat(cotizacion.descuento),
    total: parseFloat(cotizacion.total),
    abono: parseFloat(cotizacion.abono),
    saldo: parseFloat(cotizacion.saldo),
    estado: cotizacion.estado,
    idusuario: cotizacion.idusuario,
    fecha_creacion: fechaCreacionLegible,
    usuario_nombre: cotizacion.usuario_nombre,
    usuario_apellido: cotizacion.usuario_apellido
  };
}

function mapBackendDetalleCotizacion(detalle: BackendDetalleCotizacion): DetalleCotizacion {
  return {
    ...detalle,
    precio_unitario: parseFloat(detalle.precio_unitario),
    subtotal_linea: parseFloat(detalle.subtotal_linea)
  };
}

// API functions
export const getProductos = async (): Promise<Producto[]> => {
  try {
    const response = await api.get<BackendProduct[]>("/cotizaciones/productos");
    return response.data.map(mapBackendProduct);
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const searchProductos = async (query: string): Promise<Producto[]> => {
  try {
    const response = await api.get<BackendProduct[]>(`/cotizaciones/productos/search?q=${encodeURIComponent(query)}`);
    
    // Mapear y limpiar datos
    return response.data.map(producto => ({
      ...mapBackendProduct(producto),
      variantes: producto.variantes.map(variante => ({
        ...mapBackendVariant(variante),
        // Limpiar color_disenio si es "null" o vacío
        color_disenio: variante.color_disenio && 
                      variante.color_disenio.trim() !== "" && 
                      variante.color_disenio.toLowerCase() !== "null"
                      ? variante.color_disenio.trim()
                      : ""
      }))
    }));
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

export const createCotizacion = async (cotizacion: CotizacionRequest): Promise<Cotizacion> => {
  try {
    const response = await api.post<BackendCotizacion>("/cotizaciones", cotizacion);
    return mapBackendCotizacion(response.data);
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw new Error("No se pudo crear la cotización");
  }
};

export const getCotizaciones = async (): Promise<Cotizacion[]> => {
  try {
    const response = await api.get<BackendCotizacion[]>("/cotizaciones");
    return response.data.map(mapBackendCotizacion);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    throw new Error("No se pudieron cargar las cotizaciones");
  }
};

// Buscar cotizaciones por nombre o teléfono - CORREGIDO
export const searchCotizaciones = async (query: string): Promise<Cotizacion[]> => {
  try {
    const response = await api.get<BackendCotizacion[]>(`/cotizaciones/search?q=${encodeURIComponent(query)}`);
    return response.data.map(mapBackendCotizacion);
  } catch (error) {
    console.error("Error searching quotations:", error);
    // En lugar de throw, retornar array vacío
    return [];
  }
};

export const getCotizacionById = async (id: number): Promise<{cotizacion: Cotizacion, detalles: DetalleCotizacion[]}> => {
  try {
    const response = await api.get<{
      cotizacion: BackendCotizacion;
      detalles: BackendDetalleCotizacion[];
    }>(`/cotizaciones/${id}`);
    
    return {
      cotizacion: mapBackendCotizacion(response.data.cotizacion),
      detalles: response.data.detalles.map(mapBackendDetalleCotizacion)
    };
  } catch (error) {
    console.error("Error fetching quotation:", error);
    throw new Error("No se pudo cargar la cotización");
  }
};

export const updateCotizacion = async (id: number, cotizacion: Partial<CotizacionRequest>): Promise<Cotizacion> => {
  try {
    const response = await api.put<BackendCotizacion>(`/cotizaciones/${id}`, cotizacion);
    return mapBackendCotizacion(response.data);
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw new Error("No se pudo actualizar la cotización");
  }
};

export const deleteCotizacion = async (id: number): Promise<void> => {
  try {
    await api.delete(`/cotizaciones/${id}`);
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw new Error("No se pudo eliminar la cotización");
  }
};

export default api;