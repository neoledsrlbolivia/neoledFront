import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface BackendUsuario {
  idusuario: number;
  nombres: string;
  apellidos: string;
  usuario: string;
}

interface BackendDetalleVenta {
  iddetalle_venta: number;
  idvariante: number;
  cantidad: number;
  precio_unitario: string;
  subtotal_linea: string;
  nombre_variante: string;
  nombre_producto: string;
}

interface BackendVenta {
  idventa: number;
  fecha_hora: string;
  idusuario: number;
  descripcion: string;
  sub_total: string;
  descuento: string;
  total: string;
  metodo_pago: string;
  usuario_nombre: string;
  usuario_apellidos: string;
  usuario_usuario: string;
  detalle: BackendDetalleVenta[];
}

export interface DetalleVenta {
  iddetalle_venta: number;
  idvariante: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  producto: string;
}

export interface Venta {
  id: number;
  fecha: string | Date;  // Cambiado a string | Date
  usuario: string;
  usuario_completo: string;
  usuario_login: string;
  descripcion: string;
  detalle: DetalleVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo: string;
}

export interface VentasFiltros {
  empleado?: string;
  metodo?: string;
  fechaEspecifica?: Date;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface TotalesVentas {
  totalGeneral: number;
  totalEfectivo: number;
  totalQR: number;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getUsuariosVentas = async (): Promise<BackendUsuario[]> => {
  try {
    const response = await api.get<BackendUsuario[]>("/ventas/usuarios");
    return response.data;
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    throw new Error("No se pudieron cargar los usuarios");
  }
};

export const getVentas = async (filtros?: VentasFiltros): Promise<Venta[]> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = filtros.fechaEspecifica.toISOString().split('T')[0];
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = filtros.fechaInicio.toISOString().split('T')[0];
      params.fechaFin = filtros.fechaFin.toISOString().split('T')[0];
    }

    const response = await api.get<BackendVenta[]>("/ventas/ventas", { params });
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,  // Mantener como string ISO
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      descripcion: venta.descripcion,
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idvariante: detalle.idvariante,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_variante || detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas:", error);
    throw new Error("No se pudieron cargar las ventas");
  }
};

export const getTotalesVentas = async (filtros?: VentasFiltros): Promise<TotalesVentas> => {
  try {
    const params: any = {};
    
    if (filtros?.empleado && filtros.empleado !== "Todos") {
      params.empleado = filtros.empleado;
    }
    
    if (filtros?.metodo && filtros.metodo !== "Todos") {
      params.metodo = filtros.metodo;
    }
    
    if (filtros?.fechaEspecifica) {
      params.fechaEspecifica = filtros.fechaEspecifica.toISOString().split('T')[0];
    }
    
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      params.fechaInicio = filtros.fechaInicio.toISOString().split('T')[0];
      params.fechaFin = filtros.fechaFin.toISOString().split('T')[0];
    }

    const response = await api.get<{
      total_general: string;
      total_efectivo: string;
      total_qr: string;
    }>("/ventas/totales", { params });
    
    return {
      totalGeneral: parseFloat(response.data.total_general),
      totalEfectivo: parseFloat(response.data.total_efectivo),
      totalQR: parseFloat(response.data.total_qr)
    };
  } catch (error) {
    console.error("Error fetching totales:", error);
    throw new Error("No se pudieron cargar los totales");
  }
};

export const getVentasHoyAsistente = async (username: string): Promise<Venta[]> => {
  try {
    const response = await api.get<BackendVenta[]>(`/ventas/ventas/hoy/${username}`);
    
    return response.data.map((venta) => ({
      id: venta.idventa,
      fecha: venta.fecha_hora,  // Mantener como string ISO
      usuario: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_completo: `${venta.usuario_nombre} ${venta.usuario_apellidos}`,
      usuario_login: venta.usuario_usuario,
      descripcion: venta.descripcion,
      detalle: venta.detalle.map((detalle) => ({
        iddetalle_venta: detalle.iddetalle_venta,
        idvariante: detalle.idvariante,
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal_linea: parseFloat(detalle.subtotal_linea),
        producto: detalle.nombre_variante || detalle.nombre_producto || "Producto sin nombre"
      })),
      subtotal: parseFloat(venta.sub_total),
      descuento: parseFloat(venta.descuento),
      total: parseFloat(venta.total),
      metodo: venta.metodo_pago
    }));
  } catch (error) {
    console.error("Error fetching ventas hoy:", error);
    throw new Error("No se pudieron cargar las ventas de hoy");
  }
};