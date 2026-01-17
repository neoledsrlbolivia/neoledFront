import axios from "axios";
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

export const getCashStatus = async (): Promise<CashStatus> => {
  try {
    const response = await api.get("/cash/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching cash status:", error);
    // Retornar valores por defecto en caso de error
    return {
      estado: "cerrada",
      monto_final: "0.00"
    };
  }
};

export const getUserTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await api.get<BackendTransaction[]>("/cash/transactions/user");
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
    // Retornar array vacío en caso de error
    return [];
  }
};

export const createTransaction = async (
  transaction: TransactionRequest
): Promise<Transaction> => {
  try {
    const response = await api.post<BackendTransaction>("/cash/transactions", {
      tipo_movimiento: transaction.tipoMovimiento,
      descripcion: transaction.descripcion,
      monto: transaction.monto.toString(),
    });
    return mapBackendTransaction(response.data);
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error("No se pudo registrar el movimiento");
  }
};

export const openCash = async (montoInicial: number): Promise<void> => {
  try {
    await api.post("/cash/open", {
      monto_inicial: montoInicial.toString(),
    });
  } catch (error) {
    console.error("Error opening cash:", error);
    throw new Error("No se pudo abrir la caja");
  }
};

export const closeCash = async (): Promise<void> => {
  try {
    // Para cierre no enviamos monto, el backend usa el monto actual
    await api.post("/cash/close");
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