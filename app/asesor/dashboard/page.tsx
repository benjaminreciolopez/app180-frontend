"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Mail,
  MessageSquare,
  FileText,
  AlertTriangle,
  Plus,
  Calendar,
  Receipt,
  Wallet,
  Clock,
  ArrowRight,
  Activity,
  CircleDollarSign,
  RefreshCw,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ALL_ASESOR_DASHBOARD_WIDGETS } from "@/lib/asesor-dashboard-widgets";
import { RetaDashboardWidget } from "@/components/reta/RetaDashboardWidget";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────

type Facturacion = {
  este_mes: number;
  mes_anterior: number;
  ytd: number;
};

type Gastos = {
  este_mes: number;
  mes_anterior: number;
  ytd: number;
};

type ClientesFacturasPendientes = {
  total_clientes: number;
  total_importe: number;
};

type PlazoFiscal = {
  modelo: string;
  periodo: string;
  descripcion: string;
  fecha_vencimiento: string;
  dias_restantes: number;
};

type ActividadReciente = {
  tipo: "factura" | "gasto";
  empresa_id: string;
  empresa_nombre: string;
  descripcion: string;
  fecha: string;
};

type ClienteFinancials = {
  este_mes: number;
  mes_anterior: number;
  ytd: number;
};

type ClienteSalud = {
  empresa_id: string;
  nombre: string;
  estado: "green" | "yellow" | "red";
  facturas_mes: number;
  alertas: number;
  facturacion?: ClienteFinancials;
  gastos?: ClienteFinancials;
  beneficio?: { este_mes: number; ytd: number };
};

type KpisBasicos = {
  clientes_activos: number;
  invitaciones_pendientes: number;
  mensajes_no_leidos: number;
};

type Beneficio = {
  este_mes: number;
  ytd: number;
};

type DashboardConsolidado = {
  facturacion_propia: Facturacion;
  gastos_propios: Gastos;
  beneficio_propio: Beneficio;
  facturacion_clientes: Facturacion;
  gastos_clientes: Gastos;
  clientes_facturas_pendientes: ClientesFacturasPendientes;
  clientes_con_alertas: number;
  plazos_fiscales: PlazoFiscal[];
  actividad_reciente: ActividadReciente[];
  clientes_salud: ClienteSalud[];
  kpis_basicos: KpisBasicos;
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function relativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return "Ahora mismo";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffH < 24) return `Hace ${diffH}h`;
    if (diffD === 1) return "Ayer";
    if (diffD < 7) return `Hace ${diffD} dias`;
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function trendPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Component ──────────────────────────────────────────────────────────

