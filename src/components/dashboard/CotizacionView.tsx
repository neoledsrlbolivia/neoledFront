import React, { useState, useEffect, useRef, useCallback } from "react";
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

const WhatsappIcon = ({ className = "w-4 h-4" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.464"/>
  </svg>
);

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
  uniqueId: string; // ID único para evitar problemas con keys
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

// Error Boundary para capturar errores
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error en CotizacionView:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">Algo salió mal</h2>
          <p className="text-gray-600 mt-2">Por favor, recarga la página</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Recargar Página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Función helper para formatear el nombre del producto
const formatProductName = (productName: string, color?: string) => {
  if (!color || color === "" || color === "General") {
    return productName;
  }
  return `${productName} - ${color}`;
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
  const itemCounterRef = useRef(0);

  // Usar el hook de debounce para la búsqueda de productos
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  // Usar el hook de debounce para la búsqueda de cotizaciones
  const debouncedCotizacionSearchQuery = useDebounce(searchCotizacionQuery, 1000);

  // Efecto para manejar la búsqueda de productos con debounce
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
      setCotizacionesExistentes([]);
    }
  }, [debouncedCotizacionSearchQuery, showCotizacionesDialog]);

  // Función para generar ID único
  const generateUniqueId = () => {
    itemCounterRef.current += 1;
    return `item-${Date.now()}-${itemCounterRef.current}`;
  };

  // MÉTODO DE BÚSQUEDA
  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;
    
    isSearchingRef.current = true;
    setLoading(true);
    
    try {
      const results = await searchProductos(query);
      setSearchResults(results);
      
      // Mantener el foco después de la búsqueda
      setTimeout(() => {
        if (searchInputRef.current) {
          const currentPosition = searchInputRef.current.selectionStart;
          searchInputRef.current.focus();
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

  // HANDLERS DE BÚSQUEDA
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
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
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSearchMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleProductExpansion = useCallback((productId: number) => {
    setExpandedProduct(prev => prev === productId ? null : productId);
    
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 10);
  }, []);

  const agregarVariante = useCallback((product: Producto, variante: Variante) => {
    const nuevoItem: CotizacionItem = {
      ...variante,
      cantidad: 1,
      productoNombre: product.nombre,
      productoDescripcion: product.descripcion,
      selectedColor: variante.color_disenio,
      uniqueId: generateUniqueId() // Agregar ID único
    };

    setCotizacionItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => 
        item.id === variante.id && item.color_disenio === variante.color_disenio
      );

      if (existingIndex !== -1) {
        const newItems = [...prevItems];
        newItems[existingIndex].cantidad += 1;
        return newItems;
      } else {
        return [...prevItems, nuevoItem];
      }
    });

    setSearchQuery("");
    setSearchResults([]);
    setExpandedProduct(null);
    
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }, 50);
    
    toast({
      title: "Producto agregado",
      description: `${formatProductName(product.nombre, variante.color_disenio)} agregado a la cotización`,
    });
  }, [toast]);

  // ACTUALIZAR CANTIDAD - Función segura
  const actualizarCantidad = useCallback((uniqueId: string, nuevaCantidad: number) => {
    setCotizacionItems(prevItems => 
      prevItems.map(item => 
        item.uniqueId === uniqueId 
          ? { ...item, cantidad: Math.max(0, nuevaCantidad) }
          : item
      )
    );
  }, []);

  // MANEJADOR DE CAMBIO MANUAL
  const actualizarCantidadManual = useCallback((uniqueId: string, cantidad: string) => {
    if (cantidad === "") {
      actualizarCantidad(uniqueId, 0);
      return;
    }
    
    const nuevaCantidad = parseInt(cantidad);
    if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
      actualizarCantidad(uniqueId, nuevaCantidad);
    }
  }, [actualizarCantidad]);

  // MANEJADOR BLUR - RESTAURAR A 1 SI ESTÁ VACÍO
  const handleCantidadInputBlur = useCallback((uniqueId: string, value: string) => {
    if (value === "" || parseInt(value) === 0) {
      actualizarCantidad(uniqueId, 1);
    }
  }, [actualizarCantidad]);

  const eliminarItem = useCallback((uniqueId: string) => {
    setCotizacionItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueId));
  }, []);

  // VERIFICAR SI HAY ITEMS CON CANTIDAD 0
  const tieneItemsInvalidos = cotizacionItems.some(item => item.cantidad < 1);

  const subtotal = cotizacionItems.reduce((total, item) => total + (item.precio_venta * item.cantidad), 0);
  const descuentoTotal = datosCliente.descuento;
  const totalFinal = Math.max(0, subtotal - descuentoTotal);

  // MODIFICADO: Siempre mostrar saldo igual al total
  const calcularPagos = useCallback(() => {
    return { 
      abono: 0,
      saldo: totalFinal
    };
  }, [totalFinal]);

  const { abono, saldo } = calcularPagos();

  // Handler para descargar el PDF
  const handleDownloadPDF = async () => {
    const itemsPDF: CotizacionItemPDF[] = cotizacionItems.map(item => ({
      id: item.id.toString(),
      name: formatProductName(item.productoNombre, item.color_disenio),
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
        
        let tipoPagoBackend: "Pago por Adelantado" | "Mitad de Pago" | "Contra Entrega";

        if (datosCliente.tipoPago === "pago-adelantado") {
          tipoPagoBackend = "Pago por Adelantado";
        } else if (datosCliente.tipoPago === "mitad-adelanto") {
          tipoPagoBackend = "Mitad de Pago";
        } else {
          tipoPagoBackend = "Contra Entrega";
        }

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
      toast({
        title: "Cotización generada",
        description: "La cotización ha sido generada exitosamente",
      });
    }

    setCotizacionGenerada(true);
  };

  const nuevaCotizacion = useCallback(() => {
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
    
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, []);

  // Funciones para buscar y cargar cotizaciones existentes
  const buscarCotizacionesPorCliente = async (query?: string) => {
    const searchTerm = query || searchCotizacionQuery;
    
    if (!searchTerm.trim()) {
      setCotizacionesExistentes([]);
      return;
    }

    setLoadingCotizaciones(true);
    try {
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
        idproducto: 0,
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
        color_disenio: detalle.color_disenio || "",
        color_luz: "",
        watt: "",
        tamano: "",
        imagenes: [],
        cantidad: detalle.cantidad,
        productoNombre: detalle.producto_nombre || "Producto",
        productoDescripcion: "",
        selectedColor: detalle.color_disenio || "",
        uniqueId: generateUniqueId() // ID único para cada item
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
  };

  const handleOpenCotizacionesDialog = () => {
    setSearchCotizacionQuery("");
    setCotizacionesExistentes([]);
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
      <ErrorBoundary>
        <div className="space-y-6 p-4">
          <AlertModal />
          
          {/* Área de impresión (oculta en vista normal) */}
          <div id="cotizacion-print" className="hidden">
            <div className="p-6">
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
                  {cotizacionItems.map((item) => (
                    <tr key={item.uniqueId}>
                      <td className="border border-gray-300 p-2">
                        <div>
                          <p className="font-medium">{formatProductName(item.productoNombre, item.color_disenio)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.productoDescripcion}
                          </p>
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2 text-center">{item.cantidad}</td>
                      <td className="border border-gray-300 p-2 text-right">Bs {formatBs(item.precio_venta)}</td>
                      <td className="border border-gray-300 p-2 text-right font-medium">Bs {formatBs(item.precio_venta * item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
            <div className="flex justify-end">
              <div className="space-y-4 text-right">
                <div className="text-rigth">
                  <img 
                    src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
                    alt="NEOLED Logo" 
                    className="h-16 mx-auto"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/128x64/f3f4f6/000000?text=NEOLED+Logo";
                    }}
                  />
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm text-gray-800 font-medium">
                    Av. Heroinas esq. Hamiraya #316
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <WhatsappIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-800 font-medium">
                          77918672 - 77950297
                    </span>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Productos Cotizados</h2>
            </div>

            {/* Vista responsiva para móviles */}
            <div className="block md:hidden space-y-4">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cotizacionItems.map((item) => (
                    <div key={item.uniqueId} className="border rounded-lg p-3 space-y-2">
                      <div>
                        <h4 className="font-semibold text-sm">{formatProductName(item.productoNombre, item.color_disenio)}</h4>
                        <p className="text-xs text-muted-foreground">{item.productoDescripcion}</p>
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

            {/* Vista para desktop - MODIFICADO: Resumen integrado en la misma tabla */}
            <div className="hidden md:block space-y-6">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {/* Tabla de información del cliente */}
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

                    {/* Tabla de productos */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead colSpan={3}>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Valor Unitario</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cotizacionItems.map((item) => (
                          <TableRow key={item.uniqueId}>
                            <TableCell colSpan={3}>
                              <div>
                                <p className="font-medium">{formatProductName(item.productoNombre, item.color_disenio)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.cantidad}</TableCell>
                            <TableCell className="text-right">Bs {formatBs(item.precio_venta)}</TableCell>
                            <TableCell className="text-right font-medium">Bs {formatBs(item.precio_venta * item.cantidad)}</TableCell>
                          </TableRow>
                        ))}

                        {/* Fila de Subtotal - Integrada en la tabla */}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={3} className="bg-gray-50 font-medium">
                            Subtotal
                          </TableCell>
                          <TableCell className="text-center bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50 font-medium">
                            Bs {formatBs(subtotal)}
                          </TableCell>
                        </TableRow>

                        {/* Fila de Descuento - Solo si hay descuento */}
                        {descuentoTotal > 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="font-medium text-red-600">
                              Descuento
                            </TableCell>
                            <TableCell className="text-center"></TableCell>
                            <TableCell className="text-right"></TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              -Bs {formatBs(descuentoTotal)}
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Fila de Total - Integrada en la tabla */}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={3} className="bg-gray-50 font-bold">
                            Total
                          </TableCell>
                          <TableCell className="text-center bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50 font-bold">
                            Bs {formatBs(totalFinal)}
                          </TableCell>
                        </TableRow>

                        {/* Línea de separación */}
                        <TableRow>
                          <TableCell colSpan={6} className="border-t-2 border-gray-300 h-2"></TableCell>
                        </TableRow>

                        {/* Fila de Abono - Integrada en la tabla */}
                        <TableRow>
                          <TableCell colSpan={3} className="bg-gray-50 font-medium">
                            Abono
                          </TableCell>
                          <TableCell className="text-center bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50 font-medium">
                            Bs {formatBs(abono)}
                          </TableCell>
                        </TableRow>

                        {/* Fila de Saldo - Integrada en la tabla */}
                        <TableRow>
                          <TableCell colSpan={3} className="bg-gray-50 font-medium">
                            Saldo
                          </TableCell>
                          <TableCell className="text-center bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50"></TableCell>
                          <TableCell className="text-right bg-gray-50 font-medium">
                            Bs {formatBs(saldo)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4">
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
          {/* Panel de Búsqueda y Productos */}
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
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <div className="flex items-start gap-3 flex-1">
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
                          onMouseDown={(e) => e.preventDefault()}
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
                              key={`${variant.id}-${variant.color_disenio}`} 
                              className="flex items-center gap-3 p-2 border rounded"
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              <div className="flex-shrink-0">
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
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {variant.color_disenio && variant.color_disenio !== "General" && (
                                    <Badge variant="secondary" className="text-xs">
                                      {variant.color_disenio}
                                    </Badge>
                                  )}
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
                                onMouseDown={(e) => e.preventDefault()}
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
                                color_disenio: "",
                                color_luz: "",
                                watt: "",
                                tamano: "",
                                imagenes: []
                              };
                              agregarVariante(product, defaultVariant);
                            }}
                            className="w-full"
                            onMouseDown={(e) => e.preventDefault()}
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

          {/* Panel de Cotización */}
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
                  {cotizacionItems.map((item) => (
                    <div key={item.uniqueId} className="border rounded-lg p-3 bg-card">
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
                            {formatProductName(item.productoNombre, item.color_disenio)}
                          </h5>
                          <p className="text-sm font-medium text-green-600 mt-1">
                            Bs {formatBs(item.precio_venta)} c/u
                          </p>
                        </div>
                      </div>
                      
                      {/* Segunda fila: Controles y total */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => actualizarCantidad(item.uniqueId, item.cantidad - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.cantidad === 0 ? "" : item.cantidad}
                            onChange={(e) => actualizarCantidadManual(item.uniqueId, e.target.value)}
                            onBlur={(e) => handleCantidadInputBlur(item.uniqueId, e.target.value)}
                            className="w-12 h-8 text-center text-sm font-medium number-input-no-scroll"
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => actualizarCantidad(item.uniqueId, item.cantidad + 1)}
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
                            onClick={() => eliminarItem(item.uniqueId)}
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

        {/* Datos del Cliente */}
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
    </ErrorBoundary>
  );
}