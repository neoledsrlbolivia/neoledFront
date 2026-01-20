// src/components/dashboard/CajaView.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, CalendarRange as CalendarRangeIcon, Loader2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  TransaccionCaja, 
  getTransaccionesCaja,
  getTransaccionesCajaByFecha,
  getTransaccionesCajaByRango,
  getTransaccionesCajaByUsuario,
  getTransaccionesCajaByUsuarioFecha,
  getTransaccionesCajaByUsuarioRango,
  getUsuariosCaja,
  getCurrentUser,
  getSaldoActual
} from "@/api/CajaApi";

export function CajaView() {
  // Configurar fecha actual por defecto
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>(today);
  const [fechaRangoTemp, setFechaRangoTemp] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [fechaRangoAplicado, setFechaRangoAplicado] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRango, setMostrarRango] = useState(false);
  const [movimientosCaja, setMovimientosCaja] = useState<TransaccionCaja[]>([]);
  const [empleados, setEmpleados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [estadoCaja, setEstadoCaja] = useState<string>("cerrada");
  const [error, setError] = useState<string>("");

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Efecto para buscar datos cuando cambian los filtros
  useEffect(() => {
    if (!initialLoading) {
      buscarDatos();
    }
  }, [fechaBusqueda, fechaRangoAplicado, filtroEmpleado]);

  const cargarDatosIniciales = async () => {
    try {
      setInitialLoading(true);
      
      // Obtener información del usuario actual
      const userInfo = await getCurrentUser();
      setUserRole(userInfo.rol);
      setCurrentUserId(userInfo.idusuario);
      setCurrentUserName(`${userInfo.nombres} ${userInfo.apellidos}`);
      
      // Obtener saldo actual
      const saldoData = await getSaldoActual();
      setSaldoActual(parseFloat(saldoData.monto_final));
      setEstadoCaja(saldoData.estado);
      
      // Obtener empleados (solo para Admin)
      if (userInfo.rol === "Admin") {
        const usuariosList = await getUsuariosCaja();
        setEmpleados(usuariosList);
      } else {
        setEmpleados([`${userInfo.nombres} ${userInfo.apellidos}`]);
        setFiltroEmpleado(`${userInfo.nombres} ${userInfo.apellidos}`);
      }
      
    } catch (error) {
      console.error("Error cargando datos de caja:", error);
      setError("Error al cargar datos iniciales");
    } finally {
      setInitialLoading(false);
    }
  };

  // Función principal para buscar datos con los filtros actuales
  const buscarDatos = async () => {
    try {
      setLoading(true);
      setError("");
      
      let datosFiltrados: TransaccionCaja[] = [];
      
      // Determinar qué función de API usar según los filtros activos
      const fechaStr = fechaBusqueda ? format(fechaBusqueda, "yyyy-MM-dd") : "";
      const fechaInicioStr = fechaRangoAplicado.from ? format(fechaRangoAplicado.from, "yyyy-MM-dd") : "";
      const fechaFinStr = fechaRangoAplicado.to ? format(fechaRangoAplicado.to, "yyyy-MM-dd") : "";
      
      console.log("Buscando con filtros:", {
        userRole,
        fechaBusqueda: fechaStr,
        fechaRango: fechaInicioStr && fechaFinStr ? `${fechaInicioStr} a ${fechaFinStr}` : 'none',
        filtroEmpleado
      });
      
      if (userRole === "Admin") {
        // Caso 1: Admin con fecha específica
        if (fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to) {
          console.log("Caso 1: Admin con fecha específica");
          datosFiltrados = await getTransaccionesCajaByFecha(fechaStr);
        }
        // Caso 2: Admin con rango de fechas
        else if (fechaRangoAplicado.from && fechaRangoAplicado.to && !fechaBusqueda) {
          console.log("Caso 2: Admin con rango de fechas");
          datosFiltrados = await getTransaccionesCajaByRango(fechaInicioStr, fechaFinStr);
        }
        // Caso 3: Admin sin filtros de fecha
        else if (!fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to) {
          console.log("Caso 3: Admin sin filtros de fecha");
          datosFiltrados = await getTransaccionesCaja();
        }
        // Caso 4: Si ambos filtros están activos, priorizar fecha específica
        else if (fechaBusqueda && (fechaRangoAplicado.from || fechaRangoAplicado.to)) {
          console.log("Caso 4: Ambos filtros activos, usando fecha específica");
          datosFiltrados = await getTransaccionesCajaByFecha(fechaStr);
        }
      } else {
        // Caso 1: Usuario con fecha específica
        if (fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to) {
          console.log("Caso 1: Usuario con fecha específica");
          datosFiltrados = await getTransaccionesCajaByUsuarioFecha(currentUserId, fechaStr);
        }
        // Caso 2: Usuario con rango de fechas
        else if (fechaRangoAplicado.from && fechaRangoAplicado.to && !fechaBusqueda) {
          console.log("Caso 2: Usuario con rango de fechas");
          datosFiltrados = await getTransaccionesCajaByUsuarioRango(currentUserId, fechaInicioStr, fechaFinStr);
        }
        // Caso 3: Usuario sin filtros de fecha
        else if (!fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to) {
          console.log("Caso 3: Usuario sin filtros de fecha");
          datosFiltrados = await getTransaccionesCajaByUsuario(currentUserId);
        }
        // Caso 4: Si ambos filtros están activos, priorizar fecha específica
        else if (fechaBusqueda && (fechaRangoAplicado.from || fechaRangoAplicado.to)) {
          console.log("Caso 4: Ambos filtros activos, usando fecha específica");
          datosFiltrados = await getTransaccionesCajaByUsuarioFecha(currentUserId, fechaStr);
        }
      }
      
      console.log("Datos encontrados:", datosFiltrados.length);
      
      // Filtrar por empleado si es Admin y no es "Todos"
      if (userRole === "Admin" && filtroEmpleado !== "Todos") {
        datosFiltrados = datosFiltrados.filter(mov => mov.empleado === filtroEmpleado);
        console.log("Después de filtrar por empleado:", datosFiltrados.length);
      }
      
      setMovimientosCaja(datosFiltrados);
      
    } catch (error) {
      console.error("Error buscando datos:", error);
      setError("Error al cargar los movimientos de caja");
      setMovimientosCaja([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para convertir string/Date a Date
  const toDate = (dateInput: string | Date): Date => {
    return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  };

  // Función para formatear fecha UTC a formato español
  const formatDateUTC = (dateInput: string | Date) => {
    try {
      const date = toDate(dateInput);
      const day = date.getUTCDate();
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return typeof dateInput === 'string' ? dateInput.substring(0, 10) : dateInput.toString();
    }
  };

  // Función para formatear hora UTC
  const formatTimeUTC = (dateInput: string | Date) => {
    try {
      const date = toDate(dateInput);
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

  // Calcular totales de los movimientos
  const totalIngresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "Ingreso")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const totalEgresos = movimientosCaja
    .filter(mov => mov.tipo_movimiento === "Egreso")
    .reduce((sum, mov) => sum + mov.monto, 0);

  // Calcular el saldo basado en los movimientos
  const saldoFiltrado = totalIngresos - totalEgresos;

  // Limpiar filtros y volver a cargar datos del día actual
  const limpiarFiltros = async () => {
    setFechaBusqueda(today);
    setFechaRangoTemp({ from: undefined, to: undefined });
    setFechaRangoAplicado({ from: undefined, to: undefined });
    
    if (userRole === "Admin") {
      setFiltroEmpleado("Todos");
    } else {
      setFiltroEmpleado(currentUserName);
    }
    
    // La búsqueda se ejecutará automáticamente por el useEffect
  };

  // Manejar cambio en filtro de fecha específica
  const handleFechaBusquedaChange = async (date: Date | undefined) => {
    if (date) {
      setFechaBusqueda(date);
      setFechaRangoAplicado({ from: undefined, to: undefined }); // Limpiar rango
      setMostrarCalendario(false);
      // La búsqueda se ejecutará automáticamente por el useEffect
    }
  };

  // Manejar cambio temporal en filtro de rango de fechas
  const handleRangoTempChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFechaRangoTemp(range);
  };

  // Aplicar rango seleccionado
  const aplicarRangoFechas = async () => {
    if (fechaRangoTemp.from && fechaRangoTemp.to) {
      setFechaRangoAplicado({
        from: fechaRangoTemp.from,
        to: fechaRangoTemp.to
      });
      setFechaBusqueda(undefined); // Limpiar fecha específica
      setMostrarRango(false);
      // La búsqueda se ejecutará automáticamente por el useEffect
    }
  };

  // Cancelar selección de rango
  const cancelarRangoFechas = () => {
    setFechaRangoTemp({
      from: fechaRangoAplicado.from,
      to: fechaRangoAplicado.to
    });
    setMostrarRango(false);
  };

  // Manejar cambio en filtro de empleado
  const handleEmpleadoChange = (value: string) => {
    setFiltroEmpleado(value);
    // La búsqueda se ejecutará automáticamente por el useEffect
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos de caja...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Gestión de Caja</h1>
        <div className="text-sm text-muted-foreground">
          Rol: <span className="font-medium">{userRole}</span>
          {userRole !== "Admin" && (
            <span className="ml-4">Usuario: <span className="font-medium">{currentUserName}</span></span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Cards de totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs {totalEgresos.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              En los movimientos mostrados
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs {totalIngresos.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              En los movimientos mostrados
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-1">
              Estado: <span className={`font-medium ${estadoCaja === 'abierta' ? 'text-green-600' : 'text-red-600'}`}>
                {estadoCaja === 'abierta' ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Bs {saldoActual.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Saldo mostrado: <span className={`font-medium ${saldoFiltrado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Bs {saldoFiltrado.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros - Solo mostrar para Admin */}
      {userRole === "Admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Empleado</label>
                <Select value={filtroEmpleado} onValueChange={handleEmpleadoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {empleados.map(empleado => (
                      <SelectItem key={empleado} value={empleado}>{empleado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Fecha Específica</label>
                <Popover open={mostrarCalendario} onOpenChange={setMostrarCalendario}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaBusqueda ? format(fechaBusqueda, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaBusqueda}
                      onSelect={handleFechaBusquedaChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
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
                      {fechaRangoAplicado.from && fechaRangoAplicado.to ? 
                        `${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}` : 
                        "Seleccionar rango"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col">
                      <Calendar
                        mode="range"
                        selected={fechaRangoTemp}
                        onSelect={handleRangoTempChange}
                        numberOfMonths={1}
                        className="p-3 pointer-events-auto"
                        disabled={(date) => date > new Date()}
                      />
                      <div className="flex justify-end gap-2 p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelarRangoFechas}
                          disabled={!fechaRangoTemp.from && !fechaRangoTemp.to}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={aplicarRangoFechas}
                          disabled={!fechaRangoTemp.from || !fechaRangoTemp.to}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={limpiarFiltros} className="w-full">
                  Limpiar Filtros
                </Button>
              </div>
            </div>
            
            {/* Indicador de filtros activos */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Filtros activos:
                {fechaBusqueda && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Fecha: {format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}
                  </span>
                )}
                {fechaRangoAplicado.from && fechaRangoAplicado.to && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Rango: {format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - {format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}
                  </span>
                )}
                {filtroEmpleado !== "Todos" && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Empleado: {filtroEmpleado}
                  </span>
                )}
                {!fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to && filtroEmpleado === "Todos" && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    Todos los movimientos
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información para no-Admin */}
      {userRole !== "Admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Movimientos de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando solo tus movimientos de caja.
                </p>
                <div className="flex flex-wrap gap-2">
                  {fechaBusqueda && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Fecha: {format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}
                    </span>
                  )}
                  {fechaRangoAplicado.from && fechaRangoAplicado.to && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Rango: {format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - {format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}
                    </span>
                  )}
                  {!fechaBusqueda && !fechaRangoAplicado.from && !fechaRangoAplicado.to && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      Todos los movimientos
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de movimientos de caja */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === "Admin" ? "Movimientos de Caja" : "Mis Movimientos"} 
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({movimientosCaja.length} registros)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Cargando movimientos...</span>
            </div>
          ) : (
            <div className="block md:overflow-x-auto">
              <Table>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    {userRole === "Admin" && <TableHead>Empleado</TableHead>}
                    <TableHead>Monto (Bs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosCaja.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === "Admin" ? 5 : 4} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <p className="text-muted-foreground mb-2">No se encontraron movimientos de caja</p>
                          <p className="text-sm text-muted-foreground">
                            {fechaBusqueda && `Para la fecha: ${format(fechaBusqueda, "dd/MM/yyyy", { locale: es })}`}
                            {fechaRangoAplicado.from && fechaRangoAplicado.to && 
                              `En el rango: ${format(fechaRangoAplicado.from, "dd/MM/yyyy", { locale: es })} - ${format(fechaRangoAplicado.to, "dd/MM/yyyy", { locale: es })}`}
                            {filtroEmpleado !== "Todos" && ` - Empleado: ${filtroEmpleado}`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientosCaja.map((movimiento) => (
                      <TableRow key={movimiento.idtransaccion} className="md:table-row block border-b p-4 md:p-0">
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden font-semibold text-primary mb-1">Mov. #{movimiento.idtransaccion}</div>
                          <div className="font-medium">
                            {formatDateUTC(movimiento.fecha)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeUTC(movimiento.fecha)}
                          </div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">TIPO</div>
                          <div className="flex justify-center md:justify-start">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo_movimiento === "Ingreso" || movimiento.tipo_movimiento === "Apertura"
                                ? "bg-green-100 text-green-800" 
                                : movimiento.tipo_movimiento === "Cierre"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {movimiento.tipo_movimiento}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">DESCRIPCIÓN</div>
                          <div className="text-center md:text-left">{movimiento.descripcion}</div>
                        </TableCell>
                        {userRole === "Admin" && (
                          <TableCell className="md:table-cell block md:border-0 border-0 p-0 mb-2 md:mb-0">
                            <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">EMPLEADO</div>
                            <div className="text-center md:text-left">{movimiento.empleado}</div>
                          </TableCell>
                        )}
                        <TableCell className={`md:table-cell block md:border-0 border-0 p-0 font-medium ${
                          movimiento.tipo_movimiento === "Ingreso" || movimiento.tipo_movimiento === "Apertura" ? "text-green-600" : 
                          movimiento.tipo_movimiento === "Cierre" ? "text-blue-600" : "text-red-600"
                        }`}>
                          <div className="md:hidden text-xs font-medium text-muted-foreground mb-1">MONTO</div>
                          <div className="text-lg font-bold text-center md:text-left">
                            {movimiento.tipo_movimiento === "Egreso" ? "-" : ""}Bs {movimiento.monto.toFixed(2)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}