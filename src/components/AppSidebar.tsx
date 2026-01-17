import {
  ShoppingCart,
  Package,
  Package2,
  TrendingUp,
  FileText,
  CreditCard,
  FileBarChart,
  Bell,
  Users,
  Globe,
  Settings,
  LogOut,
  Clock,
  StickyNote
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardView } from "@/pages/Dashboard";
import { logout, getCurrentUser } from "@/api/AuthApi";
import { useEffect } from "react";

interface AppSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  { title: "Vender", url: "vender", icon: ShoppingCart, roles: ["admin", "asistente"] },
  { title: "Notas", url: "notas", icon: StickyNote, roles: ["admin", "asistente"] },
  { title: "Productos", url: "productos", icon: Package, roles: ["admin", "asistente"] },
  { title: "Inventario", url: "inventario", icon: Package2, roles: ["admin"] },
  { title: "Ventas", url: "ventas", icon: TrendingUp, roles: ["admin", "asistente"] },
  { title: "Cotización", url: "cotizacion", icon: FileText, roles: ["admin", "asistente"] },
  { title: "Pagos Pendientes", url: "pagos-pendientes", icon: Clock, roles: ["admin", "asistente"] },
  { title: "Caja", url: "caja", icon: CreditCard, roles: ["admin"] },
  { title: "Registra Movimiento", url: "registra-movimiento", icon: CreditCard, roles: ["admin", "asistente"] },
  { title: "Reportes", url: "reportes", icon: FileBarChart, roles: ["admin"] },
  { title: "Ecommerce", url: "ecommerce", icon: Globe, roles: ["admin"] },
  { title: "Configuración", url: "configuracion", icon: Settings, roles: ["admin"] },
  { title: "Alertas", url: "alertas", icon: Bell, roles: ["admin"] },
  { title: "Gestión de Usuarios", url: "usuarios", icon: Users, roles: ["admin"] },
];

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const user = getCurrentUser();
  const userRole = user?.rol.toLowerCase() || "admin";

  // Filtrar opciones de menú según el rol
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Limpiar localStorage incluso si hay error en el servidor
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/login");
    }
  };

  const isActive = (view: string) => currentView === view;

  // Función para contraer el sidebar en móviles al hacer clic en un menú
  const handleMenuItemClick = (view: DashboardView) => {
    // Verificar si estamos en un dispositivo móvil
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setOpenMobile(false);
    }
    onViewChange(view);
  };

  // Efecto para contraer el sidebar en móviles cuando cambia la vista
  useEffect(() => {
    const handleRouteChange = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setOpenMobile(false);
      }
    };

    // Ejecutar cuando el componente se monta o cuando cambia currentView
    handleRouteChange();
  }, [currentView, setOpenMobile]);

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/84af3e7f-9171-4c73-900f-9499a9673234.png" 
            alt="NEOLED Logo" 
            className={`${collapsed ? "h-8 w-8" : "h-auto w-auto"} transition-all`}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema POS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => handleMenuItemClick(item.url as DashboardView)}
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="space-y-2">
          {!collapsed && (
            <div className="text-xs text-muted-foreground text-center">
              Conectado como: <strong>{user?.nombres} {user?.apellidos}</strong>
              <br />
              Rol: <strong>{user?.rol}</strong>
            </div>
          )}
          <Button
            variant="outline"
            size={collapsed ? "sm" : "default"}
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}