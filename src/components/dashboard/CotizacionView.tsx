import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, FileText, ChevronDown, ChevronUp, History, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CotizacionItemPDF, DatosClientePDF } from "./CotizacionPDF";
import { downloadCotizacionAsPDF } from "./cotizacionPdfUtils";
import { getProductos, searchProductos, createCotizacion, getCotizaciones, getCotizacionById, deleteCotizacion, searchCotizaciones, Producto, Variante, CotizacionRequest, Cotizacion, DetalleCotizacion } from "@/api/CotizacionApi";

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Interfaces actualizadas
interface CotizacionItem extends Variante {
  cantidad: number;
  productoNombre: string;
  productoDescripcion: string;
  selectedColor?: string;
}

interface DatosCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  tipoPago: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "";
  vigencia: 5 | 10 | 15 | 30 | 0;
  descuento: number;
}

interface CotizacionExistente {
  idcotizacion: number;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_creacion: string;
  total: number;
}

interface AlertState {
  show: boolean;
  title: string;
  message: string;
}

const formatBs = (value: number) => {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2);
};

export function CotizacionView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [cotizacionItems, setCotizacionItems] = useState<CotizacionItem[]>([]);
  const [datosCliente, setDatosCliente] = useState<DatosCliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    tipoPago: "",
    vigencia: 0,
    descuento: 0
  });
  const [cotizacionGenerada, setCotizacionGenerada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [cotizacionesExistentes, setCotizacionesExistentes] = useState<CotizacionExistente[]>([]);
  const [searchCotizacionQuery, setSearchCotizacionQuery] = useState("");
  const [showCotizacionesDialog, setShowCotizacionesDialog] = useState(false);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ show: false, title: "", message: "" });
  const { toast } = useToast();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);

  // Usar el hook de debounce para la búsqueda de productos
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  // Usar el hook de debounce para la búsqueda de cotizaciones
  const debouncedCotizacionSearchQuery = useDebounce(searchCotizacionQuery, 1000);

  // Efecto para manejar la búsqueda de productos con debounce - MÉTODO EXACTO COMO VENDERVIEW
  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2 && debouncedSearchQuery !== lastSearchQueryRef.current) {
      lastSearchQueryRef.current = debouncedSearchQuery;
      performSearch(debouncedSearchQuery);
    } else if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setExpandedProduct(null);
      lastSearchQueryRef.current = "";
    }
  }, [debouncedSearchQuery]);

  // Efecto para manejar la búsqueda de cotizaciones con debounce
  useEffect(() => {
    if (showCotizacionesDialog && debouncedCotizacionSearchQuery.trim().length > 0) {
      buscarCotizacionesPorCliente(debouncedCotizacionSearchQuery);
    } else if (showCotizacionesDialog && debouncedCotizacionSearchQuery.trim().length === 0) {
      // Cuando no hay texto de búsqueda, limpiar los resultados
      setCotizacionesExistentes([]);
    }
  }, [debouncedCotizacionSearchQuery, showCotizacionesDialog]);

  // MÉTODO DE BÚSQUEDA EXACTO COMO VENDERVIEW
  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;
    
    isSearchingRef.current = true;
    setLoading(true);
    
    try {
      const results = await searchProductos(query);
      setSearchResults(results);
      
      // Mantener el foco después de la búsqueda (para ambos dispositivos)
      setTimeout(() => {
        if (searchInputRef.current) {
          const currentPosition = searchInputRef.current.selectionStart;
          searchInputRef.current.focus();
          // Restaurar la posición del cursor
          if (currentPosition) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 10);
      
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar los productos",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  // HANDLERS DE BÚSQUEDA EXACTOS COMO VENDERVIEW
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Mantener el foco inmediatamente al cambiar (para ambos dispositivos)
    if (searchInputRef.current) {
      const currentPosition = e.target.selectionStart;
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          if (currentPosition !== null) {
            searchInputRef.current.setSelectionRange(currentPosition, currentPosition);
          }
        }
      }, 0);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevenir que Enter recargue o haga algo que pueda quitar el foco
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSearchMouseDown = (e: React.MouseEvent) => {
    // Prevenir que otros elementos interfieran con el foco (para ambos dispositivos)
    e.stopPropagation();
  };

  const toggleProductExpansion = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
    
    // Mantener el foco después de expandir/contraer (para ambos dispositivos)
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 10);
  };

  // Función segura para obtener la primera imagen - CORREGIDA
  const getFirstImage = (variante: Variante, producto: Producto) => {
    if (variante.imagenes && variante.imagenes.length > 0) {
      return variante.imagenes[0];
    }
    // Si la variante no tiene imágenes, buscar en las variantes del producto
    if (producto.variantes && producto.variantes.length > 0) {
      const primeraVariante = producto.variantes[0];
      if (primeraVariante.imagenes && primeraVariante.imagenes.length > 0) {
        return primeraVariante.imagenes[0];
      }
    }
    // Si no hay imágenes, usar imagen por defecto
    return "https://via.placeholder.com/80x80/f3f4f6/000000?text=Producto";
  };

  const agregarVariante = (product: Producto, variante: Variante) => {
    const nuevoItem: CotizacionItem = {
      ...variante,
      cantidad: 1,
      productoNombre: product.nombre,
      productoDescripcion: product.descripcion,
      selectedColor: variante.color_disenio
    };

    const existingIndex = cotizacionItems.findIndex(item => 
      item.id === variante.id
    );

    if (existingIndex !== -1) {
      const newItems = [...cotizacionItems];
      newItems[existingIndex].cantidad += 1;
      setCotizacionItems(newItems);
    } else {
      setCotizacionItems([...cotizacionItems, nuevoItem]);
    }

    setSearchQuery("");
    setSearchResults([]);
    setExpandedProduct(null);
    
    // Enfocar y preparar el input para nueva búsqueda (para ambos dispositivos)
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select(); // Seleccionar todo el texto para facilitar nueva búsqueda
      }
    }, 50);
    
    toast({
      title: "Producto agregado",
      description: `${product.nombre} - ${variante.color_disenio} agregado a la cotización`,
    });
  };

  // ACTUALIZAR CANTIDAD - PERMITIR BORRAR Y BLOQUEAR BOTÓN
  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      // Si es menor a 1, poner 0 internamente (para bloquear el botón)
      const newItems = [...cotizacionItems];
      newItems[index].cantidad = 0;
      setCotizacionItems(newItems);
      return;
    }
    
    const newItems = [...cotizacionItems];
    newItems[index].cantidad = nuevaCantidad;
    setCotizacionItems(newItems);
  };

  // MANEJADOR DE CAMBIO MANUAL - PERMITIR BORRAR
  const actualizarCantidadManual = (index: number, cantidad: string) => {
    // Si el campo está vacío, poner 0 internamente (para bloquear el botón) pero mostrar vacío
    if (cantidad === "") {
      const newItems = [...cotizacionItems];
      newItems[index].cantidad = 0; // Poner 0 internamente
      setCotizacionItems(newItems);
      return;
    }
    
    const nuevaCantidad = parseInt(cantidad);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      return; // No actualizar si no es un número válido
    }
    
    const newItems = [...cotizacionItems];
    newItems[index].cantidad = nuevaCantidad;
    setCotizacionItems(newItems);
  };

  // MANEJADOR BLUR - RESTAURAR A 1 SI ESTÁ VACÍO
  const handleCantidadInputBlur = (index: number, value: string) => {
    // Cuando pierde el foco, si está vacío o es 0, volver a 1
    if (value === "" || parseInt(value) === 0) {
      const newItems = [...cotizacionItems];
      newItems[index].cantidad = 1;
      setCotizacionItems(newItems);
    }
  };

  const eliminarItem = (index: number) => {
    const newItems = cotizacionItems.filter((_, i) => i !== index);
    setCotizacionItems(newItems);
  };

  // VERIFICAR SI HAY ITEMS CON CANTIDAD 0
  const tieneItemsInvalidos = cotizacionItems.some(item => item.cantidad < 1);

  const subtotal = cotizacionItems.reduce((total, item) => total + (item.precio_venta * item.cantidad), 0);
  const descuentoTotal = datosCliente.descuento;
  const totalFinal = Math.max(0, subtotal - descuentoTotal);

  // MODIFICADO: Siempre mostrar saldo igual al total (como si no se hubiera pagado nada)
  const calcularPagos = () => {
    // Para todos los tipos de pago, mostrar saldo = total (como si no se hubiera pagado)
    return { 
      abono: 0, // Siempre 0 en la tabla
      saldo: totalFinal // Siempre igual al total
    };
  };

  const { abono, saldo } = calcularPagos();

  // Handler para descargar el PDF
  const handleDownloadPDF = async () => {
    const itemsPDF: CotizacionItemPDF[] = cotizacionItems.map(item => ({
      id: item.id.toString(),
      name: `${item.productoNombre} - ${item.color_disenio}`,
      price: item.precio_venta,
      cantidad: item.cantidad
    }));

    const datosClientePDF: DatosClientePDF = {
      nombre: datosCliente.nombre,
      telefono: datosCliente.telefono,
      direccion: datosCliente.direccion,
      tipoPago: datosCliente.tipoPago as "contra-entrega" | "pago-adelantado" | "mitad-adelanto",
      vigencia: datosCliente.vigencia,
      descuento: datosCliente.descuento
    };

    await downloadCotizacionAsPDF({
      datosCliente: datosClientePDF,
      items: itemsPDF,
      subtotal,
      descuentoTotal,
      totalFinal,
      fecha: new Date().toLocaleDateString("es-BO"),
      logoUrl: "/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png",
      fileName: `Cotizacion_${(datosCliente.nombre || "cliente").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
    });
  };

  const generarCotizacion = async () => {
  if (cotizacionItems.length === 0) {
    toast({
      title: "Error",
      description: "Debe agregar al menos un producto",
      variant: "destructive"
    });
    return;
  }

  // VERIFICAR SI HAY ITEMS INVÁLIDOS (CANTIDAD 0)
  if (tieneItemsInvalidos) {
    toast({
      title: "Error",
      description: "Todos los productos deben tener al menos 1 unidad",
      variant: "destructive"
    });
    return;
  }

  const requiredFields = [datosCliente.nombre, datosCliente.telefono, datosCliente.tipoPago];
  if (datosCliente.tipoPago !== "pago-adelantado") {
    requiredFields.push(datosCliente.vigencia.toString());
  }
  
  if (requiredFields.some(field => !field)) {
    toast({
      title: "Error",
      description: datosCliente.tipoPago === "pago-adelantado" 
        ? "Debe completar nombre, teléfono y tipo de pago" 
        : "Debe completar nombre, teléfono, tipo de pago y vigencia",
      variant: "destructive"
    });
    return;
  }

  // SOLO guardar en BD si NO es contra entrega
  if (datosCliente.tipoPago !== "contra-entrega") {
    try {
      setLoading(true);
      
      // Mapear correctamente el tipo de pago al formato que espera el backend
      let tipoPagoBackend: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";

      if (datosCliente.tipoPago === "pago-adelantado") {
        tipoPagoBackend = "Pago por Adelantado";
      } else if (datosCliente.tipoPago === "mitad-adelanto") {
        tipoPagoBackend = "Mitad de Pago";
      } else {
        tipoPagoBackend = "Contra Entrega";
      }

      // MODIFICADO: Siempre guardar con abono = 0 y saldo = totalFinal
      const cotizacionRequest: CotizacionRequest = {
        vigencia: datosCliente.vigencia.toString(),
        cliente_nombre: datosCliente.nombre,
        cliente_telefono: datosCliente.telefono,
        cliente_direccion: datosCliente.direccion,
        tipo_pago: tipoPagoBackend,
        sub_total: subtotal,
        descuento: descuentoTotal,
        total: totalFinal,
        abono: 0,
        saldo: totalFinal, 
        items: cotizacionItems.map(item => ({
          idvariante: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_venta,
          subtotal_linea: item.precio_venta * item.cantidad
        }))
      };

      await createCotizacion(cotizacionRequest);
      
      // Mostrar alerta específica según el tipo de pago (SOLO para pago-adelantado y mitad-adelanto)
      let mensajeAlerta = "";
      if (datosCliente.tipoPago === "pago-adelantado") {
        mensajeAlerta = "Recuerde registrar el PAGO COMPLETO y los PRODUCTOS ENTREGADOS en la sección de Pagos Pendientes";
      } else if (datosCliente.tipoPago === "mitad-adelanto") {
        mensajeAlerta = "Recuerde registrar el PAGO PARCIAL y los PRODUCTOS ENTREGADOS en la sección de Pagos Pendientes";
      }
      
      toast({
        title: "Cotización guardada",
        description: "La cotización ha sido guardada",
      });
      
      // Mostrar alerta modal SOLO para pagos adelantados
      if (datosCliente.tipoPago === "pago-adelantado" || datosCliente.tipoPago === "mitad-adelanto") {
        setAlert({
          show: true,
          title: "⚠️ IMPORTANTE",
          message: mensajeAlerta
        });
      }
      
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la cotización",
        variant: "destructive"
      });
      return;
    } finally {
      setLoading(false);
    }
  } else {
    // Para contra entrega, solo mostrar mensaje de éxito sin guardar en BD
    toast({
      title: "Cotización generada",
      description: "La cotización ha sido generada exitosamente",
    });
  }

  setCotizacionGenerada(true);
};

  const nuevaCotizacion = () => {
    setCotizacionItems([]);
    setDatosCliente({
      nombre: "",
      telefono: "",
      direccion: "",
      tipoPago: "",
      vigencia: 0,
      descuento: 0
    });
    setCotizacionGenerada(false);
    
    // Enfocar el buscador al crear nueva cotización
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Funciones para buscar y cargar cotizaciones existentes
const buscarCotizacionesPorCliente = async (query?: string) => {
  const searchTerm = query || searchCotizacionQuery;
  
  // Si no hay término de búsqueda, no hacer nada
  if (!searchTerm.trim()) {
    setCotizacionesExistentes([]);
    return;
  }

  setLoadingCotizaciones(true);
  try {
    // Usar búsqueda desde el backend
    const cotizaciones = await searchCotizaciones(searchTerm);
    const cotizacionesFiltradas = cotizaciones.map(cot => ({
      idcotizacion: cot.idcotizacion,
      cliente_nombre: cot.cliente_nombre,
      cliente_telefono: cot.cliente_telefono,
      fecha_creacion: cot.fecha_creacion,
      total: cot.total
    }));
    
    setCotizacionesExistentes(cotizacionesFiltradas);
  } catch (error) {
    console.error("Error searching quotations:", error);
    // En caso de error, mostrar array vacío
    setCotizacionesExistentes([]);
    toast({
      title: "Error",
      description: "No se pudieron buscar las cotizaciones",
      variant: "destructive"
    });
  } finally {
    setLoadingCotizaciones(false);
  }
};
  const cargarCotizacionExistente = async (idcotizacion: number) => {
    setLoading(true);
    try {
      const { cotizacion, detalles } = await getCotizacionById(idcotizacion);
      
      // Mapear los detalles a items de cotización
      const items: CotizacionItem[] = detalles.map(detalle => ({
        id: detalle.idvariante,
        idproducto: 0, // No disponible en la respuesta actual
        nombre_variante: detalle.nombre_variante || "Producto",
        precio_venta: detalle.precio_unitario,
        precio_compra: 0,
        idcolor_disenio: 0,
        idcolor_luz: 0,
        idwatt: 0,
        idtamano: 0,
        stock: 0,
        stock_minimo: 0,
        estado: 0,
        color_disenio: detalle.color_disenio || "General",
        color_luz: "",
        watt: "",
        tamano: "",
        imagenes: [],
        cantidad: detalle.cantidad,
        productoNombre: detalle.producto_nombre || "Producto",
        productoDescripcion: "",
        selectedColor: detalle.color_disenio || "General"
      }));

      // Mapear tipo de pago del backend al frontend
      let tipoPagoFrontend: "contra-entrega" | "pago-adelantado" | "mitad-adelanto" | "" = "";
      if (cotizacion.tipo_pago === "Pago por Adelantado") {
        tipoPagoFrontend = "pago-adelantado";
      } else if (cotizacion.tipo_pago === "Mitad de Pago") {
        tipoPagoFrontend = "mitad-adelanto";
      } else if (cotizacion.tipo_pago === "Contra Entrega") {
        tipoPagoFrontend = "contra-entrega";
      }

      // Cargar directamente en estado de cotización generada
      setCotizacionItems(items);
      setDatosCliente({
        nombre: cotizacion.cliente_nombre,
        telefono: cotizacion.cliente_telefono,
        direccion: cotizacion.cliente_direccion,
        tipoPago: tipoPagoFrontend,
        vigencia: parseInt(cotizacion.vigencia) as 5 | 10 | 15 | 30 | 0,
        descuento: cotizacion.descuento
      });

      // Marcar como cotización generada para mostrar la vista de cotización completa
      setCotizacionGenerada(true);
      setShowCotizacionesDialog(false);
      setSearchCotizacionQuery("");
      
      toast({
        title: "Cotización cargada",
        description: `Se cargó la cotización de ${cotizacion.cliente_nombre}`,
      });
    } catch (error) {
      console.error("Error loading quotation:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la cotización",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const eliminarCotizacion = async (idcotizacion: number, nombreCliente: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar la cotización de ${nombreCliente}?`)) {
      return;
    }

    try {
      await deleteCotizacion(idcotizacion);
      
      // Actualizar la lista
      setCotizacionesExistentes(prev => 
        prev.filter(cot => cot.idcotizacion !== idcotizacion)
      );
      
      toast({
        title: "Cotización eliminada",
        description: "La cotización ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cotización",
        variant: "destructive"
      });
    }
  };

  const handleCotizacionSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchCotizacionQuery(e.target.value);
    // La búsqueda se ejecutará automáticamente por el efecto debounce
  };

  const handleOpenCotizacionesDialog = () => {
    setSearchCotizacionQuery(""); // Limpiar búsqueda al abrir
    setCotizacionesExistentes([]); // Limpiar resultados al abrir
    setShowCotizacionesDialog(true);
  };

  // Componente de Alerta Modal
  const AlertModal = () => {
    if (!alert.show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-lg">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
          </div>
          <p className="text-gray-700 mb-6">{alert.message}</p>
          <div className="flex justify-end">
            <Button
              onClick={() => setAlert({ show: false, title: "", message: "" })}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Aceptar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (cotizacionGenerada) {
    const fechaHoy = new Date().toLocaleDateString('es-BO');
    const fechaVigencia = new Date();
    fechaVigencia.setDate(fechaVigencia.getDate() + datosCliente.vigencia);

    return (
      <div className="space-y-6 p-4">
        {/* Alert Modal */}
        <AlertModal />
        
        {/* Área de impresión (oculta en vista normal) */}
        <div id="cotizacion-print" className="hidden">
          <div className="p-6">
            {/* Logo */}
            <div className="text-center mb-6">
              <img 
                src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
                alt="NEOLED Logo" 
                className="h-20 mx-auto mb-4"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/160x80/f3f4f6/000000?text=NEOLED+Logo";
                }}
              />
              <h1 className="text-2xl font-bold">COTIZACIÓN</h1>
            </div>

            {/* Información del cliente */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <p><strong>Fecha:</strong> {fechaHoy}</p>
                <p><strong>Cliente:</strong> {datosCliente.nombre}</p>
                <p><strong>Teléfono:</strong> {datosCliente.telefono}</p>
              </div>
              <div>
                <p><strong>Dirección:</strong> {datosCliente.direccion}</p>
                <p><strong>Tipo de Pago:</strong> 
                  {datosCliente.tipoPago === "contra-entrega" && " Contra Entrega"}
                  {datosCliente.tipoPago === "pago-adelantado" && " Pago por Adelantado"}
                  {datosCliente.tipoPago === "mitad-adelanto" && " Mitad de Adelanto"}
                </p>
                <p><strong>Vigencia:</strong> {datosCliente.vigencia} días (hasta {fechaVigencia.toLocaleDateString('es-BO')})</p>
              </div>
            </div>

            {/* Tabla de productos */}
            <table className="w-full border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Descripción</th>
                  <th className="border border-gray-300 p-2 text-center">Cantidad</th>
                  <th className="border border-gray-300 p-2 text-right">Precio Unitario</th>
                  <th className="border border-gray-300 p-2 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">
                      <div>
                        <p className="font-medium">{item.productoNombre} - {item.color_disenio}</p>
                        {/* SE ELIMINÓ LA DESCRIPCIÓN DEL PRODUCTO DE LA TABLA */}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{item.cantidad}</td>
                    <td className="border border-gray-300 p-2 text-right">Bs {formatBs(item.precio_venta)}</td>
                    <td className="border border-gray-300 p-2 text-right font-medium">Bs {formatBs(item.precio_venta * item.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Resumen de pagos */}
            <div className="float-right w-80 border border-gray-300 p-4">
              <h3 className="text-lg font-bold mb-3 border-b pb-2">Resumen de Pagos</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Bs {formatBs(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Descuento Total:</span>
                  <span>-Bs {formatBs(descuentoTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total:</span>
                  <span>Bs {formatBs(totalFinal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Abono:</span>
                  <span className="font-bold">Bs {formatBs(abono)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Saldo:</span>
                  <span className="font-bold">Bs {formatBs(saldo)}</span>
                </div>
              </div>
            </div>

            <div className="clear-both mt-32 pt-6 border-t border-gray-300">
              <p className="text-center text-sm text-gray-600">
                Gracias por su preferencia - NEOLED
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Cotización Generada
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleDownloadPDF} className="bg-green-600 text-white flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileText className="h-4 w-4" />
              Descargar PDF
            </Button>
            <Button onClick={nuevaCotizacion} variant="outline" className="w-full sm:w-auto">
              Nueva Cotización
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <div className="text-center mb-6">
            <img 
              src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
              alt="NEOLED Logo" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/128x64/f3f4f6/000000?text=NEOLED+Logo";
              }}
            />
          </div>

          {/* Título de Productos Cotizados */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">Productos Cotizados</h2>
          </div>

          {/* Vista responsiva para móviles */}
          <div className="block md:hidden space-y-4">
            {/* Información del cliente para móviles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Fecha:</span>
                    <p>{fechaHoy}</p>
                  </div>
                  <div>
                    <span className="font-medium">Cliente:</span>
                    <p>{datosCliente.nombre}</p>
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span>
                    <p>{datosCliente.telefono}</p>
                  </div>
                  <div>
                    <span className="font-medium">Dirección:</span>
                    <p className="truncate">{datosCliente.direccion}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo de Pago:</span>
                    <p>
                      {datosCliente.tipoPago === "contra-entrega" && "Contra Entrega"}
                      {datosCliente.tipoPago === "pago-adelantado" && "Pago por Adelantado"}
                      {datosCliente.tipoPago === "mitad-adelanto" && "Mitad de Adelanto"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Vigencia:</span>
                    <p>{datosCliente.vigencia} días</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productos para móviles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Productos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cotizacionItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div>
                      <h4 className="font-semibold text-sm">{item.productoNombre} - {item.color_disenio}</h4>
                      {/* SE ELIMINÓ LA DESCRIPCIÓN DEL PRODUCTO EN LA VISTA MÓVIL */}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Cantidad:</span>
                        <p>{item.cantidad}</p>
                      </div>
                      <div>
                        <span className="font-medium">Precio Unitario:</span>
                        <p>Bs {formatBs(item.precio_venta)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Valor Total:</span>
                        <p className="font-bold">Bs {formatBs(item.precio_venta * item.cantidad)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Resumen de pagos para móviles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Pagos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm">Bs {formatBs(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Descuento:</span>
                    <span className="text-sm text-red-600">-Bs {formatBs(descuentoTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary">Bs {formatBs(totalFinal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Abono:</span>
                    <span className="text-sm font-bold text-green-600">Bs {formatBs(abono)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Saldo:</span>
                    <span className="font-bold text-orange-600">Bs {formatBs(saldo)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vista para desktop */}
          <div className="hidden md:block space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Tipo de Pago</TableHead>
                        <TableHead>Vigencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{fechaHoy}</TableCell>
                        <TableCell>{datosCliente.nombre}</TableCell>
                        <TableCell>{datosCliente.telefono}</TableCell>
                        <TableCell className="max-w-xs truncate">{datosCliente.direccion}</TableCell>
                        <TableCell>
                          {datosCliente.tipoPago === "contra-entrega" && "Contra Entrega"}
                          {datosCliente.tipoPago === "pago-adelantado" && "Pago por Adelantado"}
                          {datosCliente.tipoPago === "mitad-adelanto" && "Mitad de Adelanto"}
                        </TableCell>
                        <TableCell>{datosCliente.vigencia} días (hasta {fechaVigencia.toLocaleDateString('es-BO')})</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                </div>
              </CardContent>
            </Card>

            {/* Resumen de Pagos debajo de la tabla */}
            <div className="flex justify-end">
              <div className="w-80">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de Pagos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Subtotal:</span>
                        <span className="font-medium">Bs {formatBs(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Descuento Total:</span>
                        <span className="font-medium text-red-600">-Bs {formatBs(descuentoTotal)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Total:</span>
                        <span className="text-lg font-bold text-primary">Bs {formatBs(totalFinal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Abono:</span>
                        <span className="font-bold text-green-600">Bs {formatBs(abono)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Saldo:</span>
                        <span className="font-bold text-orange-600">Bs {formatBs(saldo)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Alert Modal */}
      <AlertModal />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Generar Cotización</h1>
        </div>
        
        <Dialog open={showCotizacionesDialog} onOpenChange={setShowCotizacionesDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={handleOpenCotizacionesDialog}
            >
              <History className="h-4 w-4" />
              Buscar Cotizaciones
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Buscar Cotizaciones Existentes</DialogTitle>
              <DialogDescription>
                Escriba para buscar cotizaciones por nombre de cliente o teléfono
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchCotizacionQuery}
                  onChange={handleCotizacionSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingCotizaciones ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Buscando cotizaciones...</p>
                </div>
              ) : cotizacionesExistentes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchCotizacionQuery ? "No se encontraron cotizaciones" : "Escriba para buscar cotizaciones"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cotizacionesExistentes.map((cotizacion) => (
                    <div key={cotizacion.idcotizacion} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{cotizacion.cliente_nombre}</h4>
                        <p className="text-sm text-muted-foreground">
                          Teléfono: {cotizacion.cliente_telefono} | 
                          Fecha: {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-BO')} | 
                          Total: Bs {formatBs(cotizacion.total)}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => cargarCotizacionExistente(cotizacion.idcotizacion)}
                          className="flex-1 sm:flex-none"
                        >
                          Cargar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => eliminarCotizacion(cotizacion.idcotizacion, cotizacion.cliente_nombre)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Búsqueda y Productos - MEJORADO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Buscar Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nombre o descripción... (mín. 2 caracteres)"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onMouseDown={handleSearchMouseDown}
                className="pl-10"
                disabled={loading}
                autoFocus
              />
            </div>

            {loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Buscando productos...</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 space-y-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleProductExpansion(product.id)}
                      onMouseDown={(e) => e.preventDefault()} // Prevenir que quite el foco
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {/* IMAGEN SEGURA - CORREGIDA */}
                        {product.variantes && product.variantes.length > 0 && product.variantes[0].imagenes && product.variantes[0].imagenes.length > 0 ? (
                          <img
                            src={product.variantes[0].imagenes[0]}
                            alt={product.nombre}
                            className="w-16 h-16 rounded-md object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/80x80/f3f4f6/000000?text=Producto";
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Sin imagen</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{product.nombre}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {product.descripcion}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {product.variantes?.length || 0} variantes
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {product.nombre_ubicacion}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onMouseDown={(e) => e.preventDefault()} // Prevenir que quite el foco
                      >
                        {expandedProduct === product.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedProduct === product.id && product.variantes && product.variantes.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Seleccione una variante:
                        </p>
                        {product.variantes.map((variant) => (
                          <div 
                            key={variant.id} 
                            className="flex items-center gap-3 p-2 border rounded"
                            onMouseDown={(e) => e.preventDefault()} // Prevenir que quite el foco
                          >
                            <div className="flex-shrink-0">
                              {/* IMAGEN DE VARIANTE - CORREGIDA */}
                              {variant.imagenes && variant.imagenes.length > 0 ? (
                                <img
                                  src={variant.imagenes[0]}
                                  alt={variant.nombre_variante}
                                  className="w-12 h-12 rounded object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://via.placeholder.com/50x50/f3f4f6/000000?text=Variante";
                                  }}
                                />
                              ) : product.variantes && product.variantes[0]?.imagenes?.[0] ? (
                                <img
                                  src={product.variantes[0].imagenes[0]}
                                  alt={variant.nombre_variante}
                                  className="w-12 h-12 rounded object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://via.placeholder.com/50x50/f3f4f6/000000?text=Producto";
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">Sin img</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* TEXTO DEL DETALLE EN FORMATO ESPECÍFICO - PUNTO 1 */}
                              <div className="flex flex-wrap gap-1 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {variant.color_disenio}
                                </Badge>
                                {variant.color_luz && (
                                  <Badge variant="outline" className="text-xs">
                                    {variant.color_luz}
                                  </Badge>
                                )}
                                {variant.watt && (
                                  <Badge variant="outline" className="text-xs">
                                    {variant.watt}
                                  </Badge>
                                )}
                                {variant.tamano && (
                                  <Badge variant="outline" className="text-xs">
                                    {variant.tamano}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs font-medium">
                                Bs {formatBs(variant.precio_venta)} | Stock: {variant.stock}
                              </p>
                              <p className="text-xs text-muted-foreground break-words whitespace-normal leading-tight">
                                {variant.nombre_variante}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarVariante(product, variant);
                              }}
                              onMouseDown={(e) => e.preventDefault()} // Prevenir que quite el foco
                            >
                              Agregar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {expandedProduct === product.id && (!product.variantes || product.variantes.length === 0) && (
                      <div className="border-t pt-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            // Crear una variante por defecto si el producto no tiene variantes
                            const defaultVariant: Variante = {
                              id: product.id,
                              idproducto: product.id,
                              nombre_variante: product.nombre,
                              precio_venta: 0,
                              precio_compra: 0,
                              idcolor_disenio: 0,
                              idcolor_luz: 0,
                              idwatt: 0,
                              idtamano: 0,
                              stock: 0,
                              stock_minimo: 0,
                              estado: 0,
                              color_disenio: "General",
                              color_luz: "",
                              watt: "",
                              tamano: "",
                              imagenes: []
                            };
                            agregarVariante(product, defaultVariant);
                          }}
                          className="w-full"
                          onMouseDown={(e) => e.preventDefault()} // Prevenir que quite el foco
                        >
                          Agregar Producto
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de Cotización - CORREGIDO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Productos Agregados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cotizacionItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cotizacionItems.map((item, index) => (
                  <div key={`${item.id}-${item.color_disenio}`} className="border rounded-lg p-3 bg-card">
                    {/* Primera fila: Información del producto */}
                    <div className="flex items-start gap-3 mb-3">
                      {item.imagenes && item.imagenes.length > 0 ? (
                        <img
                          src={item.imagenes[0]}
                          alt={item.productoNombre}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/50x50/f3f4f6/000000?text=Producto";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">Sin img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm break-words whitespace-normal leading-tight">
                          {item.productoNombre} - {item.color_disenio}
                        </h5>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Bs {formatBs(item.precio_venta)} c/u
                        </p>
                      </div>
                    </div>
                    
                    {/* Segunda fila: Controles y total - PUNTO 2 (PERMITIR BORRAR CANTIDAD) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad === 0 ? "" : item.cantidad}
                          onChange={(e) => actualizarCantidadManual(index, e.target.value)}
                          onBlur={(e) => handleCantidadInputBlur(index, e.target.value)}
                          className="w-12 h-8 text-center text-sm font-medium number-input-no-scroll"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold whitespace-nowrap">
                          Bs {formatBs(item.precio_venta * item.cantidad)}
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={() => eliminarItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Bs {formatBs(subtotal)}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="descuento" className="text-sm whitespace-nowrap">Descuento (monto Bs):</Label>
                <Input
                  id="descuento"
                  type="number"
                  min="0"
                  step="0.01"
                  value={datosCliente.descuento || ""}
                  onChange={(e) => {
                    const descuento = Number(e.target.value) || 0;
                    setDatosCliente(prev => ({ ...prev, descuento: Math.min(descuento, subtotal) }));
                  }}
                  placeholder="0"
                  className="w-24 h-8 number-input-no-scroll"
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <span className="text-sm whitespace-nowrap">-Bs {formatBs(datosCliente.descuento)}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>Bs {formatBs(totalFinal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Datos del Cliente - MEJORADO PARA MÓVIL */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Cliente *</Label>
              <Input
                id="nombre"
                value={datosCliente.nombre}
                onChange={(e) => setDatosCliente(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ingrese el nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={datosCliente.telefono}
                onChange={(e) => setDatosCliente(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="Número de teléfono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={datosCliente.direccion}
                onChange={(e) => setDatosCliente(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección completa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoPago">Tipo de Pago *</Label>
              <Select value={datosCliente.tipoPago} onValueChange={(value: "contra-entrega" | "pago-adelantado" | "mitad-adelanto") => setDatosCliente(prev => ({ ...prev, tipoPago: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contra-entrega">Contra Entrega</SelectItem>
                  <SelectItem value="pago-adelantado">Pago por Adelantado</SelectItem>
                  <SelectItem value="mitad-adelanto">Mitad de Adelanto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datosCliente.tipoPago !== "pago-adelantado" && (
              <div className="space-y-2">
                <Label htmlFor="vigencia">Vigencia *</Label>
                <Select value={datosCliente.vigencia.toString()} onValueChange={(value) => setDatosCliente(prev => ({ ...prev, vigencia: parseInt(value) as 5 | 10 | 15 | 30 }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione vigencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 días</SelectItem>
                    <SelectItem value="10">10 días</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end md:col-span-1 lg:col-span-1">
              <Button 
                onClick={generarCotizacion} 
                className="w-full"
                disabled={cotizacionItems.length === 0 || loading || tieneItemsInvalidos}
              >
                {loading ? "Generando..." : 
                 tieneItemsInvalidos ? "Cantidades inválidas" : 
                 "Generar Cotización"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 