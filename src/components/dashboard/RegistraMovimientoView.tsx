import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Wallet, CheckCircle, XCircle, History } from "lucide-react";
import { getCashStatus, createTransaction, openCash, closeCash, getUserTransactions, Transaction } from "@/api/CashApi";

export function RegistraMovimientoView() {
  const [tipo, setTipo] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [saldoActual, setSaldoActual] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      setLoading(true);
      const [status, userTransactions] = await Promise.all([
        getCashStatus(),
        getUserTransactions()
      ]);
      
      setCajaAbierta(status.estado === "abierta");
      setSaldoActual(parseFloat(status.monto_final));
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading cash data:", error);
      // Usar valores por defecto en caso de error
      setCajaAbierta(false);
      setSaldoActual(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (processing) return; // Prevenir doble ejecución
    
    setProcessing(true);
    
    try {
      if (!tipo) {
        toast({
          title: "Error",
          description: "Por favor selecciona el tipo de movimiento",
          variant: "destructive",
        });
        return;
      }

      if (tipo === "Apertura" && !monto) {
        toast({
          title: "Error",
          description: "Por favor ingresa el monto inicial para abrir la caja",
          variant: "destructive",
        });
        return;
      }

      if ((tipo === "Ingreso" || tipo === "Egreso") && (!monto || !descripcion)) {
        toast({
          title: "Error", 
          description: "Por favor completa monto y descripción para ingresos y egresos",
          variant: "destructive",
        });
        return;
      }

      if (tipo === "Apertura") {
        await openCash(parseFloat(monto));
        toast({
          title: "Caja abierta",
          description: `Caja abierta con monto inicial de ${monto} Bs correctamente`,
        });
      } else if (tipo === "Cierre") {
        await closeCash();
        toast({
          title: "Caja cerrada",
          description: `Caja cerrada con saldo final de ${saldoActual.toFixed(2)} Bs correctamente`,
        });
      } else {
        await createTransaction({
          tipoMovimiento: tipo,
          descripcion,
          monto: parseFloat(monto)
        });
        toast({
          title: "Movimiento registrado",
          description: `${getTipoTexto(tipo)} de ${monto} Bs registrado correctamente`,
        });
      }

      // Recargar datos
      await loadCashData();
      
      // Limpiar formulario
      setTipo("");
      setMonto("");
      setDescripcion("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTipoTexto = (tipo: string) => {
    const tipoTextos: { [key: string]: string } = {
      "Ingreso": "Ingreso",
      "Egreso": "Egreso", 
      "Apertura": "Apertura de caja",
      "Cierre": "Cierre de caja"
    };
    return tipoTextos[tipo] || tipo;
  };

  const requiredFields = () => {
    if (tipo === "Apertura") {
      return !!monto;
    } else if (tipo === "Cierre") {
      return true; // Cierre no requiere monto del frontend
    } else if (tipo === "Ingreso" || tipo === "Egreso") {
      return !!monto && !!descripcion;
    }
    return false;
  };

  const getDescripcionPlaceholder = () => {
    switch (tipo) {
      case "Apertura":
        return "Apertura de caja automática";
      case "Cierre":
        return "Cierre de caja automática";
      default:
        return "Descripción del movimiento...";
    }
  };

  const getButtonText = () => {
    if (tipo === "Apertura") return processing ? "Abriendo Caja..." : "Abrir Caja";
    if (tipo === "Cierre") return processing ? "Cerrando Caja..." : "Cerrar Caja";
    return processing ? "Registrando..." : "Registrar Movimiento";
  };

  const getAlertDescription = () => {
    if (tipo === "Apertura") {
      return `¿Estás seguro de que deseas abrir la caja con un monto inicial de ${monto} Bs?`;
    } else if (tipo === "Cierre") {
      return `¿Estás seguro de que deseas cerrar la caja con el saldo actual de ${saldoActual.toFixed(2)} Bs?`;
    } else {
      return `¿Estás seguro de que deseas registrar este ${tipo.toLowerCase()} de ${monto} Bs?${
        descripcion ? `\nDescripción: ${descripcion}` : ''
      }`;
    }
  };

  // MODIFICADO: Formatear fecha UTC exactamente como viene del backend
  const formatDate = (isoDate: string) => {
    try {
      // Crear objeto Date desde el string ISO (UTC)
      const date = new Date(isoDate);
      
      // Extraer componentes UTC para mantener la hora exacta
      const day = date.getUTCDate();
      const month = date.getUTCMonth() + 1; // Los meses empiezan en 0
      const year = date.getUTCFullYear();
      
      let hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      
      // Determinar si es AM o PM
      const period = hours >= 12 ? 'p. m.' : 'a. m.';
      
      // Convertir a formato 12 horas
      if (hours === 0) {
        hours = 12; // Medianoche
      } else if (hours > 12) {
        hours = hours - 12;
      }
      
      // Formatear con ceros iniciales si es necesario
      const formattedHours = hours.toString();
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes.toString();
      const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds.toString();
      
      // Formato: 16/1/2026, 4:15:51 p. m.
      return `${day}/${month}/${year}, ${formattedHours}:${formattedMinutes}:${formattedSeconds} ${period}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return isoDate; // Devolver el original si hay error
    }
  };

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'Ingreso':
        return 'bg-green-100 text-green-800';
      case 'Egreso':
        return 'bg-red-100 text-red-800';
      case 'Apertura':
        return 'bg-blue-100 text-blue-800';
      case 'Cierre':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para determinar si el botón debe estar deshabilitado
  const isButtonDisabled = () => {
    return !requiredFields() || loading || processing;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Registrar Movimiento</h1>
      </div>
      
      {/* Estado de Caja y Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold">Saldo Actual</h2>
              </div>
              <div className="text-3xl font-bold text-primary">Bs {saldoActual.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wallet className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold">Estado de Caja</h2>
              </div>
              <div className="flex items-center justify-center gap-2">
                {cajaAbierta ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">ABIERTA</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">CERRADA</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario Unificado */}
        <Card>
          <CardHeader>
            <CardTitle>Registrar Movimiento de Caja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimiento</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={processing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {cajaAbierta ? (
                    <>
                      <SelectItem value="Ingreso">Ingreso</SelectItem>
                      <SelectItem value="Egreso">Egreso</SelectItem>
                      <SelectItem value="Cierre">Cierre de Caja</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="Apertura">Apertura de Caja</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Mostrar campo de monto solo para Apertura, Ingreso y Egreso */}
            {(tipo === "Apertura" || tipo === "Ingreso" || tipo === "Egreso") && (
              <div className="space-y-2">
                <Label htmlFor="monto">
                  {tipo === "Apertura" ? "Monto Inicial (Bs)" : "Monto (Bs)"}
                </Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  min="0"
                  step="0.01"
                  className="number-input-no-scroll"
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={processing}
                />
              </div>
            )}

            {/* Mostrar descripción solo para Ingreso y Egreso */}
            {(tipo === "Ingreso" || tipo === "Egreso") && (
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder={getDescripcionPlaceholder()}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  disabled={processing}
                />
              </div>
            )}

            {/* Información para Cierre */}
            {tipo === "Cierre" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Wallet className="h-4 w-4" />
                  <span className="font-semibold">Información de Cierre</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  La caja se cerrará con el saldo actual de <strong>Bs {saldoActual.toFixed(2)}</strong>
                </p>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={isButtonDisabled()}
                >
                  {getButtonText()}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar operación?</AlertDialogTitle>
                  <AlertDialogDescription className="whitespace-pre-line">
                    {getAlertDescription()}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleSubmit}
                    disabled={processing}
                  >
                    {processing ? "Procesando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Historial de Movimientos del Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Mis Movimientos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Cargando movimientos...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div key={transaction.idTransaccion} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoBadgeClass(transaction.tipoMovimiento)}`}>
                        {transaction.tipoMovimiento}
                      </span>
                      <span className={`text-lg font-semibold ${
                        transaction.tipoMovimiento === 'Ingreso' ? 'text-green-600' : 
                        transaction.tipoMovimiento === 'Egreso' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        Bs {transaction.monto.toFixed(2)}
                      </span>
                    </div>
                    {transaction.descripcion && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {transaction.descripcion}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      {/* MODIFICADO: Usar la función formatDate que mantiene la hora UTC */}
                      <span>{formatDate(transaction.fecha)}</span>
                      <span>{transaction.nombreUsuario}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}