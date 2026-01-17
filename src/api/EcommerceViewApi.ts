// src/api/EcommerceViewApi.ts - VERSIÓN COMPLETA CORREGIDA
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendCarrusel {
  idcarrusel: number;
  nombre: string;
  estado: number;
}

interface BackendCarruselVariante {
  idcarrusel_variante: number;
  idcarrusel: number;
  idproducto: number;
}

interface BackendProducto {
  idproducto: number;
  nombre: string;
  descripcion: string;
  idubicacion: number;
  estado: number;
}

interface BackendVariante {
  idvariante: number;
  idproducto: number;
  nombre_variante: string;
  precio_venta: string;
  precio_compra: string;
  idcolor_disenio: number | null;
  idcolor_luz: number | null;
  idwatt: number | null;
  idtamano: number | null;
  stock: number;
  stock_minimo: number;
  estado: number;
}

interface BackendImagen {
  idimagen: number;
  idvariante: number;
  imagen: string;
}

interface ColorResponse {
  idcolor_disenio: number;
  nombre: string;
  estado: number;
}

export interface Carrusel {
  id: string;
  name: string;
  productIds: string[];
  estado: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  color: string;
  price: number;
  stock: number;
  images: string[];
  variants?: Variant[];
}

export interface Variant {
  id: string;
  color: string;
  stock: number;
  price: number;
}

export interface CarruselRequest {
  nombre: string;
  productIds: number[];
}

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Cache para colores
const colorCache = new Map<number, string>();

// Función para obtener color de forma segura
const getColorDisenioSafe = async (idcolor: number | null): Promise<string> => {
  // Si es null, retornar inmediatamente
  if (!idcolor) {
    return "Sin color";
  }
  
  // Verificar cache
  if (colorCache.has(idcolor)) {
    return colorCache.get(idcolor)!;
  }
  
  try {
    const response = await api.get<ColorResponse>(`/ecommerce/colores-disenio/${idcolor}`);
    const colorName = response.data.nombre || "Sin color";
    colorCache.set(idcolor, colorName);
    return colorName;
  } catch (error: any) {
    // Si hay error 500, significa que el backend no encontró el color
    if (error.response?.status === 500) {
      colorCache.set(idcolor, "Color no disponible");
      return "Color no disponible";
    }
    colorCache.set(idcolor, "Sin color");
    return "Sin color";
  }
};

// Función auxiliar para llamadas seguras a API
const safeApiCall = async <T>(call: () => Promise<T>, defaultValue: T): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    return defaultValue;
  }
};

// Función segura para obtener datos de API con tipado correcto
const safeApiGet = async <T>(url: string, defaultValue: T): Promise<T> => {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    return defaultValue;
  }
};

// Crear producto básico rápido
const createBasicProduct = (backendProducto: BackendProducto): Product => {
  return {
    id: backendProducto.idproducto.toString(),
    name: backendProducto.nombre,
    description: backendProducto.descripcion || "",
    category: "Cargando...",
    type: "Cargando...",
    color: "Cargando...",
    price: 0,
    stock: 0,
    images: [],
    variants: []
  };
};

