// src/components/dashboard/CajaView.tsx
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, CalendarRange as CalendarRangeIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  TransaccionCaja, 
  getTransaccionesCaja, 
  getTransaccionesCajaByUsuario, 
  getUsuariosCaja,
  getCurrentUser,
  getSaldoActual  // Esta es la función que ahora usa el mismo endpoint que RegistraMovimientoView
} from "@/api/CajaApi";

export function CajaView() {
  const [fechaBusqueda, setFechaBusqueda] = useState<Date | undefined>();
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mostrarRango, setMostrarRango] = useState(false);
  const [movimientosCaja, setMovimientosCaja] = useState<TransaccionCaja[]>([]);
  const [empleados, setEmpleados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [estadoCaja, setEstadoCaja] = useState<string>("cerrada");

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Obtener información del usuario actual
        const userInfo = await getCurrentUser();
        setUserRole(userInfo.rol);
        setCurrentUserId(userInfo.idusuario);
        setCurrentUserName(`${userInfo.nombres} ${userInfo.apellidos}`);
        
        // Obtener saldo actual desde el mismo endpoint que RegistraMovimientoView
        const saldoData = await getSaldoActual();
        setSaldoActual(parseFloat(saldoData.monto_final));
        setEstadoCaja(saldoData.estado);
        
        // Cargar transacciones según el rol
        let transacciones: TransaccionCaja[];
        if (userInfo.rol === "Admin") {
          transacciones = await getTransaccionesCaja();
          const usuariosList = await getUsuariosCaja();
          setEmpleados(usuariosList);
        } else {
          transacciones = await getTransaccionesCajaByUsuario(userInfo.idusuario);
          // Para no-admin, solo mostrar su propio nombre en filtros
          setEmpleados([`${userInfo.nombres} ${userInfo.apellidos}`]);
          setFiltroEmpleado(`${userInfo.nombres} ${userInfo.apellidos}`);
        }
        
        setMovimientosCaja(transacciones);
      } catch (error) {
        console.error("Error cargando datos de caja:", error);
        // En caso de error, cargar datos de ejemplo
        setMovimientosCaja(getDatosEjemplo());
        setEmpleados(["Juan Pérez", "María García", "Carlos López"]);
        setUserRole("Admin");
        setCurrentUserName("Usuario Demo");
        
        // En caso de error, intentar obtener el saldo de otra manera
        try {
          const saldoData = await getSaldoActual();
          setSaldoActual(parseFloat(saldoData.monto_final));
          setEstadoCaja(saldoData.estado);
        } catch (saldoError) {
          console.error("Error obteniendo saldo:", saldoError);
          setSaldoActual(641.25);
          setEstadoCaja("abierta");
        }
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Datos de ejemplo para demo (ahora con strings ISO)
  const getDatosEjemplo = (): TransaccionCaja[] => {
    return [
      {
        idtransaccion: 1,
        idestado_caja: 1,
        tipo_movimiento: "Apertura",
        descripcion: "Apertura de caja",
        monto: 500.00,
        fecha: "2024-01-30T08:00:00.000Z",
        idusuario: 1,
        idventa: null,
        empleado: "Juan Pérez"
      },
      {
        idtransaccion: 2,
        idestado_caja: 1,
        tipo_movimiento: "Ingreso",
        descripcion: "Venta de productos",
        monto: 250.50,
        fecha: "2024-01-30T10:30:00.000Z",
        idusuario: 1,
        idventa: 1,
        empleado: "Juan Pérez"
      },
      {
        idtransaccion: 3,
        idestado_caja: 1,
        tipo_movimiento: "Egreso",
        descripcion: "Compra de suministros",
        monto: 80.00,
        fecha: "2024-01-30T11:15:00.000Z",
        idusuario: 2,
        idventa: null,
        empleado: "María García"
      },
      {
        idtransaccion: 4,
        idestado_caja: 1,
        tipo_movimiento: "Ingreso",
        descripcion: "Venta de productos",
        monto: 120.75,
        fecha: "2024-01-30T14:20:00.000Z",
        idusuario: 3,
        idventa: 2,
        empleado: "Carlos López"
      },
      {
        idtransaccion: 5,
        idestado_caja: 1,
        tipo_movimiento: "Egreso",
        descripcion: "Pago de servicios",
        monto: 150.00,
        fecha: "2024-01-30T15:45:00.000Z",
        idusuario: 1,
        idventa: null,
        empleado: "Juan Pérez"
      },
      {
        idtransaccion: 6,
        idestado_caja: 1,
        tipo_movimiento: "Cierre",
        descripcion: "Cierre de caja",
        monto: 641.25,
        fecha: "2024-01-30T20:00:00.000Z",
        idusuario: 1,
        idventa: null,
        empleado: "Juan Pérez"
      }
    ];
  };

  // Función para convertir string/Date a Date
  const toDate = (dateInput: string | Date): Date => {
    return typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  };

  // Función para formatear fecha UTC a formato español (manteniendo hora exacta)
  const formatDateUTC = (dateInput: string | Date) => {
    try {
      const date = toDate(dateInput);
      
      // Extraer componentes UTC para mantener la hora exacta
      const day = date.getUTCDate();
      const month = date.getUTCMonth() + 1; // Los meses empiezan en 0
      const year = date.getUTCFullYear();
      
      // Formato: 16/1/2024
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
      
      // Formatear con ceros iniciales si es necesario
      const formattedHours = hours < 10 ? `0${hours}` : hours.toString();
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
      
      return `${formattedHours}:${formattedMinutes}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientosCaja.filter(movimiento => {
      // Filtro por empleado (solo para Admin)
      if (userRole === "Admin" && filtroEmpleado !== "Todos" && movimiento.empleado !== filtroEmpleado) {
        return false;
      }

      // Para no-admin, solo mostrar sus propios movimientos
      if (userRole !== "Admin" && movimiento.empleado !== currentUserName) {
        return false;
      }

      const fechaMovimiento = toDate(movimiento.fecha);

      // Filtro por fecha específica
      if (fechaBusqueda) {
        const fechaMovimientoStr = format(fechaMovimiento, "yyyy-MM-dd");
        const fechaSeleccionada = format(fechaBusqueda, "yyyy-MM-dd");
        if (fechaMovimientoStr !== fechaSeleccionada) {
          return false;
        }
      }

      // Filtro por rango de fechas
      if (fechaInicio && fechaFin) {
        if (fechaMovimiento < fechaInicio || fechaMovimiento > fechaFin) {
          return false;
        }
      }

      return true;
    });
  }, [movimientosCaja, filtroEmpleado, fechaBusqueda, fechaInicio, fechaFin, userRole, currentUserName]);

  // Calcular totales de los movimientos filtrados
  const totalIngresos = movimientosFiltrados
    .filter(mov => mov.tipo_movimiento === "Ingreso")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const totalEgresos = movimientosFiltrados
    .filter(mov => mov.tipo_movimiento === "Egreso")
    .reduce((sum, mov) => sum + mov.monto, 0);

  const limpiarFiltros = () => {
    setFechaBusqueda(undefined);
    setFechaInicio(undefined);
    setFechaFin(undefined);
    if (userRole === "Admin") {
      setFiltroEmpleado("Todos");
    } else {
      setFiltroEmpleado(currentUserName);
    }
  };

  if (loading) {
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

      {/* Cards de totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs {totalEgresos.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs {totalIngresos.toFixed(2)}</div>
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
                <Select value={filtroEmpleado} onValueChange={setFiltroEmpleado}>
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
                      {fechaBusqueda ? format(fechaBusqueda, "dd/MM/yyyy", { locale: es }) : "Buscar"}
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
                      <div className="flex flex-col gap-4">
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

      {/* Información para no-Admin */}
      {userRole !== "Admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Movimientos de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Mostrando solo tus movimientos de caja. Los administradores pueden ver todos los movimientos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabla de movimientos de caja */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRole === "Admin" ? "Movimientos de Caja" : "Mis Movimientos"} 
            ({movimientosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                {movimientosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === "Admin" ? 5 : 4} className="text-center py-8">
                      No se encontraron movimientos de caja
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientosFiltrados.map((movimiento) => (
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
        </CardContent>
      </Card>
    </div>
  );
}