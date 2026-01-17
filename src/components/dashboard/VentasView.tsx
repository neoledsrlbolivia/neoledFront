import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Download, Calendar as CalendarRangeIcon, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getVentas, getTotalesVentas, getUsuariosVentas, getVentasHoyAsistente, Venta, VentasFiltros, TotalesVentas, BackendUsuario } from "@/api/VentasApi";
import { getUserRole, getCurrentUser } from "@/api/AuthApi";
import { generateVentaPDF } from "./VentasPDF";

interface UsuarioOption {
  value: string;
  label: string;
  username: string;
}

// Función para formatear fecha UTC
const formatDateUTC = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return typeof dateInput === 'string' ? dateInput.substring(0, 10) : "Fecha inválida";
  }
};

// Función para formatear hora UTC
const formatTimeUTC = (dateInput: string | Date) => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
    return `${formattedHours}:${formattedMinutes}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

export function VentasView() {
  const currentUser = getCurrentUser();
  const userRole = getUserRole() || "admin";
  const username = currentUser?.usuario || "";
  const isAssistant = userRole === "Asistente";
  
  const [empleadosOptions, setEmpleadosOptions] = useState<UsuarioOption[]>([{ value: "Todos", label: "Todos", username: "" }]);
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([]);
  const [totales, setTotales] = useState<TotalesVentas>({ totalGeneral: 0, totalEfectivo: 0, totalQR: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");
  const [fechaBusqueda, setFechaBusqueda] = useState<Date>();
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRango, setMostrarRango] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isAssistant) {
          // Cargar usuarios para el filtro de empleados
          const usuariosBackend: BackendUsuario[] = await getUsuariosVentas();
          const opcionesUsuarios: UsuarioOption[] = usuariosBackend.map(user => ({
            value: user.usuario, // Usamos el username como value
            label: `${user.nombres} ${user.apellidos}`,
            username: user.usuario
          }));
          setEmpleadosOptions([{ value: "Todos", label: "Todos", username: "" }, ...opcionesUsuarios]);
        }

        await cargarVentas();
        await cargarTotales();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos");
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosIniciales();
  }, []);

  // Cargar ventas cuando cambien los filtros
  useEffect(() => {
    if (!loading) {
      cargarVentas();
      cargarTotales();
    }
  }, [filtroEmpleado, filtroMetodo, fechaBusqueda, fechaInicio, fechaFin]);

  const cargarVentas = async () => {
    try {
      let ventas: Venta[] = [];

      if (isAssistant) {
        // Para asistentes: solo sus ventas de hoy, sin filtros
        ventas = await getVentasHoyAsistente(username);
      } else {
        // Para admin: aplicar filtros normales
        const filtros: VentasFiltros = {
          empleado: filtroEmpleado !== "Todos" ? filtroEmpleado : undefined,
          metodo: filtroMetodo !== "Todos" ? filtroMetodo : undefined,
          fechaEspecifica: fechaBusqueda,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin
        };
        ventas = await getVentas(filtros);
      }

      setVentasFiltradas(ventas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las ventas");
      console.error("Error cargando ventas:", err);
    }
  };

  const cargarTotales = async () => {
    try {
      if (isAssistant) {
        // Para asistentes, los totales se calculan solo con sus ventas de hoy
        const ventasHoy = await getVentasHoyAsistente(username);
        const totalGeneral = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
        const totalEfectivo = ventasHoy.filter(v => v.metodo === "Efectivo").reduce((sum, venta) => sum + venta.total, 0);
        const totalQR = ventasHoy.filter(v => v.metodo === "QR").reduce((sum, venta) => sum + venta.total, 0);
        
        setTotales({ totalGeneral, totalEfectivo, totalQR });
      } else {
        const filtros: VentasFiltros = {
          empleado: filtroEmpleado !== "Todos" ? filtroEmpleado : undefined,
          metodo: filtroMetodo !== "Todos" ? filtroMetodo : undefined,
          fechaEspecifica: fechaBusqueda,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin
        };
        const totalesData = await getTotalesVentas(filtros);
        setTotales(totalesData);
      }
    } catch (err) {
      console.error("Error cargando totales:", err);
      // Si hay error en totales, calcular localmente
      const totalGeneral = ventasFiltradas.reduce((sum, venta) => sum + venta.total, 0);
      const totalEfectivo = ventasFiltradas.filter(v => v.metodo === "Efectivo").reduce((sum, venta) => sum + venta.total, 0);
      const totalQR = ventasFiltradas.filter(v => v.metodo === "QR").reduce((sum, venta) => sum + venta.total, 0);
      setTotales({ totalGeneral, totalEfectivo, totalQR });
    }
  };

  const exportarPDF = () => {
    // Simulación de exportación
    alert("Exportando tabla a PDF...");
  };

  const limpiarFiltros = () => {
    setFechaBusqueda(undefined);
    setFechaInicio(undefined);
    setFechaFin(undefined);
    setFiltroEmpleado("Todos");
    setFiltroMetodo("Todos");
  };

  const abrirDetalleVenta = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setMostrarDetalle(true);
    setNombreCliente("");
  };

  const imprimirDetalle = () => {
    if (!nombreCliente.trim()) {
      setMostrarAlerta(true);
      return;
    }
    
    // Generar PDF en lugar de imprimir
    if (ventaSeleccionada) {
      generateVentaPDF({
        venta: ventaSeleccionada,
        nombreCliente,
        fileName: `Venta_${ventaSeleccionada.id}_${nombreCliente.replace(/\s+/g, '_')}.pdf`
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando ventas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Historial de Ventas</h1>
        <Button onClick={exportarPDF} className="flex items-center gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Cards de totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Bs {totales.totalGeneral.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs {totales.totalEfectivo.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Bs {totales.totalQR.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros - Solo para Admin */}
      {!isAssistant && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {empleadosOptions.map(empleado => (
                      <SelectItem key={empleado.value} value={empleado.value}>
                        {empleado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Método de Pago</label>
                <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Fecha Específica</label>
                <Popover open={mostrarCalendario} onOpenChange={setMostrarCalendario}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaBusqueda ? format(fechaBusqueda, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaBusqueda}
                      onSelect={(date) => {
                        setFechaBusqueda(date);
                        setFechaInicio(undefined);
                        setFechaFin(undefined);
                        setMostrarCalendario(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium">Rango de Fechas</label>
                <Popover open={mostrarRango} onOpenChange={setMostrarRango}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarRangeIcon className="mr-2 h-4 w-4" />
                      {fechaInicio && fechaFin ? 
                        `${format(fechaInicio, "dd/MM", { locale: es })} - ${format(fechaFin, "dd/MM", { locale: es })}` : 
                        "Rango"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 max-w-[90vw]" align="start">
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div>
                          <label className="text-xs font-medium mb-2 block">Fecha Inicio</label>
                          <Calendar
                            mode="single"
                            selected={fechaInicio}
                            onSelect={(date) => {
                              setFechaInicio(date);
                              setFechaBusqueda(undefined);
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-2 block">Fecha Fin</label>
                          <Calendar
                            mode="single"
                            selected={fechaFin}
                            onSelect={(date) => {
                              setFechaFin(date);
                              setFechaBusqueda(undefined);
                              if (date) setMostrarRango(false);
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={limpiarFiltros} className="w-full">
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información para asistentes */}
      {isAssistant && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Mostrando tus ventas de hoy</p>
              <p className="text-sm">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
              <p className="text-sm mt-2">Usuario: {currentUser?.nombres} {currentUser?.apellidos}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ventas ({ventasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="block md:overflow-x-auto">
            <Table>
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="w-[140px]">Fecha y Hora</TableHead>
                  <TableHead className="w-[150px]">Usuario</TableHead>
                  <TableHead className="min-w-[300px]">Descripción</TableHead>
                  <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                  <TableHead className="w-[100px] text-right">Descuento</TableHead>
                  <TableHead className="w-[130px] text-right">Total</TableHead>
                  <TableHead className="w-[120px]">Método</TableHead>
                  <TableHead className="w-[140px]">Impresión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasFiltradas.map((venta) => (
                  <TableRow key={venta.id} className="md:table-row block border-b p-4 md:p-0">
                    {/* Fecha y Hora */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="font-medium">
                        {formatDateUTC(venta.fecha)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimeUTC(venta.fecha)}
                      </div>
                    </TableCell>
                    
                    {/* Usuario */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">USUARIO</div>
                      <div className="font-medium">
                        {venta.usuario}
                      </div>
                    </TableCell>
                    
                    {/* Descripción */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                      <div className="text-sm leading-relaxed">
                        {venta.descripcion}
                      </div>
                    </TableCell>
                    
                    {/* Subtotal */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">SUBTOTAL</div>
                      <div className="text-right md:text-right">
                        Bs {venta.subtotal.toFixed(2)}
                      </div>
                    </TableCell>
                    
                    {/* Descuento */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCUENTO</div>
                      <div className="text-right md:text-right">
                        Bs {venta.descuento.toFixed(2)}
                      </div>
                    </TableCell>
                    
                    {/* Total - Con más espacio */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0 font-medium">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TOTAL</div>
                      <div className="text-lg font-bold text-primary text-right md:text-right md:pr-4">
                        Bs {venta.total.toFixed(2)}
                      </div>
                    </TableCell>
                    
                    {/* Método de Pago - Con más espacio */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-3 md:mb-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MÉTODO</div>
                      <div className="flex justify-start md:justify-start md:pl-4">
                        <Badge variant={venta.metodo === "Efectivo" ? "default" : "secondary"}>
                          {venta.metodo}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    {/* Impresión */}
                    <TableCell className="md:table-cell block md:border-0 border-0 p-0">
                      <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">IMPRESIÓN</div>
                      <div className="flex justify-start md:justify-start">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => abrirDetalleVenta(venta)}
                          className="flex items-center gap-2"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {ventasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No se encontraron ventas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para detalle de venta */}
      <Dialog open={mostrarDetalle} onOpenChange={setMostrarDetalle}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>

          {/* Formulario para datos del cliente */}
          <div className="mb-6">
            <div>
              <Label htmlFor="nombreCliente">Nombre del Cliente</Label>
              <Input
                id="nombreCliente"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ingrese el nombre del cliente"
              />
            </div>
          </div>

          {/* Contenido a imprimir */}
          <div id="detalle-venta-imprimir" className="space-y-6">
            {/* Logo */}
            <div className="logo text-center mb-6">
              <img 
                src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
                alt="NEOLED Logo" 
                className="h-16 mx-auto"
              />
            </div>

            {/* Información del cliente */}
            <div className="info-cliente space-y-2">
              <p><strong>Cliente:</strong> {nombreCliente || "No especificado"}</p>
              <p><strong>Fecha:</strong> {ventaSeleccionada ? `${formatDateUTC(ventaSeleccionada.fecha)} ${formatTimeUTC(ventaSeleccionada.fecha)}` : ""}</p>
              <p><strong>Dirección:</strong> Av. Heroinas esq. Hamiraya #316</p>
              <p><strong>Números:</strong> 77950297 - 77918672</p>
            </div>

            {/* Descripción completa de la venta */}
            <div className="descripcion-venta bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Descripción de la Venta:</h3>
              <p className="text-sm">{ventaSeleccionada?.descripcion}</p>
            </div>

            {/* Tabla de productos y totales - Solo si hay productos */}
            {ventaSeleccionada?.detalle && ventaSeleccionada.detalle.length > 0 && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Tabla de productos */}
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Productos:</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventaSeleccionada.detalle.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.producto}</TableCell>
                          <TableCell>Bs {item.precio_unitario.toFixed(2)}</TableCell>
                          <TableCell>{item.cantidad}</TableCell>
                          <TableCell>Bs {(item.precio_unitario * item.cantidad).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mini tabla de totales */}
                <div className="totales w-full lg:w-48">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Subtotal:</TableCell>
                        <TableCell>Bs {ventaSeleccionada?.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Descuento:</TableCell>
                        <TableCell>Bs {ventaSeleccionada?.descuento.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold">Total:</TableCell>
                        <TableCell className="font-bold">Bs {ventaSeleccionada?.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* Botón de imprimir */}
          <div className="flex justify-end mt-6">
            <Button onClick={imprimirDetalle} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={mostrarAlerta} onOpenChange={setMostrarAlerta}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Información requerida</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, ingresa el nombre del cliente antes de generar el PDF.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMostrarAlerta(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}