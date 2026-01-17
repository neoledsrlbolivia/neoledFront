import axios from "axios";
import { getUserId } from "@/api/AuthApi";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendTransaction {
  idtransaccion: number;
  tipo_movimiento: string;
  descripcion: string;
  monto: string;
  fecha: string;
  idusuario: number;
  nombre_usuario: string;
}

export interface Transaction {
  idTransaccion: number;
  tipoMovimiento: string;
  descripcion: string;
  monto: number;
  fecha: string;
  idUsuario: number;
  nombreUsuario: string;
}

export interface TransactionRequest {
  tipoMovimiento: string;
  descripcion: string;
  monto: number;
}

interface CashStatus {
  estado: string;
  monto_final: string;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    // MODIFICADO: Ya no enviamos userId
    const response = await api.get("/cash/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching cash status:", error);
    return {
      estado: "cerrada",
      monto_final: "0.00"
    };
  }
};

export const getUserTransactions = async (): Promise<Transaction[]> => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }
    
    const response = await api.get<BackendTransaction[]>("/cash/transactions/user", {
      params: { userId }
    });
    
    return response.data.map((transaction) => ({
      idTransaccion: transaction.idtransaccion,
      tipoMovimiento: transaction.tipo_movimiento,
      descripcion: transaction.descripcion,
      monto: parseFloat(transaction.monto),
      fecha: transaction.fecha,
      idUsuario: transaction.idusuario,
      nombreUsuario: transaction.nombre_usuario,
    }));
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return [];
  }
};

export const createTransaction = async (
  transaction: TransactionRequest
): Promise<Transaction> => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }
    
    const response = await api.post<BackendTransaction>("/cash/transactions", {
      tipo_movimiento: transaction.tipoMovimiento,
      descripcion: transaction.descripcion,
      monto: transaction.monto.toString(),
      idusuario: userId
    });
    
    return mapBackendTransaction(response.data);
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error("No se pudo registrar el movimiento");
  }
};

export const openCash = async (montoInicial: number): Promise<void> => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }
    
    await api.post("/cash/open", {
      monto_inicial: montoInicial.toString(),
      idusuario: userId
    });
  } catch (error) {
    console.error("Error opening cash:", error);
    throw new Error("No se pudo abrir la caja");
  }
};

export const closeCash = async (): Promise<void> => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }
    
    await api.post("/cash/close", {
      idusuario: userId
    });
  } catch (error) {
    console.error("Error closing cash:", error);
    throw new Error("No se pudo cerrar la caja");
  }
};

function mapBackendTransaction(transaction: BackendTransaction): Transaction {
  return {
    idTransaccion: transaction.idtransaccion,
    tipoMovimiento: transaction.tipo_movimiento,
    descripcion: transaction.descripcion,
    monto: parseFloat(transaction.monto),
    fecha: transaction.fecha,
    idUsuario: transaction.idusuario,
    nombreUsuario: transaction.nombre_usuario,
  };
}