// Enriquecer producto con datos completos (solo cuando se necesita)
const enrichProductData = async (productId: string): Promise<Partial<Product>> => {
  try {
    // Obtener categorías - CON TIPADO CORRECTO
    const categorias = await safeApiGet<string[]>(
      `/ecommerce/productos/${productId}/categorias`,
      []
    );
    
    // Obtener tipos - CON TIPADO CORRECTO
    const tipos = await safeApiGet<string[]>(
      `/ecommerce/productos/${productId}/tipos`,
      []
    );
    
    // Obtener variantes - CON TIPADO CORRECTO
    const variantesResponse = await safeApiGet<BackendVariante[]>(
      `/ecommerce/productos/${productId}/variantes`,
      []
    );
    
    // Obtener imágenes - CON TIPADO CORRECTO
    let images: string[] = [];
    if (variantesResponse.length > 0) {
      const imagenesResponse = await safeApiGet<BackendImagen[]>(
        `/ecommerce/variantes/${variantesResponse[0].idvariante}/imagenes`,
        []
      );
      images = imagenesResponse.map(img => `data:image/jpeg;base64,${img.imagen}`);
    }
    
    // Procesar variantes
    const variants: Variant[] = await Promise.all(
      variantesResponse.map(async (variante) => {
        const colorName = await getColorDisenioSafe(variante.idcolor_disenio);
        
        return {
          id: variante.idvariante.toString(),
          color: colorName,
          stock: variante.stock || 0,
          price: parseFloat(variante.precio_venta) || 0
        };
      })
    );
    
    // Calcular valores
    const categoria = categorias.length > 0 ? categorias[0] : "Sin categoría";
    const tipo = tipos.length > 0 ? tipos[0] : "Sin tipo";
    const color = variants.length > 0 ? variants[0].color : "Sin color";
    const price = variants.length > 0 ? variants[0].price : 0;
    const stock = variants.reduce((total, variant) => total + (variant.stock || 0), 0);
    
    return {
      category: categoria,
      type: tipo,
      color: color,
      price: price,
      stock: stock,
      images: images,
      variants: variants.length > 0 ? variants : undefined
    };
  } catch (error) {
    console.error(`Error enriqueciendo producto ${productId}:`, error);
    return {
      category: "Error",
      type: "Error",
      color: "Error",
      price: 0,
      stock: 0,
      images: [],
      variants: []
    };
  }
};

// Obtener carruseles
export const getCarruseles = async (): Promise<Carrusel[]> => {
  try {
    const response = await api.get<BackendCarrusel[]>("/ecommerce/carruseles");
    const carruseles = await Promise.all(
      response.data
        .filter(carrusel => carrusel.estado === 0)
        .map(async (carrusel) => {
          try {
            const variantesResponse = await safeApiGet<BackendCarruselVariante[]>(
              `/ecommerce/carruseles/${carrusel.idcarrusel}/variantes`,
              []
            );
            
            const productIds = variantesResponse.map(v => v.idproducto.toString());
            
            return {
              id: carrusel.idcarrusel.toString(),
              name: carrusel.nombre,
              productIds: productIds,
              estado: carrusel.estado
            };
          } catch (error) {
            return {
              id: carrusel.idcarrusel.toString(),
              name: carrusel.nombre,
              productIds: [],
              estado: carrusel.estado
            };
          }
        })
    );
    return carruseles;
  } catch (error: any) {
    console.error("Error fetching carruseles:", error.message);
    throw new Error("No se pudieron cargar los carruseles");
  }
};

// Obtener productos básicos (rápido)
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get<BackendProducto[]>("/ecommerce/productos");
    const productosActivos = response.data.filter(producto => producto.estado === 0);
    
    // Retornar productos básicos inmediatamente
    const productosBasicos = productosActivos.map(createBasicProduct);
    
    // Enriquecer primeros 5 productos en segundo plano
    setTimeout(async () => {
      const productosAEnriquecer = productosBasicos.slice(0, 5);
      for (const producto of productosAEnriquecer) {
        try {
          const enrichedData = await enrichProductData(producto.id);
          // Actualizar producto con datos enriquecidos
          Object.assign(producto, enrichedData);
        } catch (error) {
          // Continuar con siguiente producto
        }
      }
    }, 1000);
    
    return productosBasicos;
  } catch (error: any) {
    console.error("Error fetching products:", error.message);
    throw new Error("No se pudieron cargar los productos");
  }
};

// Buscar productos (solo cuando se escribe)
export const searchProducts = async (searchTerm: string): Promise<Product[]> => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  try {
    const response = await api.get<BackendProducto[]>(
      `/ecommerce/productos/search?q=${encodeURIComponent(searchTerm)}`
    );
    
    const productosActivos = response.data.filter(producto => producto.estado === 0);
    const productosLimitados = productosActivos.slice(0, 20);
    
    // Para búsqueda, enriquecer completamente
    const productosEnriquecidos = await Promise.all(
      productosLimitados.map(async (producto) => {
        const productoBasico = createBasicProduct(producto);
        const enrichedData = await enrichProductData(productoBasico.id);
        
        return {
          ...productoBasico,
          ...enrichedData
        } as Product;
      })
    );
    
    return productosEnriquecidos;
  } catch (error: any) {
    console.error("Error searching products:", error.message);
    return [];
  }
};

