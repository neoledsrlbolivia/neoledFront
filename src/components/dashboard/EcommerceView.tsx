// src/components/dashboard/EcommerceView.tsx - VERSIÓN FINAL CORREGIDA
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Search, ShoppingBag, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCarruseles, getAllProducts, createCarrusel, updateCarrusel, deleteCarrusel, searchProducts, getSelectedProductsInfo, Carrusel, Product } from "@/api/EcommerceViewApi";

// Hook para debounce
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

export function EcommerceView() {
  const [carousels, setCarousels] = useState<Carrusel[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCarousel, setNewCarousel] = useState({ name: "", productIds: [] as string[] });
  const [editingCarousel, setEditingCarousel] = useState<Carrusel | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProductsInDialog, setSelectedProductsInDialog] = useState<Product[]>([]);
  const [editSelectedProducts, setEditSelectedProducts] = useState<Product[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const lastSearchQueryRef = useRef<string>("");

  // Debounce para búsqueda
  const debouncedProductSearchTerm = useDebounce(productSearchTerm, 300);

  // Cargar solo carruseles al inicio
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Solo cargar carruseles inmediatamente
        const carouselsData = await getCarruseles();
        setCarousels(carouselsData);
        
        // Cargar productos en segundo plano (sin bloquear UI)
        setTimeout(async () => {
          try {
            const productsData = await getAllProducts();
            setAllProducts(productsData);
          } catch (error) {
            console.error("Error cargando productos en segundo plano:", error);
          }
        }, 100);
        
      } catch (error) {
        console.error("Error loading carousels:", error);
        toast({ 
          title: "Error", 
          description: "No se pudieron cargar los carruseles", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Búsqueda de productos solo cuando se escribe
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedProductSearchTerm.trim().length >= 2 && debouncedProductSearchTerm !== lastSearchQueryRef.current) {
        lastSearchQueryRef.current = debouncedProductSearchTerm;
        setSearchLoading(true);
        try {
          const results = await searchProducts(debouncedProductSearchTerm);
          setSearchResults(results);
        } catch (error) {
          console.error("Error searching products:", error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else if (debouncedProductSearchTerm.trim().length < 2) {
        lastSearchQueryRef.current = "";
        setSearchResults([]);
      }
    };

    performSearch();
  }, [debouncedProductSearchTerm]);

  // Cargar productos completos cuando se abre diálogo de creación
  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (isCreateDialogOpen && newCarousel.productIds.length > 0) {
        try {
          const fullProducts = await getSelectedProductsInfo(newCarousel.productIds);
          setSelectedProductsInDialog(fullProducts);
        } catch (error) {
          console.error("Error cargando productos seleccionados:", error);
          setSelectedProductsInDialog([]);
        }
      } else {
        setSelectedProductsInDialog([]);
      }
    };

    loadSelectedProducts();
  }, [isCreateDialogOpen, newCarousel.productIds]);

  // Cargar productos completos cuando se abre diálogo de edición
  useEffect(() => {
    const loadEditProducts = async () => {
      if (isEditDialogOpen && editingCarousel && editingCarousel.productIds.length > 0) {
        try {
          const fullProducts = await getSelectedProductsInfo(editingCarousel.productIds);
          setEditSelectedProducts(fullProducts);
        } catch (error) {
          console.error("Error cargando productos de edición:", error);
          setEditSelectedProducts([]);
        }
      } else {
        setEditSelectedProducts([]);
      }
    };

    loadEditProducts();
  }, [isEditDialogOpen, editingCarousel]);

  // Manejar popstate
  useEffect(() => {
    const handlePopState = () => {
      if (isCreateDialogOpen) {
        setIsCreateDialogOpen(false);
        setNewCarousel({ name: "", productIds: [] });
      }
      if (isEditDialogOpen) {
        setIsEditDialogOpen(false);
        setEditingCarousel(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCreateDialogOpen, isEditDialogOpen]);

  // Filtrar carruseles
  const filteredCarousels = carousels.filter(carousel => 
    carousel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Productos disponibles para mostrar
  const availableProducts = debouncedProductSearchTerm.trim().length >= 2 ? 
    searchResults : 
    allProducts.slice(0, 20);

  // Obtener productos seleccionados básicos
  const getSelectedProductsBasic = (productIds: string[]): Product[] => {
    const basicProducts = allProducts.filter(product => productIds.includes(product.id));
    
    // Si algún producto no está en allProducts, crear uno básico
    const missingIds = productIds.filter(id => !allProducts.some(p => p.id === id));
    const missingProducts = missingIds.map(id => ({
      id,
      name: "Cargando...",
      description: "",
      category: "Cargando...",
      type: "Cargando...",
      color: "Cargando...",
      price: 0,
      stock: 0,
      images: [],
      variants: []
    }));
    
    return [...basicProducts, ...missingProducts];
  };

  // Diálogos
  const handleCreateDialogOpen = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setNewCarousel({ name: "", productIds: [] });
      setProductSearchTerm("");
      setSelectedProductsInDialog([]);
    }
  };

  const handleEditDialogOpen = (open: boolean, carousel?: Carrusel) => {
    setIsEditDialogOpen(open);
    if (open && carousel) {
      setEditingCarousel(carousel);
    } else {
      setEditingCarousel(null);
      setProductSearchTerm("");
      setEditSelectedProducts([]);
    }
  };

  // Búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  // Operaciones
  const handleCreateCarousel = async () => {
    if (processing) return;
    
    setProcessing("create");
    
    if (!newCarousel.name.trim()) {
      toast({ title: "Error", description: "El nombre del carrusel es requerido", variant: "destructive" });
      setProcessing(null);
      return;
    }

    try {
      const productIds = newCarousel.productIds.map(id => parseInt(id));
      const nuevoCarrusel = await createCarrusel({
        nombre: newCarousel.name,
        productIds: productIds
      });
      
      setCarousels([...carousels, nuevoCarrusel]);
      setNewCarousel({ name: "", productIds: [] });
      setIsCreateDialogOpen(false);
      toast({ title: "Éxito", description: "Carrusel creado correctamente" });
    } catch (error) {
      console.error("Error creating carousel:", error);
      toast({ 
        title: "Error", 
        description: "No se pudo crear el carrusel", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleEditCarousel = async (carousel: Carrusel) => {
    if (processing || !editingCarousel) return;
    
    setProcessing(`edit-${editingCarousel.id}`);
    
    try {
      const productIds = editingCarousel.productIds.map(id => parseInt(id));
      const carruselActualizado = await updateCarrusel(editingCarousel.id, {
        nombre: editingCarousel.name,
        productIds: productIds
      });
      
      setCarousels(carousels.map(c => c.id === carruselActualizado.id ? carruselActualizado : c));
      setEditingCarousel(null);
      setIsEditDialogOpen(false);
      toast({ title: "Éxito", description: "Carrusel actualizado correctamente" });
    } catch (error) {
      console.error("Error updating carousel:", error);
      toast({ 
        title: "Error", 
        description: "No se pudo actualizar el carrusel", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteCarousel = async (id: string) => {
    if (processing) return;
    
    setProcessing(`delete-${id}`);
    
    try {
      await deleteCarrusel(id);
      setCarousels(carousels.filter(c => c.id !== id));
      toast({ title: "Éxito", description: "Carrusel eliminado correctamente" });
    } catch (error) {
      console.error("Error deleting carousel:", error);
      toast({ 
        title: "Error", 
        description: "No se pudo eliminar el carrusel", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(null);
    }
  };

  const addProductToCarousel = (productId: string, isEditing = false) => {
    if (processing) return;
    
    if (isEditing && editingCarousel) {
      if (editingCarousel.productIds.includes(productId)) {
        toast({ title: "Info", description: "Este producto ya está en el carrusel", variant: "default" });
        return;
      }
      if (editingCarousel.productIds.length >= 10) {
        toast({ title: "Error", description: "Máximo 10 productos por carrusel", variant: "destructive" });
        return;
      }
      setEditingCarousel({
        ...editingCarousel,
        productIds: [...editingCarousel.productIds, productId]
      });
    } else {
      if (newCarousel.productIds.includes(productId)) {
        toast({ title: "Info", description: "Este producto ya está en el carrusel", variant: "default" });
        return;
      }
      if (newCarousel.productIds.length >= 10) {
        toast({ title: "Error", description: "Máximo 10 productos por carrusel", variant: "destructive" });
        return;
      }
      setNewCarousel({
        ...newCarousel,
        productIds: [...newCarousel.productIds, productId]
      });
    }
    
    setProductSearchTerm("");
    toast({ title: "Éxito", description: "Producto agregado al carrusel" });
  };

  const removeProductFromCarousel = (productId: string, isEditing = false) => {
    if (processing) return;
    
    if (isEditing && editingCarousel) {
      setEditingCarousel({
        ...editingCarousel,
        productIds: editingCarousel.productIds.filter(id => id !== productId)
      });
    } else {
      setNewCarousel({
        ...newCarousel,
        productIds: newCarousel.productIds.filter(id => id !== productId)
      });
    }
  };

  // Verificaciones
  const isProcessing = (operation: string) => processing === operation;
  const isAnyProcessing = () => processing !== null;

  // Componente ProductTable
  const ProductTable = ({ products, onRemove, isEditing = false }: { 
    products: Product[], 
    onRemove: (productId: string) => void,
    isEditing?: boolean 
  }) => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {products.length}/10 productos seleccionados
      </div>
      
      {products.length > 0 ? (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 md:w-16">Imagen</TableHead>
                <TableHead className="min-w-[120px]">Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="min-w-[80px]">Precio</TableHead>
                <TableHead className="hidden lg:table-cell">Variantes</TableHead>
                <TableHead className="w-8 md:w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img 
                      src={product.images?.[0] || "/placeholder.svg"} 
                      alt={product.name}
                      className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="line-clamp-2 md:line-clamp-1">{product.name}</div>
                      <div className="md:hidden text-xs text-muted-foreground space-y-1">
                        <div>{product.category} • {product.type}</div>
                        <div className="flex flex-wrap gap-1 lg:hidden">
                          {product.variants && product.variants.length > 0 ? (
                            product.variants.slice(0, 2).map((variant, index) => (
                              <Badge key={index} variant="outline" className="text-[10px] px-1">
                                {variant.color}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1">
                              {product.color}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.type}</TableCell>
                  <TableCell className="text-sm md:text-base">
                    {product.price > 0 ? `Bs${product.price.toFixed(2)}` : "Bs0.00"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {product.variants && product.variants.length > 0 ? (
                        product.variants.map((variant, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variant.color} ({variant.stock})
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {product.color} ({product.stock})
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(product.id)}
                      className="h-6 w-6 md:h-8 md:w-8 p-0 text-destructive hover:text-destructive"
                      disabled={isAnyProcessing()}
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
          No hay productos seleccionados
        </div>
      )}
      
      <div className="space-y-3">
        <Label>Buscar y agregar productos</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={productSearchInputRef}
            placeholder="Buscar productos por nombre, categoría o color..."
            value={productSearchTerm}
            onChange={handleProductSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="pl-8"
            disabled={isAnyProcessing()}
          />
          {searchLoading && (
            <div className="absolute right-2 top-2.5">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        
        {productSearchTerm && (
          <div className="border rounded-md max-h-60 overflow-y-auto">
            <div className="p-2">
              {searchLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Buscando productos...</p>
                </div>
              ) : availableProducts.length > 0 ? (
                availableProducts.slice(0, 10).map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => addProductToCarousel(product.id, isEditing)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-4">
                        <img 
                          src={product.images?.[0] || "/placeholder.svg"} 
                          alt={product.name}
                          className="w-8 h-8 md:w-12 md:h-12 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.category} • {product.type}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.variants && product.variants.length > 0 ? (
                                product.variants.slice(0, 2).map((variant, index) => (
                                  <Badge key={index} variant="outline" className="text-[10px] px-1 py-0">
                                    {variant.color}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {product.color}
                                </Badge>
                              )}
                              {product.variants && product.variants.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{product.variants.length - 2}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">
                            {product.price > 0 ? `Bs${product.price.toFixed(2)}` : "Bs0.00"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="ml-2 h-8 w-8 p-0 flex-shrink-0"
                      disabled={isAnyProcessing()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No se encontraron productos
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando carruseles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Gestión de Carruseles</h1>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Carruseles de Productos
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto" disabled={isAnyProcessing()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Carrusel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Carrusel</DialogTitle>
                <DialogDescription>
                  Define el nombre del carrusel y selecciona los productos que aparecerán en él.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="carouselName">Nombre del Carrusel</Label>
                  <Input
                    id="carouselName"
                    value={newCarousel.name}
                    onChange={(e) => setNewCarousel({...newCarousel, name: e.target.value})}
                    placeholder="Ej: Productos Destacados"
                    disabled={isProcessing("create")}
                  />
                </div>
                
                <ProductTable 
                  products={selectedProductsInDialog}
                  onRemove={(productId) => removeProductFromCarousel(productId, false)}
                />
              </div>
              <DialogFooter className="flex-col md:flex-row gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!newCarousel.name.trim() || isProcessing("create")} 
                      className="w-full md:w-auto"
                    >
                      {isProcessing("create") ? "Creando..." : "Crear Carrusel"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Creación</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que deseas crear el carrusel "{newCarousel.name}" con {newCarousel.productIds.length} productos?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isProcessing("create")}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCreateCarousel}
                        disabled={isProcessing("create")}
                      >
                        {isProcessing("create") ? "Creando..." : "Crear"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar carruseles..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="pl-8"
                disabled={isAnyProcessing()}
              />
            </div>
            
            {filteredCarousels.map((carousel) => (
              <Card key={carousel.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{carousel.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {carousel.productIds.length} productos
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={(open) => handleEditDialogOpen(open, carousel)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full md:w-auto"
                            disabled={isAnyProcessing()}
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="md:hidden ml-2">Editar</span>
                          </Button>
                        </DialogTrigger>
                        {editingCarousel && (
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Carrusel</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div>
                                <Label htmlFor="editCarouselName">Nombre del Carrusel</Label>
                                <Input
                                  id="editCarouselName"
                                  value={editingCarousel.name}
                                  onChange={(e) => setEditingCarousel({...editingCarousel, name: e.target.value})}
                                  disabled={isProcessing(`edit-${editingCarousel.id}`)}
                                />
                              </div>
                              
                              <ProductTable 
                                products={editSelectedProducts}
                                onRemove={(productId) => removeProductFromCarousel(productId, true)}
                                isEditing={true}
                              />
                            </div>
                            <DialogFooter className="flex-col md:flex-row gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    className="w-full md:w-auto"
                                    disabled={isProcessing(`edit-${editingCarousel.id}`)}
                                  >
                                    {isProcessing(`edit-${editingCarousel.id}`) ? "Guardando..." : "Guardar Cambios"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Edición</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas guardar los cambios en este carrusel?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isProcessing(`edit-${editingCarousel.id}`)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleEditCarousel(editingCarousel)}
                                      disabled={isProcessing(`edit-${editingCarousel.id}`)}
                                    >
                                      {isProcessing(`edit-${editingCarousel.id}`) ? "Guardando..." : "Guardar"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isAnyProcessing()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar el carrusel "{carousel.name}"? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isProcessing(`delete-${carousel.id}`)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteCarousel(carousel.id)}
                              disabled={isProcessing(`delete-${carousel.id}`)}
                            >
                              {isProcessing(`delete-${carousel.id}`) ? "Eliminando..." : "Eliminar"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredCarousels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron carruseles
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}