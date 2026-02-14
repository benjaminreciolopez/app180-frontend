"use client";

import { useEffect, useState, useRef } from "react";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/services/api";
import { getUser, logout } from "@/services/auth";
import {
  Settings, Users, Clock, AlertTriangle, Briefcase, Calendar,
  Eye, EyeOff, ChevronUp, ChevronDown, LayoutGrid, X,
  UserCheck, Euro, FileText, ClipboardList, RefreshCw, History, Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { showSuccess } from "@/lib/toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DashboardData {
  empleadosActivos: number;
  fichajesHoy: number;
  sospechososHoy: number;
  trabajandoAhora: { id: string; empleado_nombre: string; cliente_nombre: string | null; estado: string; desde: string }[];
  ultimosFichajes: { id: string; empleado_nombre: string; cliente_nombre: string | null; tipo: string; fecha: string }[];
  facturasPendientesList?: { id: string; numero: string; total: string; fecha_emision: string; cliente_nombre: string | null; estado_pago: string; estado: string }[];
  clientesActivos: number;
  clientesNuevos: number;
  facturasPendientes: number;
  cobrosPendientes: number;
  saldoTotal: number;
  trabajosPendientes: number;
  trabajosPendientesList?: { id: string; descripcion: string; fecha: string; cliente_nombre: string | null; estado_detalle: string }[];
  partesHoy: number;
  calendarioSyncStatus: {
    connected: boolean;
    lastSync: string | null;
    enabled: boolean;
  } | null;
  stats?: {
    fichajesUltimosDias: { dia: string; cantidad: number }[];
    fichajesPorTipoHoy: { tipo: string; cantidad: number }[];
    topClientesSemana: { nombre: string; total: number }[];
  };
}

type WidgetConfig = { id: string; visible: boolean };