export default function AsesorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardConsolidado | null>(null);

  // Client filter for cartera & activity sections (empty = no client selected)
  const [filtroCliente, setFiltroCliente] = useState("");

  // Widget config
  const [widgetConfig, setWidgetConfig] = useState<{ id: string; visible: boolean; order: number }[]>([]);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, widgetsRes] = await Promise.all([
        authenticatedFetch("/asesor/dashboard/consolidado"),
        authenticatedFetch("/asesor/configuracion/widgets").catch(() => null),
      ]);
      const json = await dashRes.json();
      if (!dashRes.ok || !json.success) {
        throw new Error(json.error || "Error al cargar el dashboard");
      }
      setData(json.data);

      // Load widget config - pick mobile or desktop based on device
      if (widgetsRes && widgetsRes.ok) {
        const wJson = await widgetsRes.json();
        const isMobilePwa = isMobileDevice() && isStandalone() && typeof window !== "undefined" && window.innerWidth < 1024;
        const saved: { id: string; visible: boolean; order: number }[] =
          isMobilePwa ? (wJson.widgets_mobile || wJson.widgets || []) : (wJson.widgets || []);
        // Merge: keep saved config + add any new widgets not yet in config as visible
        const savedIds = new Set(saved.map((w) => w.id));
        const newWidgets = ALL_ASESOR_DASHBOARD_WIDGETS
          .filter((wd) => !savedIds.has(wd.id))
          .map((wd, i) => ({ id: wd.id, visible: true, order: saved.length + i }));
        setWidgetConfig([...saved, ...newWidgets]);
      } else {
        // Default: all visible
        setWidgetConfig(ALL_ASESOR_DASHBOARD_WIDGETS.map((wd, i) => ({ id: wd.id, visible: true, order: i })));
      }
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    // Recargar cuando se guardan cambios desde el modal de configuración
    const handleSessionUpdate = () => loadDashboard();
    window.addEventListener("session-updated", handleSessionUpdate);
    return () => window.removeEventListener("session-updated", handleSessionUpdate);
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await authenticatedFetch("/asesor/clientes/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al enviar la invitacion");
      }
      setInviteSuccess(true);
      setInviteEmail("");
      loadDashboard();
    } catch (err: any) {
      setInviteError(err.message || "Error al invitar");
    } finally {
      setInviting(false);
    }
  }

  // ── Loading / Error states ──

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={loadDashboard} className="gap-2">
          <RefreshCw size={16} />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // ── Trend helpers ──

  // Filtered client data
  const hayClienteEspecifico = filtroCliente && filtroCliente !== "todos";
  const clientesFiltrados = hayClienteEspecifico
    ? data.clientes_salud.filter((c) => c.empresa_id === filtroCliente)
    : data.clientes_salud;
  const clienteSeleccionado = hayClienteEspecifico
    ? data.clientes_salud.find((c) => c.empresa_id === filtroCliente) || null
    : null;
  // Actividad: solo se muestra cuando hay un cliente seleccionado
  const actividadFiltrada = hayClienteEspecifico
    ? data.actividad_reciente.filter((a) => a.empresa_id === filtroCliente)
    : [];

  // Trends de la asesoria propia
  const facPropiaTrend = trendPercent(data.facturacion_propia.este_mes, data.facturacion_propia.mes_anterior);
  const gasPropiaTrend = trendPercent(data.gastos_propios.este_mes, data.gastos_propios.mes_anterior);

  function TrendArrow({ trend, invertColor }: { trend: number | null; invertColor?: boolean }) {
    if (trend === null) {
      return <Minus size={14} className="text-muted-foreground" />;
    }
    // For gastos, increasing is bad (red) and decreasing is good (green)
    const isPositive = invertColor ? trend <= 0 : trend >= 0;
    if (trend > 0) {
      return (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
          <TrendingUp size={14} />
          +{trend}%
        </span>
      );
    }
    if (trend < 0) {
      return (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
          <TrendingDown size={14} />
          {trend}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus size={14} />
        0%
      </span>
    );
  }

  // ── Fiscal deadline urgency ──

  function deadlineColor(dias: number): string {
    if (dias <= 7) return "bg-red-100 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300";
    if (dias <= 15) return "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300";
    return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300";
  }

  // ── Health indicator ──

  const estadoConfig = {
    green: {
      dot: "bg-green-500",
      bg: "border-green-200 dark:border-green-800",
      label: "Al dia",
    },
    yellow: {
      dot: "bg-yellow-500",
      bg: "border-yellow-200 dark:border-yellow-800",
      label: "Atencion",
    },
    red: {
      dot: "bg-red-500",
      bg: "border-red-200 dark:border-red-800",
      label: "Critico",
    },
  };

  // ── Widget visibility ──
  const isWidgetVisible = (id: string) => {
    const w = widgetConfig.find((w) => w.id === id);
    return w ? w.visible : true; // default visible if not in config
  };

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vista consolidada de tu cartera de clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.kpis_basicos.clientes_activos > 0 && (
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {data.clientes_salud.map((c) => (
                  <SelectItem key={c.empresa_id} value={c.empresa_id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={loadDashboard} className="gap-2">
            <RefreshCw size={14} />
            Actualizar
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <Plus size={16} />
            Invitar Cliente
          </Button>
        </div>
      </div>

      {/* ── Section 1: KPIs de la Asesoria (propios) ── */}
      {isWidgetVisible("seccion_mi_asesoria") && <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CircleDollarSign size={20} className="text-primary" />
          Mi Asesoria
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Facturacion este mes</p>
                <TrendArrow trend={facPropiaTrend} />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(data.facturacion_propia.este_mes)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Gastos este mes</p>
                <TrendArrow trend={gasPropiaTrend} invertColor />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(data.gastos_propios.este_mes)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Beneficio este mes</p>
              <p className={`text-2xl font-bold ${data.beneficio_propio.este_mes >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(data.beneficio_propio.este_mes)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Facturacion YTD</p>
              <p className="text-2xl font-bold">{formatCurrency(data.facturacion_propia.ytd)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Beneficio YTD: <span className={data.beneficio_propio.ytd >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(data.beneficio_propio.ytd)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>}

      {/* ── Section 1b: KPIs del cliente seleccionado ── */}
      {isWidgetVisible("seccion_cartera_clientes") && data.kpis_basicos.clientes_activos > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Cartera de Clientes
            {clienteSeleccionado && (
              <Badge variant="secondary" className="text-xs font-normal">
                {clienteSeleccionado.nombre}
              </Badge>
            )}
          </h2>
          {!clienteSeleccionado ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Selecciona un cliente en el filtro superior para ver sus datos financieros
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.kpis_basicos.clientes_activos} cliente{data.kpis_basicos.clientes_activos !== 1 ? "s" : ""} activo{data.kpis_basicos.clientes_activos !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-muted-foreground">Facturación este mes</p>
                      <TrendArrow trend={trendPercent(clienteSeleccionado.facturacion?.este_mes || 0, clienteSeleccionado.facturacion?.mes_anterior || 0)} />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(clienteSeleccionado.facturacion?.este_mes || 0)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-muted-foreground">Gastos este mes</p>
                      <TrendArrow trend={trendPercent(clienteSeleccionado.gastos?.este_mes || 0, clienteSeleccionado.gastos?.mes_anterior || 0)} invertColor />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(clienteSeleccionado.gastos?.este_mes || 0)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Beneficio este mes</p>
                    <p className={`text-2xl font-bold ${(clienteSeleccionado.beneficio?.este_mes || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(clienteSeleccionado.beneficio?.este_mes || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Facturación YTD</p>
                    <p className="text-2xl font-bold">{formatCurrency(clienteSeleccionado.facturacion?.ytd || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Beneficio YTD: <span className={(clienteSeleccionado.beneficio?.ytd || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(clienteSeleccionado.beneficio?.ytd || 0)}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/asesor/clientes/${filtroCliente}`)}
                  className="gap-1"
                >
                  Ver detalle completo
                  <ArrowRight size={14} />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Section 2: Alertas rapidas ── */}
      {isWidgetVisible("seccion_alertas") && <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          Alertas Rapidas
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Fiscal deadlines */}
          {data.plazos_fiscales.length > 0 ? (
            data.plazos_fiscales.map((plazo, i) => (
              <div
                key={`plazo-${i}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${deadlineColor(plazo.dias_restantes)}`}
              >
                <Calendar size={18} />
                <div>
                  <p className="text-sm font-semibold">
                    Modelo {plazo.modelo} - {plazo.periodo}
                  </p>
                  <p className="text-xs">
                    {plazo.descripcion} &middot;{" "}
                    {plazo.dias_restantes <= 0
                      ? "Vencido"
                      : `${plazo.dias_restantes} dias restantes`}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
              <Calendar size={18} />
              <p className="text-sm">Sin plazos fiscales proximos</p>
            </div>
          )}

          {/* Clients with alerts */}
          {data.clientes_con_alertas > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-red-100 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
              <AlertTriangle size={18} />
              <div>
                <p className="text-sm font-semibold">Clientes con alertas</p>
                <p className="text-xs">
                  {data.clientes_con_alertas} cliente{data.clientes_con_alertas !== 1 ? "s" : ""} requiere{data.clientes_con_alertas !== 1 ? "n" : ""} atencion
                </p>
              </div>
              <Badge variant="destructive" className="ml-1">
                {data.clientes_con_alertas}
              </Badge>
            </div>
          )}

          {/* Clients with pending invoices */}
          {data.clientes_facturas_pendientes.total_clientes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
              <Receipt size={18} />
              <div>
                <p className="text-sm font-semibold">Facturas pendientes</p>
                <p className="text-xs">
                  {data.clientes_facturas_pendientes.total_clientes} cliente{data.clientes_facturas_pendientes.total_clientes !== 1 ? "s" : ""} &middot;{" "}
                  {formatCurrency(data.clientes_facturas_pendientes.total_importe)}
                </p>
              </div>
              <Badge className="ml-1 bg-orange-600 hover:bg-orange-700">
                {data.clientes_facturas_pendientes.total_clientes}
              </Badge>
            </div>
          )}

          {/* General KPIs inline */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/50">
            <Users size={18} className="text-primary" />
            <div>
              <p className="text-sm font-semibold">{data.kpis_basicos.clientes_activos} activos</p>
              <p className="text-xs text-muted-foreground">Clientes vinculados</p>
            </div>
          </div>

          {data.kpis_basicos.invitaciones_pendientes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300">
              <Mail size={18} />
              <div>
                <p className="text-sm font-semibold">Invitaciones pendientes</p>
                <p className="text-xs">{data.kpis_basicos.invitaciones_pendientes} sin aceptar</p>
              </div>
            </div>
          )}

          {data.kpis_basicos.mensajes_no_leidos > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <MessageSquare size={18} />
              <div>
                <p className="text-sm font-semibold">Mensajes no leidos</p>
                <p className="text-xs">{data.kpis_basicos.mensajes_no_leidos} mensaje{data.kpis_basicos.mensajes_no_leidos !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}

          {/* Widget RETA Autonomos */}
          <RetaDashboardWidget />
        </div>
      </div>}

      {/* ── Section 3: Clientes - Semaforo de salud ── */}
      {isWidgetVisible("seccion_salud_clientes") && <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users size={20} className="text-primary" />
          Salud de Clientes
        </h2>
        {clientesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No tienes clientes vinculados todavia.</p>
              <p className="text-muted-foreground text-sm mt-1">
                Invita a tu primer cliente para comenzar.
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => setInviteOpen(true)}
              >
                <Plus size={16} />
                Invitar Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clientesFiltrados.map((cliente) => {
              const cfg = estadoConfig[cliente.estado];
              return (
                <Card
                  key={cliente.empresa_id}
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 group ${cfg.bg}`}
                  onClick={() => router.push(`/asesor/clientes/${cliente.empresa_id}`)}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0`} />
                        <p className="font-semibold text-sm leading-tight">{cliente.nombre}</p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {cliente.facturas_mes} factura{cliente.facturas_mes !== 1 ? "s" : ""}/mes
                      </span>
                      {cliente.alertas > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {cliente.alertas} alerta{cliente.alertas !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {cliente.alertas === 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300 dark:border-green-700">
                          {cfg.label}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>}

      {/* ── Section 4: Actividad reciente ── */}
      {isWidgetVisible("seccion_actividad") && <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          Actividad Reciente
          {clienteSeleccionado && (
            <Badge variant="secondary" className="text-xs font-normal">
              {clienteSeleccionado.nombre}
            </Badge>
          )}
        </h2>
        {actividadFiltrada.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Activity size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Sin actividad reciente</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4 pb-2">
              <div className="divide-y">
                {actividadFiltrada.map((act, i) => (
                  <div key={`act-${i}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        act.tipo === "factura"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
                      }`}
                    >
                      {act.tipo === "factura" ? <Receipt size={16} /> : <Wallet size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{act.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {act.empresa_nombre}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock size={12} />
                      {relativeTime(act.fecha)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>}

      {/* ── Invite dialog ── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail("");
            setInviteError(null);
            setInviteSuccess(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Cliente</DialogTitle>
            <DialogDescription>
              Introduce el email del administrador de la empresa que deseas
              vincular como cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="invite-email"
                className="text-sm font-medium mb-1.5 block"
              >
                Email de la empresa
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
                disabled={inviting}
              />
            </div>

            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}

            {inviteSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Invitacion enviada correctamente.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="gap-2"
            >
              {inviting ? (
                <>
                  <LoadingSpinner size="sm" showText={false} />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Enviar Invitacion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