// Obtener producto completo por ID
export const getFullProduct = async (productId: string): Promise<Product | null> => {
  try {
    // Primero obtener datos básicos
    const response = await api.get<BackendProducto>(`/ecommerce/productos/${productId}`);
    
    if (response.data.estado !== 0) {
      return null;
    }
    
    const productoBasico = createBasicProduct(response.data);
    const enrichedData = await enrichProductData(productId);
    
    return {
      ...productoBasico,
      ...enrichedData
    } as Product;
  } catch (error: any) {
    console.error(`Error getting full product ${productId}:`, error.message);
    return null;
  }
};

// Funciones para carruseles
export const createCarrusel = async (carrusel: CarruselRequest): Promise<Carrusel> => {
  try {
    const response = await api.post<BackendCarrusel>("/ecommerce/carruseles", {
      nombre: carrusel.nombre
    });
    
    if (carrusel.productIds && carrusel.productIds.length > 0) {
      try {
        await api.post(`/ecommerce/carruseles/${response.data.idcarrusel}/variantes`, {
          productos: carrusel.productIds
        });
      } catch (variantesError: any) {
        console.error("Error adding products to carousel:", variantesError.message);
      }
    }
    
    const variantesResponse = await safeApiGet<BackendCarruselVariante[]>(
      `/ecommerce/carruseles/${response.data.idcarrusel}/variantes`,
      []
    );
    
    const productIds = variantesResponse.map(v => v.idproducto.toString());
    
    return {
      id: response.data.idcarrusel.toString(),
      name: response.data.nombre,
      productIds: productIds,
      estado: response.data.estado
    };
  } catch (error: any) {
    console.error("Error creating carrusel:", error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Datos inválidos para crear el carrusel");
    }
    
    throw new Error("No se pudo crear el carrusel");
  }
};

export const updateCarrusel = async (id: string, carrusel: CarruselRequest): Promise<Carrusel> => {
  try {
    const response = await api.put<BackendCarrusel>(`/ecommerce/carruseles/${id}`, {
      nombre: carrusel.nombre
    });
    
    if (carrusel.productIds && carrusel.productIds.length >= 0) {
      try {
        await api.put(`/ecommerce/carruseles/${id}/variantes`, {
          productos: carrusel.productIds
        });
      } catch (variantesError: any) {
        console.error("Error updating products in carousel:", variantesError.message);
      }
    }
    
    const variantesResponse = await safeApiGet<BackendCarruselVariante[]>(
      `/ecommerce/carruseles/${id}/variantes`,
      []
    );
    
    const productIds = variantesResponse.map(v => v.idproducto.toString());
    
    return {
      id: response.data.idcarrusel.toString(),
      name: response.data.nombre,
      productIds: productIds,
      estado: response.data.estado
    };
  } catch (error: any) {
    console.error("Error updating carrusel:", error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "Datos inválidos para actualizar el carrusel");
    }
    
    if (error.response?.status === 404) {
      throw new Error("Carrusel no encontrado");
    }
    
    throw new Error("No se pudo actualizar el carrusel");
  }
};

export const deleteCarrusel = async (id: string): Promise<void> => {
  try {
    await api.delete(`/ecommerce/carruseles/${id}`);
  } catch (error: any) {
    console.error("Error deleting carrusel:", error.message);
    
    if (error.response?.status === 404) {
      throw new Error("Carrusel no encontrado");
    }
    
    throw new Error("No se pudo eliminar el carrusel");
  }
};

// Función para obtener productos completos en batch
export const getFullProductsBatch = async (productIds: string[]): Promise<Product[]> => {
  if (!productIds || productIds.length === 0) {
    return [];
  }
  
  const productosCompletos = await Promise.all(
    productIds.map(async (id) => {
      try {
        const fullProduct = await getFullProduct(id);
        return fullProduct;
      } catch (error) {
        console.error(`Error obteniendo producto ${id}:`, error);
        return null;
      }
    })
  );
  
  return productosCompletos.filter((p): p is Product => p !== null);
};