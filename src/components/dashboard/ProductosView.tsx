// src/pages/admin/ProductosView.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Package, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormularioProductos } from "./FormularioProductos";
import {
  getColoresDiseno,
  getColoresLuz,
  getWatts,
  getTamanos,
  getUbicaciones,
  getCategorias,
  getTipos,
  getProductos,
  deleteProducto,
  updateStockVariante,
  Producto
} from "@/api/ProductsApi";

interface StockFormData {
  stockActual: number;
  cantidadAñadir: string;
  varianteId: number;
  varianteNombre: string;
}

// Componente para el carrusel de imágenes
interface ImageCarouselProps {
  images: string[];
  productName: string;
  className?: string;
}

function ImageCarousel({ images, productName, className = "" }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Si no hay imágenes, mostrar placeholder
  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <Package className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  // Navegación automática cada 3 segundos
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      {/* Imagen principal */}
      <div className="relative aspect-square w-full">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
          }}
        />
        
        {/* Controles de navegación */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Indicadores */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Contador de imágenes */}
      {images.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

export function ProductosView() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [currentStockProduct, setCurrentStockProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para las opciones desde la API
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [coloresDiseno, setColoresDiseno] = useState<string[]>([]);
  const [coloresLuz, setColoresLuz] = useState<string[]>([]);
  const [watts, setWatts] = useState<string[]>([]);
  const [tamaños, setTamaños] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [tiposProducto, setTiposProducto] = useState<string[]>([]);

  // Cargar búsqueda desde inventario si existe
  useEffect(() => {
    const searchFromInventory = sessionStorage.getItem('searchProductName');
    if (searchFromInventory) {
      setSearchTerm(searchFromInventory);
      sessionStorage.removeItem('searchProductName');
    }
  }, []);

  const userRole = localStorage.getItem("userRole") || "admin";
  const isAssistant = userRole === "Asistente";

  const [stockFormData, setStockFormData] = useState<StockFormData>({
    stockActual: 0,
    cantidadAñadir: "",
    varianteId: 0,
    varianteNombre: ""
  });
  const { toast } = useToast();

  // Cargar datos desde la API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          ubicacionesData,
          coloresDisenoData,
          coloresLuzData,
          wattsData,
          tamanosData,
          categoriasData,
          tiposData,
          productosData
        ] = await Promise.all([
          getUbicaciones(),
          getColoresDiseno(),
          getColoresLuz(),
          getWatts(),
          getTamanos(),
          getCategorias(),
          getTipos(),
          getProductos()
        ]);

        setUbicaciones(ubicacionesData.map(item => item.nombre));
        setColoresDiseno(coloresDisenoData.map(item => item.nombre));
        setColoresLuz(coloresLuzData.map(item => item.nombre));
        setWatts(wattsData.map(item => item.nombre));
        setTamaños(tamanosData.map(item => item.nombre));
        setCategorias(categoriasData.map(item => item.nombre));
        setTiposProducto(tiposData.map(item => item.nombre));
        setProducts(productosData);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(product =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.categorias.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.tipos.some(tipo => tipo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, products]);

  const productsToShow = showAllProducts ? products : filteredProducts;

  const handleEdit = (product: Producto) => {
    if (isAssistant) return; // Asistentes no pueden editar
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleIncreaseStock = (product: Producto, variante: any) => {
    setCurrentStockProduct(product);
    setStockFormData({
      stockActual: variante.stock,
      cantidadAñadir: "",
      varianteId: variante.idvariante,
      varianteNombre: variante.nombre_variante
    });
    setIsStockFormOpen(true);
  };

  const handleStockSubmit = async () => {
    try {
      await updateStockVariante(
        stockFormData.varianteId,
        parseInt(stockFormData.cantidadAñadir || "0")
      );

      const newTotal = stockFormData.stockActual + parseInt(stockFormData.cantidadAñadir || "0");
      toast({
        title: "Stock actualizado",
        description: `Stock de ${currentStockProduct?.nombre} - ${stockFormData.varianteNombre} aumentado a ${newTotal} unidades.`,
      });

      // Recargar productos para actualizar la vista
      const productosData = await getProductos();
      setProducts(productosData);

      setIsStockFormOpen(false);
      setStockFormData({
        stockActual: 0,
        cantidadAñadir: "",
        varianteId: 0,
        varianteNombre: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (productId: number, productName: string) => {
    if (isAssistant) return; // Asistentes no pueden eliminar
    
    try {
      await deleteProducto(productId);
      toast({
        title: "Producto eliminado",
        description: `${productName} ha sido eliminado.`,
        variant: "destructive",
      });

      // Recargar productos
      const productosData = await getProductos();
      setProducts(productosData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  };

  const handleFormSubmit = async (productData: any, isEditing: boolean) => {
    try {
      const action = isEditing ? "editado" : "agregado";
      toast({
        title: `Producto ${action}`,
        description: `${productData.nombre} ha sido ${action} exitosamente.`,
      });

      // Recargar productos
      const productosData = await getProductos();
      setProducts(productosData);

      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? "editar" : "agregar"} el producto`,
        variant: "destructive"
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const getTotalStock = (variantes: any[]) => {
    return variantes.reduce((sum, variant) => sum + variant.stock, 0);
  };

  // Obtener todas las imágenes de todas las variantes de un producto
  const getAllProductImages = useCallback((product: Producto): string[] => {
    const allImages: string[] = [];
    product.variantes.forEach(variante => {
      if (variante.imagenes && variante.imagenes.length > 0) {
        allImages.push(...variante.imagenes);
      }
    });
    return allImages.slice(0, 10); // Limitar a 10 imágenes máximo
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {isAssistant ? "Visualización de Productos" : "Gestión de Productos"}
        </h1>
        {!isAssistant && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full md:w-auto flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar Producto</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}</DialogTitle>
              </DialogHeader>
              <FormularioProductos
                product={editingProduct}
                ubicaciones={ubicaciones}
                categorias={categorias}
                tiposProducto={tiposProducto}
                coloresDiseno={coloresDiseno}
                coloresLuz={coloresLuz}
                watts={watts}
                tamaños={tamaños}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog para aumentar stock */}
      <Dialog open={isStockFormOpen} onOpenChange={setIsStockFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aumentar Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Producto: {currentStockProduct?.nombre}</div>
              <div className="text-sm font-medium">Variante: {stockFormData.varianteNombre}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Stock actual</div>
              <Input value={stockFormData.stockActual} disabled />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Cantidad a añadir</div>
              <Input
                type="number"
                value={stockFormData.cantidadAñadir}
                onChange={(e) => setStockFormData(prev => ({ ...prev, cantidadAñadir: e.target.value }))}
                placeholder="0"
                className="number-input-no-scroll"
                onWheel={(e) => e.currentTarget.blur()}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Total después del aumento</div>
              <Input
                value={stockFormData.stockActual + parseInt(stockFormData.cantidadAñadir || "0")}
                disabled
                className="font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStockSubmit}
              className="bg-primary hover:bg-primary/90"
              disabled={!stockFormData.cantidadAñadir || parseInt(stockFormData.cantidadAñadir) <= 0}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Productos ({products.length})</CardTitle>
          <Button
            variant="outline"
            onClick={() => setShowAllProducts(!showAllProducts)}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <Eye className="h-4 w-4" />
            {showAllProducts ? "Ocultar productos" : "Ver todos los productos"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos por nombre, categoría o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {(searchTerm || showAllProducts) && productsToShow.length > 0 && (
            <>
              {/* Vista móvil - Cards */}
              <div className="block md:hidden space-y-3 w-full overflow-hidden">
                {productsToShow.map((product) => {
                  const totalStock = getTotalStock(product.variantes);
                  const allImages = getAllProductImages(product);

                  return (
                    <Card key={product.idproducto} className="p-3 w-full">
                      <div className="space-y-2 w-full">
                        <div className="flex items-start gap-3 w-full">
                          {/* Carrusel de imágenes */}
                          <div className="flex-shrink-0 w-24 h-24">
                            <ImageCarousel
                              images={allImages}
                              productName={product.nombre}
                              className="w-24 h-24"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-medium text-sm leading-tight line-clamp-2 break-words">{product.nombre}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.categorias.map((categoria, index) => (
                                <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 max-w-full truncate">
                                  {categoria}
                                </Badge>
                              ))}
                              {product.tipos.map((tipo, index) => (
                                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5 max-w-full truncate">
                                  {tipo}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {product.descripcion}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground w-full overflow-hidden">
                          <p className="truncate"><span className="font-medium">Ubi:</span> {product.ubicacion}</p>
                        </div>

                        <div className="border-t pt-2 w-full overflow-hidden">
                          <p className="text-xs font-medium mb-1">Variantes & Stock:</p>
                          <div className="space-y-1 w-full">
                            {product.variantes.map((variante, index) => (
                              <div key={index} className="text-xs border-b border-border/50 pb-0.5 last:border-0 w-full overflow-hidden">
                                <div className="font-medium text-xs truncate">{variante.nombre_variante}</div>
                                <div className="text-muted-foreground text-xs truncate">
                                  {variante.color_disenio} + {variante.color_luz} | {variante.watt} - {variante.tamano}
                                </div>
                                <div className="text-primary text-xs">Stock: {variante.stock} | Bs {variante.precio_venta.toFixed(2)}</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleIncreaseStock(product, variante)}
                                  className="h-6 text-xs mt-1"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Añadir Stock
                                </Button>
                              </div>
                            ))}
                            <div className="text-xs font-semibold border-t pt-0.5 flex justify-between mt-1 w-full">
                              <span>Total Stock:</span>
                              <span>{totalStock} u.</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5 pt-1 w-full">
                          {!isAssistant && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="flex-1 h-8 text-xs min-w-0"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span className="truncate">Editar</span>
                            </Button>
                          )}
                          {!isAssistant && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs min-w-0">
                                  <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                                  <span className="truncate">Eliminar</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el producto "{product.nombre}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(product.idproducto, product.nombre)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Vista desktop - Tabla */}
              <div className="hidden md:block border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Imagen</TableHead>
                        <TableHead className="min-w-[200px]">Nombre</TableHead>
                        <TableHead className="min-w-[120px]">Ubicación</TableHead>
                        <TableHead className="min-w-[250px]">Variantes, Watts & Stock</TableHead>
                        <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsToShow.map((product) => {
                        const totalStock = getTotalStock(product.variantes);
                        const allImages = getAllProductImages(product);

                        return (
                          <TableRow key={product.idproducto}>
                            <TableCell>
                              <div className="w-20 h-20">
                                <ImageCarousel
                                  images={allImages}
                                  productName={product.nombre}
                                  className="w-20 h-20"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {product.nombre}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {product.categorias.map((categoria, index) => (
                                    <Badge key={index} variant="secondary" className="mr-1 mb-1">
                                      {categoria}
                                    </Badge>
                                  ))}
                                  {product.tipos.map((tipo, index) => (
                                    <Badge key={index} variant="outline" className="mr-1 mb-1">
                                      {tipo}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {product.descripcion}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{product.ubicacion}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {product.variantes.map((variante, index) => (
                                  <div key={index} className="text-xs border-b border-border/50 pb-1 last:border-0">
                                    <div className="font-medium">{variante.nombre_variante}</div>
                                    <div className="text-muted-foreground">
                                      {variante.color_disenio} + {variante.color_luz} | {variante.watt} - {variante.tamano}
                                    </div>
                                    <div className="text-primary">Stock: {variante.stock} | Precio: Bs {variante.precio_venta.toFixed(2)}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleIncreaseStock(product, variante)}
                                      className="h-6 text-xs mt-1"
                                    >
                                      <Package className="h-3 w-3 mr-1" />
                                      Añadir Stock
                                    </Button>
                                  </div>
                                ))}
                                <div className="text-xs font-semibold border-t pt-1 mt-1">
                                  Total: {totalStock} unidades
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                {!isAssistant && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {!isAssistant && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente el producto "{product.nombre}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(product.idproducto, product.nombre)}>
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {searchTerm && !showAllProducts && productsToShow.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No se encontraron productos que coincidan con la búsqueda.
            </div>
          )}

          {!searchTerm && !showAllProducts && (
            <div className="text-center text-muted-foreground py-8">
              Usa el buscador o haz clic en "Ver todos los productos" para mostrar el inventario.
            </div>
          )}

          {products.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No hay productos registrados. {!isAssistant && "Haz clic en 'Agregar Producto' para comenzar."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}