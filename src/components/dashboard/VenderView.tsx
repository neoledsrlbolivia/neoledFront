import { useState, useRef, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { searchProducts, getCashStatus, processSale, type Product, type Variant, type SaleRequest } from "@/api/SalesApi";
import { getUserId, getCurrentUser } from "@/api/AuthApi";

interface SaleItem extends Variant {
  cantidad: number;
  selectedColor?: string;
  ubicacion?: string;
}

const formatBs = (value: number) => {
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2);
};

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

export function VenderView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [ventaItems, setVentaItems] = useState<SaleItem[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "QR">("Efectivo");
  const [montoPagado, setMontoPagado] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cartRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);

  const currentUser = getCurrentUser();
  const username = currentUser?.nombres || "Usuario";
  const userId = getUserId();

  // Usar el hook de debounce para la búsqueda
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  useEffect(() => {
    loadCashStatus();
  }, []);

  // Efecto para manejar la búsqueda con debounce
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

  const loadCashStatus = async () => {
    try {
      const status = await getCashStatus();
      setCajaAbierta(status.estado === "abierta");
    } catch (error) {
      console.error("Error loading cash status:", error);
      setCajaAbierta(false);
    }
  };

  const performSearch = async (query: string) => {
    if (isSearchingRef.current) return;
    
    isSearchingRef.current = true;
    setLoading(true);
    
    try {
      const results = await searchProducts(query);
      setSearchResults(results);
      
      // Ocultar el teclado después de la búsqueda (especialmente importante en móvil)
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si presiona Enter, ocultar el teclado
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
  };

  const handleSearchFocus = () => {
    // Solo para debugging, puedes comentar esto después
    console.log("Search input focused manually");
  };

  const toggleProductExpansion = (productId: number) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
    
    // Asegurarse de que el teclado esté oculto cuando se expanden/contraen las variantes
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const agregarVariante = (variant: Variant, product: Product) => {
    const ubicaciones = ["Estante 1", "Estante 2", "Estante 3", "Almacén A", "Almacén B"];
    const ubicacionAleatoria = ubicaciones[Math.floor(Math.random() * ubicaciones.length)];
    
    const nuevoItem: SaleItem = {
      ...variant,
      cantidad: 1,
      selectedColor: variant.color_disenio,
      ubicacion: ubicacionAleatoria
    };

    const existingIndex = ventaItems.findIndex(item => 
      item.idvariante === variant.idvariante
    );

    if (existingIndex !== -1) {
      const newItems = [...ventaItems];
      if (newItems[existingIndex].cantidad < variant.stock) {
        newItems[existingIndex].cantidad += 1;
        setVentaItems(newItems);
      } else {
        toast({
          title: "Stock insuficiente",
          description: `No hay suficiente stock para ${product.nombre} - ${variant.nombre_variante}`,
          variant: "destructive"
        });
        return;
      }
    } else {
      if (variant.stock > 0) {
        setVentaItems([...ventaItems, nuevoItem]);
      } else {
        toast({
          title: "Sin stock",
          description: `${product.nombre} - ${variant.nombre_variante} no tiene stock disponible`,
          variant: "destructive"
        });
        return;
      }
    }

    setSearchQuery("");
    setSearchResults([]);
    setExpandedProduct(null);
    
    // Ocultar el teclado después de agregar un producto
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    
    if (isMobile && cartRef.current) {
      setTimeout(() => {
        cartRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
    
    toast({
      title: "Producto agregado",
      description: `${product.nombre} - ${variant.nombre_variante} agregado a la venta`,
    });
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) {
      // Si es menor a 1, eliminar el producto
      eliminarItem(index);
      return;
    }
    
    const item = ventaItems[index];
    if (nuevaCantidad > item.stock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.stock} unidades disponibles`,
        variant: "destructive"
      });
      return;
    }
    
    const newItems = [...ventaItems];
    newItems[index].cantidad = nuevaCantidad;
    setVentaItems(newItems);
  };

  const handleCantidadInputChange = (index: number, value: string) => {
    // Si el campo está vacío, poner 0 internamente (para bloquear el botón) pero mostrar vacío
    if (value === "") {
      const newItems = [...ventaItems];
      newItems[index].cantidad = 0; // Poner 0 internamente
      setVentaItems(newItems);
      return;
    }
    
    const numericValue = parseInt(value);
    if (isNaN(numericValue) || numericValue < 1) {
      return; // No actualizar si no es un número válido
    }
    
    const item = ventaItems[index];
    if (numericValue > item.stock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.stock} unidades disponibles`,
        variant: "destructive"
      });
      return;
    }
    
    const newItems = [...ventaItems];
    newItems[index].cantidad = numericValue;
    setVentaItems(newItems);
  };

  const handleCantidadInputBlur = (index: number, value: string) => {
    // Cuando pierde el foco, si está vacío o es 0, volver a 1
    if (value === "" || parseInt(value) === 0) {
      const newItems = [...ventaItems];
      newItems[index].cantidad = 1;
      setVentaItems(newItems);
    }
  };

  const eliminarItem = (index: number) => {
    const newItems = ventaItems.filter((_, i) => i !== index);
    setVentaItems(newItems);
  };

  const subtotal = ventaItems.reduce((total, item) => total + (item.precio_venta * item.cantidad), 0);
  const total = Math.max(0, subtotal - descuento);
  const cambio = metodoPago === "Efectivo" ? Math.max(0, montoPagado - total) : 0;

  // Verificar si hay algún item con cantidad 0
  const tieneItemsInvalidos = ventaItems.some(item => item.cantidad < 1);

  const procesarVenta = async () => {
    if (!cajaAbierta) {
      toast({
        title: "Caja Cerrada",
        description: "No se puede procesar la venta. La caja está cerrada.",
        variant: "destructive"
      });
      return;
    }

    if (ventaItems.length === 0) {
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

    if (metodoPago === "Efectivo" && montoPagado > 0 && montoPagado < total) {
      toast({
        title: "Error", 
        description: "El monto pagado es insuficiente",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "No se encontró información del usuario. Por favor, inicie sesión nuevamente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const descripcion = ventaItems.map(item => 
        `${item.cantidad} ${item.nombre_variante} - Bs ${formatBs(item.precio_venta)}`
      ).join(", ");

      const items = ventaItems.map(item => ({
        idvariante: item.idvariante,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        subtotal_linea: item.precio_venta * item.cantidad
      }));

      const saleRequest: SaleRequest = {
        descripcion: descripcion.length > 200 ? descripcion.substring(0, 200) + "..." : descripcion,
        sub_total: subtotal,
        descuento: descuento,
        total: total,
        metodo_pago: metodoPago,
        items: items
      };

      await processSale(saleRequest, userId);

      setVentaItems([]);
      setDescuento(0);
      setMontoPagado(0);
      setShowConfirm(false);
      
      toast({
        title: "¡Venta procesada!",
        description: `Venta completada por Bs. ${formatBs(total)}`,
      });

      await loadCashStatus();

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la venta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de Bienvenida */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <h2 className="text-2xl font-bold text-primary">¡Bienvenido, {username}!</h2>
        <p className="text-muted-foreground">Sistema de punto de venta NEOLED</p>
        <div className="mt-2">
          <Badge variant={cajaAbierta ? "default" : "destructive"}>
            Caja: {cajaAbierta ? "Abierta" : "Cerrada"}
          </Badge>
          {currentUser && (
            <Badge variant="outline" className="ml-2">
              {currentUser.rol}
            </Badge>
          )}
        </div>
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
                onFocus={handleSearchFocus}
                className="pl-10"
                disabled={loading}
                autoFocus={false} // No enfocar automáticamente
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
                  <div key={product.idproducto} className="border rounded-lg p-4 space-y-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleProductExpansion(product.idproducto)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {product.variantes[0]?.imagenes?.[0] ? (
                          <img
                            src={`data:image/jpeg;base64,${product.variantes[0].imagenes[0]}`}
                            alt={product.nombre}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Sin imagen</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm ${isMobile ? 'break-words' : ''}`}>
                            {product.nombre}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {product.descripcion}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {product.variantes.length} variantes
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
                      >
                        {expandedProduct === product.idproducto ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedProduct === product.idproducto && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Seleccione una variante:
                        </p>
                        {product.variantes.map((variant) => (
                          <div 
                            key={variant.idvariante} 
                            className="flex items-center gap-3 p-2 border rounded"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap gap-1 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {variant.color_disenio}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {variant.color_luz}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {variant.watt}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {variant.tamano}
                                </Badge>
                              </div>
                              <p className="text-xs font-medium">
                                Bs {formatBs(variant.precio_venta)} | Stock: {variant.stock}
                              </p>
                              <p className={`text-xs text-muted-foreground ${isMobile ? 'break-words' : ''}`}>
                                {variant.nombre_variante}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => agregarVariante(variant, product)}
                              disabled={variant.stock === 0}
                            >
                              {variant.stock === 0 ? "Sin Stock" : "Agregar"}
                            </Button>
                          </div>
                        ))}
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

        {/* Panel de Venta */}
        <Card className="lg:col-span-1" ref={cartRef}>
          <CardHeader>
            <CardTitle>Detalle de Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ventaItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay productos agregados
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ventaItems.map((item, index) => (
                  <div key={item.idvariante} className="border rounded-lg p-3 bg-card">
                    {/* Primera fila: Información del producto */}
                    <div className="flex items-start gap-3 mb-3">
                      {item.imagenes?.[0] ? (
                        <img
                          src={`data:image/jpeg;base64,${item.imagenes[0]}`}
                          alt={item.nombre_variante}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">Sin img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm break-words whitespace-normal leading-tight">
                          {item.nombre_variante}
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
                          onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.cantidad === 0 ? "" : item.cantidad}
                          onChange={(e) => handleCantidadInputChange(index, e.target.value)}
                          onBlur={(e) => handleCantidadInputBlur(index, e.target.value)}
                          className="w-12 h-8 text-center text-sm font-medium number-input-no-scroll"
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
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

            {/* Totales */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Bs {formatBs(subtotal)}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="descuento" className="text-sm whitespace-nowrap">Descuento (Bs):</Label>
                <Input
                  id="descuento"
                  type="number"
                  min="0"
                  step="0.01"
                  value={descuento || ""}
                  onChange={(e) => setDescuento(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 h-8 number-input-no-scroll"
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <span className="text-sm whitespace-nowrap">-Bs {formatBs(descuento)}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>Bs {formatBs(total)}</span>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-3">
              <Label>Método de Pago:</Label>
              <RadioGroup value={metodoPago} onValueChange={(value: "Efectivo" | "QR") => setMetodoPago(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Efectivo" id="efectivo" />
                  <Label htmlFor="efectivo">Efectivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="QR" id="qr" />
                  <Label htmlFor="qr">QR</Label>
                </div>
              </RadioGroup>

              {metodoPago === "Efectivo" && (
                <div className="space-y-2">
                  <Label htmlFor="montoPagado">Monto Pagado (opcional para calcular cambio):</Label>
                  <Input
                    id="montoPagado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoPagado || ""}
                    onChange={(e) => setMontoPagado(Number(e.target.value) || 0)}
                    placeholder="Ingrese el monto pagado"
                    className="number-input-no-scroll"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {montoPagado > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Cambio: Bs {formatBs(cambio)}</span>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === "QR" && (
                <div className="text-center">
                  <div className="w-64 h-64 bg-white rounded-lg mx-auto flex items-center justify-center border-2 border-primary/20">
                    <img 
                      src="/qr.jpg" 
                      alt="Código QR para pago" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Escanea el código QR para pagar
                  </p>
                </div>
              )}
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={ventaItems.length === 0 || !cajaAbierta || tieneItemsInvalidos}
                >
                  {!cajaAbierta ? "Caja Cerrada" : 
                   tieneItemsInvalidos ? "Cantidades inválidas" : 
                   "Procesar Venta"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Venta</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de procesar esta venta por Bs {formatBs(total)}?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={procesarVenta}
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Confirmar Venta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}