const ALL_WIDGETS = [
  { id: "kpi_empleados", label: "KPI: Empleados activos", module: "empleados", icon: Users },
  { id: "kpi_fichajes", label: "KPI: Fichajes hoy", module: "fichajes", icon: Clock },
  { id: "kpi_sospechosos", label: "KPI: Sospechosos", module: "fichajes", icon: AlertTriangle },
  { id: "kpi_calendario", label: "KPI: Calendario", module: "calendario", icon: Calendar },
  { id: "kpi_clientes", label: "KPI: Clientes", module: "clientes", icon: UserCheck },
  { id: "kpi_facturacion", label: "KPI: Facturación", module: "facturacion", icon: Euro },
  { id: "kpi_trabajos", label: "KPI: Trabajos Pendientes", module: "partes_dia", icon: ClipboardList },
  { id: "kpi_gcal_sync", label: "Google Calendar", module: "calendario", icon: RefreshCw },
  { id: "chart_actividad", label: "Actividad semanal", module: "fichajes", icon: LayoutGrid },
  { id: "chart_clientes", label: "Top clientes / Distribución", module: null, icon: LayoutGrid },
  { id: "list_trabajando", label: "Trabajando ahora", module: "fichajes", icon: Briefcase },
  { id: "list_fichajes", label: "Últimos fichajes", module: "fichajes", icon: Clock },
  { id: "list_facturas", label: "Facturas pendientes", module: "facturacion", icon: Euro },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [widgetsLoaded, setWidgetsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [editingWidgets, setEditingWidgets] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Estados para previsualización PDF
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [previewFacturaNum, setPreviewFacturaNum] = useState<string>("");
  const [isTrabajosModalOpen, setIsTrabajosModalOpen] = useState(false);

  const handleOpenPreview = async (id: string, numero: string) => {
    try {
      setLoadingPdfId(id);
      setPreviewFacturaNum(numero);
      const res = await api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } catch (e) {
      console.error("Error al cargar PDF", e);
    } finally {
      setLoadingPdfId(null);
    }
  };

  function hasModule(name: string) {
    return modulos[name] !== false;
  }

  function isWidgetVisible(id: string) {
    // Si aún no se cargó configuración, mostrar todos por defecto
    if (!widgetsLoaded) return true;

    // Si se cargó configuración, buscar el widget
    const w = widgets.find((w) => w.id === id);

    // Si está en la config, usar su valor; si no está, mostrar por defecto (nuevo widget)
    return w ? w.visible : true;
  }

  function shouldShowWidget(id: string, module: string | null) {
    if (module && !hasModule(module)) return false;
    return isWidgetVisible(id);
  }

  async function loadAll() {
    try {
      setLoading(true);
      const [dashRes, widgetRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/configuracion/widgets").catch(() => ({ data: { widgets: [] } })),
      ]);
      setData(dashRes.data);
      let w = widgetRes.data.widgets;

      // Cargar módulos actualizados de la sesión cada vez que cargamos todo
      const user = getUser();
      if (user) {
        const isLargeScreen = typeof window !== "undefined" && window.innerWidth >= 1024;
        const isPwaMobile = isMobileDevice() && isStandalone();
        const useMobileModules = isPwaMobile && !isLargeScreen;
        const activeModulos = useMobileModules && user.modulos_mobile
          ? user.modulos_mobile
          : user.modulos || {};

        setModulos(activeModulos);
      }

      // FIX: El backend devuelve widgets como string JSON, necesitamos parsearlo
      if (typeof w === 'string') {
        try {
          w = JSON.parse(w);
        } catch (e) {
          console.error('Error parseando widgets:', e);
          w = [];
        }
      }

      const finalWidgets = Array.isArray(w) ? w : [];
      setWidgets(finalWidgets);
      setWidgetsLoaded(true);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudieron cargar los datos");
      setWidgetsLoaded(true); // Marcar como cargado incluso si falla
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

    const onSessionUpdated = () => {
      // Recargar datos (loadAll ya se encarga de leer el usuario y actualizar módulos)
      loadAll();
    };

    window.addEventListener("session-updated", onSessionUpdated);
    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleWidget(id: string) {
    setWidgets((prev) => {
      const existing = prev.find((w) => w.id === id);
      if (existing) {
        return prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      }
      return [...prev, { id, visible: false }];
    });
  }

  function moveWidget(id: string, direction: "up" | "down") {
    const order = getWidgetOrder();
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setWidgets(newOrder.map((wid) => {
      const existing = widgets.find((w) => w.id === wid);
      return { id: wid, visible: existing ? existing.visible : true };
    }));
  }

  function getWidgetOrder(): string[] {
    const safeWidgets = Array.isArray(widgets) ? widgets : [];
    const configured = safeWidgets.map((w) => w.id);
    const unconfigured = ALL_WIDGETS.map((w) => w.id).filter((id) => !configured.includes(id));
    return [...configured, ...unconfigured];
  }

  async function saveWidgets() {
    try {
      await api.put("/admin/configuracion/widgets", { widgets });
      showSuccess("Widgets guardados");
      setEditingWidgets(false);
    } catch {
      // silent
    }
  }

  function hora(d: string) {
    return new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  function fecha(d: string) {
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }
  function fechaGrafico(d: string) {
    const p = d.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : d;
  }
  function labelTipo(t: string) {
    const m: Record<string, string> = { entrada: "ENTRADA", salida: "SALIDA", descanso_inicio: "INICIO DESCANSO", descanso_fin: "FIN DESCANSO" };
    return m[t] || t.toUpperCase();
  }
  function badgeClass(t: string) {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    const m: Record<string, string> = { entrada: `bg-green-100 text-green-800 ${base}`, salida: `bg-red-100 text-red-800 ${base}`, descanso_inicio: `bg-yellow-100 text-yellow-800 ${base}`, descanso_fin: `bg-yellow-100 text-yellow-800 ${base}` };
    return m[t] || `bg-gray-100 text-gray-800 ${base}`;
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (error || !data) {
    return (
      <div className="app-main">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4"><p className="text-red-700">{error}</p></div>
        <button onClick={loadAll} className="btn-primary">Reintentar</button>
      </div>
    );
  }

  const orderedWidgets = getWidgetOrder();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen general de actividad</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingWidgets(!editingWidgets)}
            className={`p-2 rounded-lg transition-colors ${editingWidgets ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
            title="Personalizar widgets"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setOpenMenu(!openMenu)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
                <Link href="/admin/configuracion" className="block px-4 py-3 text-sm hover:bg-gray-50" onClick={() => setOpenMenu(false)}>Configuración</Link>
                <Link href="/admin/perfil" className="block px-4 py-3 text-sm hover:bg-gray-50" onClick={() => setOpenMenu(false)}>Perfil</Link>
                <div className="border-t" />
                <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50" onClick={logout}>Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Editor Panel */}
      {editingWidgets && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Personalizar Dashboard</h3>
            <div className="flex gap-2">
              <button onClick={saveWidgets} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-600">Guardar</button>
              <button onClick={() => setEditingWidgets(false)} className="p-1"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {orderedWidgets.map((id, idx) => {
              const def = ALL_WIDGETS.find((w) => w.id === id);
              if (!def) return null;
              if (def.module && !hasModule(def.module)) return null;
              const visible = isWidgetVisible(id);
              const Icon = def.icon;
              return (
                <div key={id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${visible ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                  <button onClick={() => toggleWidget(id)} className="shrink-0">
                    {visible ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                  </button>
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs flex-1 truncate">{def.label}</span>
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => moveWidget(id, "up")} disabled={idx === 0} className="disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => moveWidget(id, "down")} disabled={idx === orderedWidgets.length - 1} className="disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shouldShowWidget("kpi_empleados", "empleados") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Empleados</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.empleadosActivos}</p>
              </div>
              <div className="p-2 md:p-3 bg-blue-50 rounded-lg"><Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" /></div>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_fichajes", "fichajes") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Fichajes Hoy</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.fichajesHoy}</p>
              </div>
              <div className="p-2 md:p-3 bg-green-50 rounded-lg"><Clock className="w-5 h-5 md:w-6 md:h-6 text-green-600" /></div>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_sospechosos", "fichajes") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Sospechosos</p>
                <p className={`text-2xl md:text-3xl font-bold mt-1 ${data.sospechososHoy > 0 ? "text-red-600" : ""}`}>{data.sospechososHoy}</p>
              </div>
              <div className={`p-2 md:p-3 rounded-lg ${data.sospechososHoy > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${data.sospechososHoy > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_calendario", "calendario") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Calendario</p>
                <Link href="/admin/calendario" className="text-sm font-semibold text-primary hover:underline mt-1 inline-block">Ver planificación</Link>
              </div>
              <div className="p-2 md:p-3 bg-purple-50 rounded-lg"><Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600" /></div>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_clientes", "clientes") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Clientes</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.clientesActivos}</p>
                <p className="text-xs text-gray-400 mt-1">+{data.clientesNuevos} este mes</p>
              </div>
              <Link href="/admin/clientes" className="p-2 md:p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              </Link>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_facturacion", "facturacion") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Por Cobrar</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.saldoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                <p className="text-xs text-gray-400 mt-1">{data.facturasPendientes} facturas</p>
              </div>
              <Link href="/admin/facturacion/pagos" className="p-2 md:p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                <Euro className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </Link>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_trabajos", "partes_dia") && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Trabajos</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.trabajosPendientes}</p>
                <p className="text-xs text-gray-400 mt-1">Pendientes de cobro</p>
              </div>
              <button
                onClick={() => setIsTrabajosModalOpen(true)}
                className="p-2 md:p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                title="Ver lista de pendientes"
              >
                <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </button>
            </div>
          </div>
        )}
        {shouldShowWidget("kpi_gcal_sync", "calendario") && data.calendarioSyncStatus && (
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Google Calendar</p>
                {data.calendarioSyncStatus.connected ? (
                  <>
                    <p className="text-sm font-semibold text-green-600 mt-1">Conectado</p>
                    <div className="flex gap-2 mt-2">
                      <Link href="/admin/configuracion" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Config
                      </Link>
                      <Link href="/admin/configuracion/calendario/importaciones" className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                        <History className="w-3 h-3" /> Historial
                      </Link>
                      <Link href="/admin/configuracion/calendario/importar" className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Importar
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-400 mt-1">No conectado</p>
                    <Link href="/admin/configuracion" className="text-xs text-blue-600 hover:underline mt-2 inline-block">Configurar</Link>
                  </>
                )}
              </div>
              <div className={`p-2 md:p-3 rounded-lg ${data.calendarioSyncStatus.connected ? 'bg-green-50' : 'bg-gray-50'}`}>
                <Calendar className={`w-5 h-5 md:w-6 md:h-6 ${data.calendarioSyncStatus.connected ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {data.stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shouldShowWidget("chart_actividad", "fichajes") && (
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
              <h3 className="text-base md:text-lg font-semibold">Actividad Semanal</h3>
              <p className="text-xs md:text-sm text-gray-500 mb-4">Fichajes últimos 7 días</p>
              <div className="h-52 md:h-64 w-full min-h-[200px]">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.stats.fichajesUltimosDias}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={fechaGrafico} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {shouldShowWidget("chart_clientes", null) && (hasModule("clientes") || hasModule("fichajes")) && (
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
              <h3 className="text-base md:text-lg font-semibold mb-4">
                {hasModule("clientes") ? "Top Clientes (Semana)" : "Distribución Tipos Hoy"}
              </h3>
              <div className="h-52 md:h-64 w-full min-h-[200px]">
                {hasModule("clientes") && data.stats && data.stats.topClientesSemana.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={data.stats.topClientesSemana} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : hasModule("fichajes") && data.stats && data.stats.fichajesPorTipoHoy.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%">
                    <PieChart>
                      <Pie data={data.stats.fichajesPorTipoHoy} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="cantidad">
                        {data.stats.fichajesPorTipoHoy.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <LayoutGrid className="w-8 h-8 opacity-20" />
                    <p className="text-xs">No hay datos suficientes para mostrar el gráfico</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {shouldShowWidget("list_trabajando", "fichajes") && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-gray-400" /> Trabajando ahora</h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{data.trabajandoAhora.length}</span>
            </div>
            {!data.trabajandoAhora.length ? (
              <div className="p-8 text-center text-gray-500 text-sm">Nadie fichando actualmente</div>
            ) : (
              <div className="divide-y max-h-[350px] overflow-y-auto">
                {data.trabajandoAhora.map((t) => (
                  <div key={t.id} className="p-3 md:p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{t.empleado_nombre}</div>
                      <div className="text-xs text-gray-500">{t.cliente_nombre || "Sin cliente"} · Desde {hora(t.desde)}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {shouldShowWidget("list_fichajes", "fichajes") && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 md:p-6 border-b">
              <h2 className="text-base md:text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Últimos fichajes</h2>
            </div>
            {!data.ultimosFichajes.length ? (
              <div className="p-8 text-center text-gray-500 text-sm">No hay actividad reciente</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-gray-500">
                    <tr>
                      <th className="px-4 md:px-6 py-3 font-medium">Empleado</th>
                      <th className="px-4 md:px-6 py-3 font-medium hidden sm:table-cell">Cliente</th>
                      <th className="px-4 md:px-6 py-3 font-medium">Estado</th>
                      <th className="px-4 md:px-6 py-3 font-medium text-right">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.ultimosFichajes.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-4 md:px-6 py-3 font-medium">{f.empleado_nombre}</td>
                        <td className="px-4 md:px-6 py-3 text-gray-500 hidden sm:table-cell">{f.cliente_nombre || "—"}</td>
                        <td className="px-4 md:px-6 py-3"><span className={badgeClass(f.tipo)}>{labelTipo(f.tipo)}</span></td>
                        <td className="px-4 md:px-6 py-3 text-gray-500 text-right">
                          <div className="flex flex-col items-end"><span>{hora(f.fecha)}</span><span className="text-xs text-gray-400">{fecha(f.fecha)}</span></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {shouldShowWidget("list_facturas", "facturacion") && data.facturasPendientesList && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden lg:col-span-2">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold flex items-center gap-2"><Euro className="w-5 h-5 text-gray-400" /> Facturas Pendientes de Cobro</h2>
            </div>
            {!data.facturasPendientesList.length ? (
              <div className="p-8 text-center text-gray-500 text-sm">No hay facturas pendientes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-gray-500">
                    <tr>
                      <th className="px-4 md:px-6 py-3 font-medium">Número</th>
                      <th className="px-4 md:px-6 py-3 font-medium">Cliente</th>
                      <th className="px-4 md:px-6 py-3 font-medium">Fecha</th>
                      <th className="px-4 md:px-6 py-3 font-medium">Estado Pago</th>
                      <th className="px-4 md:px-6 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.facturasPendientesList.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-4 md:px-6 py-3 font-medium text-blue-600">
                          <button
                            onClick={() => {
                              if (f.estado === 'BORRADOR') {
                                router.push(`/admin/facturacion/editar/${f.id}`);
                              } else {
                                handleOpenPreview(f.id, f.numero);
                              }
                            }}
                            className="text-blue-600 hover:underline font-medium flex items-center gap-2 cursor-pointer"
                            disabled={loadingPdfId === f.id}
                          >
                            {loadingPdfId === f.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : null}
                            {f.numero}
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-3">{f.cliente_nombre || "—"}</td>
                        <td className="px-4 md:px-6 py-3 text-gray-500">{fecha(f.fecha_emision)}</td>
                        <td className="px-4 md:px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.estado_pago === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {f.estado_pago === 'parcial' ? 'PARCIAL' : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 font-bold text-right">{Number(f.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Previsualización PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-slate-50 flex-row justify-between items-center space-y-0">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-blue-600" />
                Visualizar Factura {previewFacturaNum}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm">
                Vista previa del documento generado
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title="Vista previa factura"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium">Cargando documento...</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="px-6 border-slate-200 hover:bg-slate-100">
              Cerrar
            </Button>
            {previewUrl && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-100">
                <a href={previewUrl} download={`Factura_${previewFacturaNum}.pdf`} className="flex items-center gap-2">
                  DESCARGAR PDF
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Trabajos Pendientes */}
      <Dialog open={isTrabajosModalOpen} onOpenChange={setIsTrabajosModalOpen}>
        <DialogContent className="max-w-3xl flex flex-col p-0 bg-white border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-orange-50/50 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-orange-800">
                  <ClipboardList className="w-6 h-6 text-orange-600" />
                  Trabajos Pendientes de Cobro
                </DialogTitle>
                <DialogDescription className="text-orange-600/80 text-sm mt-1">
                  Listado completo de trabajos sin cobrar.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 whitespace-nowrap">
                  {data.trabajosPendientesList?.length || 0} REGISTROS
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="mt-4 flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
              <Users className="w-4 h-4 text-slate-400 ml-2" />
              <select
                className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 w-full cursor-pointer outline-none"
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  const rows = document.querySelectorAll('.job-row');
                  rows.forEach(row => {
                    const clientName = row.getAttribute('data-client')?.toLowerCase() || '';
                    if (val === 'all' || clientName.includes(val)) {
                      (row as HTMLElement).style.display = '';
                    } else {
                      (row as HTMLElement).style.display = 'none';
                    }
                  });
                }}
              >
                <option value="all">Ver todos los clientes</option>
                {Array.from(new Set(data.trabajosPendientesList?.map(j => j.cliente_nombre).filter(Boolean))).sort().map(client => (
                  <option key={client} value={client!}>{client}</option>
                ))}
              </select>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30">
            {!data.trabajosPendientesList || data.trabajosPendientesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <ClipboardList className="w-16 h-16 opacity-10" />
                <p className="text-lg font-light">No hay trabajos pendientes de cobro.</p>
              </div>
            ) : (
              <div className="min-w-[800px]">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold border-b bg-slate-50">Fecha</th>
                      <th className="px-6 py-4 font-semibold border-b bg-slate-50">Cliente</th>
                      <th className="px-6 py-4 font-semibold border-b bg-slate-50 w-1/2">Descripción</th>
                      <th className="px-6 py-4 font-semibold border-b bg-slate-50 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.trabajosPendientesList.map((job) => (
                      <tr key={job.id} className="job-row hover:bg-orange-50/30 transition-colors group" data-client={job.cliente_nombre}>
                        <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">
                          {fecha(job.fecha)}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {job.cliente_nombre || <span className="text-slate-400 italic font-normal">Sin cliente asignado</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 relative">
                          {job.descripcion}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border inline-flex items-center gap-1.5",
                            job.estado_detalle === 'NO_FACTURADO' ? "bg-slate-100 text-slate-500 border-slate-200" :
                              job.estado_detalle === 'EN_BORRADOR' ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                "bg-orange-50 text-orange-600 border-orange-200"
                          )}>
                            {job.estado_detalle === 'NO_FACTURADO' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                            {job.estado_detalle === 'EN_BORRADOR' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                            {job.estado_detalle === 'FACTURADO_PENDIENTE' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                            {job.estado_detalle?.replace('_', ' ') || 'PENDIENTE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 flex-shrink-0">
            <Button variant="outline" onClick={() => setIsTrabajosModalOpen(false)} className="px-6 border-slate-200 hover:bg-white text-slate-600">
              Cerrar
            </Button>
            <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 shadow-md shadow-orange-100">
              <Link href="/admin/trabajos" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                IR A LISTADO DE TRABAJOS
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
