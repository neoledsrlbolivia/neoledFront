// src/api/ProductsApi.ts
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Interfaces para las tablas maestras
interface BackendUbicacion {
  idubicacion: number;
  nombre: string;
  estado: number;
}

interface BackendCategoria {
  idcategoria: number;
  nombre: string;
  estado: number;
}

interface BackendTipo {
  idtipo: number;
  nombre: string;
  estado: number;
}

interface BackendColorDiseno {
  idcolor_disenio: number;
  nombre: string;
  estado: number;
}

interface BackendColorLuz {
  idcolor_luz: number;
  nombre: string;
  estado: number;
}

interface BackendWatt {
  idwatt: number;
  nombre: string;
  estado: number;
}

interface BackendTamano {
  idtamano: number;
  nombre: string;
  estado: number;
}

// Interfaces para productos y variantes
interface BackendProducto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  estado: number;
  ubicacion_nombre: string;
  idubicacion: number;
  categorias: string[];
  tipos: string[];
  variantes: BackendVariante[];
}

interface BackendVariante {
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

// Interfaces para el frontend
export interface Producto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  ubicacion: string;
  estado: number;
  categorias: string[];
  tipos: string[];
  variantes: Variante[];
}

export interface Variante {
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

export interface ProductoRequest {
  nombre: string;
  descripcion: string;
  idubicacion: number;
  categorias: number[];
  tipos: number[];
  variantes: VarianteRequest[];
}

export interface VarianteRequest {
  nombre_variante: string;
  precio_venta: number;
  precio_compra: number;
  idcolor_disenio: number;
  idcolor_luz: number;
  idwatt: number;
  idtamano: number;
  stock: number;
  stock_minimo: number;
  imagenes?: File[];
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Obtener opciones para los selects - RUTAS SIN /api (porque ya está en baseURL)
export const getUbicaciones = async (): Promise<BackendUbicacion[]> => {
  try {
    const response = await api.get<BackendUbicacion[]>("/ubicaciones");
    return response.data;
  } catch (error) {
    console.error("Error fetching ubicaciones:", error);
    throw new Error("No se pudieron cargar las ubicaciones");
  }
};

export const getCategorias = async (): Promise<BackendCategoria[]> => {
  try {
    const response = await api.get<BackendCategoria[]>("/categorias");
    return response.data;
  } catch (error) {
    console.error("Error fetching categorias:", error);
    throw new Error("No se pudieron cargar las categorías");
  }
};

export const getTipos = async (): Promise<BackendTipo[]> => {
  try {
    const response = await api.get<BackendTipo[]>("/tipos");
    return response.data;
  } catch (error) {
    console.error("Error fetching tipos:", error);
    throw new Error("No se pudieron cargar los tipos");
  }
};

export const getColoresDiseno = async (): Promise<BackendColorDiseno[]> => {
  try {
    const response = await api.get<BackendColorDiseno[]>("/colores-disenio");
    return response.data;
  } catch (error) {
    console.error("Error fetching colores diseño:", error);
    throw new Error("No se pudieron cargar los colores de diseño");
  }
};

export const getColoresLuz = async (): Promise<BackendColorLuz[]> => {
  try {
    const response = await api.get<BackendColorLuz[]>("/colores-luz");
    return response.data;
  } catch (error) {
    console.error("Error fetching colores luz:", error);
    throw new Error("No se pudieron cargar los colores de luz");
  }
};

export const getWatts = async (): Promise<BackendWatt[]> => {
  try {
    const response = await api.get<BackendWatt[]>("/watts");
    return response.data;
  } catch (error) {
    console.error("Error fetching watts:", error);
    throw new Error("No se pudieron cargar los watts");
  }
};

export const getTamanos = async (): Promise<BackendTamano[]> => {
  try {
    const response = await api.get<BackendTamano[]>("/tamanos");
    return response.data;
  } catch (error) {
    console.error("Error fetching tamaños:", error);
    throw new Error("No se pudieron cargar los tamaños");
  }
};

// CRUD de productos - RUTAS SIN /api (porque ya está en baseURL)
export const buscarProductos = async (termino: string): Promise<Producto[]> => {
  try {
    if (!termino || termino.trim().length < 2) {
      return [];
    }
    
    const response = await api.get<BackendProducto[]>(`/buscar?termino=${encodeURIComponent(termino.trim())}`);
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error buscando productos:", error);
    throw new Error("No se pudieron buscar los productos");
  }
};

// Obtener todos los productos
export const getAllProductos = async (): Promise<Producto[]> => {
  try {
    const response = await api.get<BackendProducto[]>("/todos");
    return response.data.map(mapBackendProducto);
  } catch (error) {
    console.error("Error fetching todos los productos:", error);
    throw new Error("No se pudieron cargar todos los productos");
  }
};

// Función original getProductos
export const getProductos = async (searchTerm?: string): Promise<Producto[]> => {
  try {
    if (searchTerm && searchTerm.trim().length >= 2) {
      return buscarProductos(searchTerm);
    }
    return getAllProductos();
  } catch (error) {
    console.error("Error fetching productos:", error);
    throw new Error("No se pudieron cargar los productos");
  }
};

export const getProductoById = async (id: number): Promise<Producto> => {
  try {
    const response = await api.get<BackendProducto>(`/productos/${id}`);
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error fetching producto:", error);
    throw new Error("No se pudo cargar el producto");
  }
};

export const createProducto = async (producto: ProductoRequest): Promise<Producto> => {
  try {
    const formData = new FormData();
    
    // Datos básicos del producto
    formData.append('nombre', producto.nombre);
    formData.append('descripcion', producto.descripcion);
    formData.append('idubicacion', producto.idubicacion.toString());
    formData.append('categorias', JSON.stringify(producto.categorias));
    formData.append('tipos', JSON.stringify(producto.tipos));
    
    // Variantes
    producto.variantes.forEach((variante, index) => {
      formData.append(`variantes[${index}][nombre_variante]`, variante.nombre_variante);
      formData.append(`variantes[${index}][precio_venta]`, variante.precio_venta.toString());
      formData.append(`variantes[${index}][precio_compra]`, variante.precio_compra.toString());
      formData.append(`variantes[${index}][idcolor_disenio]`, variante.idcolor_disenio.toString());
      formData.append(`variantes[${index}][idcolor_luz]`, variante.idcolor_luz.toString());
      formData.append(`variantes[${index}][idwatt]`, variante.idwatt.toString());
      formData.append(`variantes[${index}][idtamano]`, variante.idtamano.toString());
      formData.append(`variantes[${index}][stock]`, variante.stock.toString());
      formData.append(`variantes[${index}][stock_minimo]`, variante.stock_minimo.toString());
      
      // Imágenes
      if (variante.imagenes) {
        variante.imagenes.forEach((imagen, imgIndex) => {
          formData.append(`variantes[${index}][imagenes][${imgIndex}]`, imagen);
        });
      }
    });

    const response = await api.post<BackendProducto>("/productos", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error creating producto:", error);
    throw new Error("No se pudo crear el producto");
  }
};

export const updateProducto = async (id: number, producto: ProductoRequest): Promise<Producto> => {
  try {
    const formData = new FormData();
    
    formData.append('nombre', producto.nombre);
    formData.append('descripcion', producto.descripcion);
    formData.append('idubicacion', producto.idubicacion.toString());
    formData.append('categorias', JSON.stringify(producto.categorias));
    formData.append('tipos', JSON.stringify(producto.tipos));
    
    producto.variantes.forEach((variante, index) => {
      formData.append(`variantes[${index}][nombre_variante]`, variante.nombre_variante);
      formData.append(`variantes[${index}][precio_venta]`, variante.precio_venta.toString());
      formData.append(`variantes[${index}][precio_compra]`, variante.precio_compra.toString());
      formData.append(`variantes[${index}][idcolor_disenio]`, variante.idcolor_disenio.toString());
      formData.append(`variantes[${index}][idcolor_luz]`, variante.idcolor_luz.toString());
      formData.append(`variantes[${index}][idwatt]`, variante.idwatt.toString());
      formData.append(`variantes[${index}][idtamano]`, variante.idtamano.toString());
      formData.append(`variantes[${index}][stock]`, variante.stock.toString());
      formData.append(`variantes[${index}][stock_minimo]`, variante.stock_minimo.toString());
      
      if (variante.imagenes) {
        variante.imagenes.forEach((imagen, imgIndex) => {
          formData.append(`variantes[${index}][imagenes][${imgIndex}]`, imagen);
        });
      }
    });

    const response = await api.put<BackendProducto>(`/productos/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return mapBackendProducto(response.data);
  } catch (error) {
    console.error("Error updating producto:", error);
    throw new Error("No se pudo actualizar el producto");
  }
};

export const deleteProducto = async (id: number): Promise<void> => {
  try {
    await api.delete(`/productos/${id}`);
  } catch (error) {
    console.error("Error deleting producto:", error);
    throw new Error("No se pudo eliminar el producto");
  }
};

export const updateStockVariante = async (idvariante: number, cantidad: number): Promise<Variante> => {
  try {
    const response = await api.patch<BackendVariante>(`/variantes/${idvariante}/stock`, {
      cantidad
    });
    return mapBackendVariante(response.data);
  } catch (error) {
    console.error("Error updating stock:", error);
    throw new Error("No se pudo actualizar el stock");
  }
};

// Mapeadores
function mapBackendProducto(producto: BackendProducto): Producto {
  return {
    idproducto: producto.idproducto,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    idubicacion: producto.idubicacion,
    ubicacion: producto.ubicacion_nombre || "Sin ubicación",
    estado: producto.estado,
    categorias: producto.categorias,
    tipos: producto.tipos,
    variantes: producto.variantes.map(mapBackendVariante)
  };
}

function mapBackendVariante(variante: BackendVariante): Variante {
  return {
    idvariante: variante.idvariante,
    idproducto: variante.idproducto,
    nombre_variante: variante.nombre_variante,
    precio_venta: parseFloat(variante.precio_venta),
    precio_compra: parseFloat(variante.precio_compra),
    idcolor_disenio: variante.idcolor_disenio,
    idcolor_luz: variante.idcolor_luz,
    idwatt: variante.idwatt,
    idtamano: variante.idtamano,
    stock: variante.stock,
    stock_minimo: variante.stock_minimo,
    estado: variante.estado,
    color_disenio: variante.color_disenio,
    color_luz: variante.color_luz,
    watt: variante.watt,
    tamano: variante.tamano,
    imagenes: variante.imagenes
  };
}