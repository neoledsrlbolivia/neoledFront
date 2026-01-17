import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para el backend
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

interface BackendCashStatus {
  idestado_caja: number;
  estado: string;
  monto_inicial: string;
  monto_final: string;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

// Interfaces para el frontend
export interface Variant {
  idvariante: number;
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

export interface Product {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  idubicacion: number;
  nombre_ubicacion: string;
  variantes: Variant[];
}

export interface SaleItem {
  idvariante: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
}

export interface SaleRequest {
  descripcion: string;
  sub_total: number;
  descuento: number;
  total: number;
  metodo_pago: "Efectivo" | "QR";
  items: SaleItem[];
  userId?: number;
}

export interface CashStatus {
  idestado_caja: number;
  estado: "abierta" | "cerrada";
  monto_inicial: number;
  monto_final: number;
  idusuario: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener productos para búsqueda
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProduct[]>(`/sales/products/search?q=${encodeURIComponent(query)}`);
    return response.data.map(mapBackendProduct);
  } catch (error) {
    console.error("Error searching products:", error);
    
    // Verificar si es un error de red o del servidor
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 500) {
        console.error("Server error details:", error.response.data);
        throw new Error("Error del servidor al buscar productos. Por favor, intente nuevamente.");
      }
    }
    
    throw new Error("No se pudieron buscar los productos");
  }
};

// Obtener estado de caja
export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    const response = await api.get<BackendCashStatus>("/sales/cash-status");
    return mapBackendCashStatus(response.data);
  } catch (error) {
    console.error("Error fetching cash status:", error);
    throw new Error("No se pudo obtener el estado de la caja");
  }
};

// Procesar venta
export const processSale = async (sale: SaleRequest, userId: number): Promise<{idventa: number}> => {
  try {
    const saleWithUser = {
      ...sale,
      userId: userId
    };
    
    const response = await api.post<{idventa: number}>("/sales/process", saleWithUser);
    return response.data;
  } catch (error) {
    console.error("Error processing sale:", error);
    throw new Error("No se pudo procesar la venta");
  }
};

// Mapeadores
function mapBackendProduct(product: BackendProduct): Product {
  return {
    idproducto: product.idproducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    estado: product.estado,
    idubicacion: product.idubicacion,
    nombre_ubicacion: product.nombre_ubicacion,
    variantes: product.variantes.map(mapBackendVariant)
  };
}

function mapBackendVariant(variant: BackendVariant): Variant {
  return {
    idvariante: variant.idvariante,
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
    color_disenio: variant.color_disenio,
    color_luz: variant.color_luz,
    watt: variant.watt,
    tamano: variant.tamano,
    imagenes: variant.imagenes
  };
}

function mapBackendCashStatus(cashStatus: BackendCashStatus): CashStatus {
  return {
    idestado_caja: cashStatus.idestado_caja,
    estado: cashStatus.estado as "abierta" | "cerrada",
    monto_inicial: parseFloat(cashStatus.monto_inicial),
    monto_final: parseFloat(cashStatus.monto_final),
    idusuario: cashStatus.idusuario,
    fecha_apertura: cashStatus.fecha_apertura,
    fecha_cierre: cashStatus.fecha_cierre
  };
}