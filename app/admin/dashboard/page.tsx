
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import { getUser, logout } from "@/services/auth";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import {
  Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList,
  RefreshCw, Briefcase, LayoutGrid, X, Save, Settings, TrendingUp, LogOut, Cog
} from "lucide-react";
import { saveAs } from "file-saver";

// --- Imported Types & Widgets ---
import { DashboardData } from "@/types/dashboard";
import { BeneficioRealCard } from "@/components/admin/dashboard/BeneficioRealCard";
import {
  KpiEmpleados, KpiFichajes, KpiSospechosos, KpiCalendario,
  KpiClientes, KpiFacturacion, KpiTrabajos, KpiGCal
} from "@/components/admin/dashboard/widgets/KpiWidgets";
import { ChartActividad, ChartClientesOrTipos } from "@/components/admin/dashboard/widgets/ChartWidgets";
import { ListTrabajando, ListFichajes, ListFacturas } from "@/components/admin/dashboard/widgets/ListWidgets";
import { TrabajosPendientesModal } from "@/components/admin/dashboard/TrabajosPendientesModal";
import { SkeletonDashboard } from "@/components/ui/skeletons";
import { ALL_DASHBOARD_WIDGETS } from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";

// --- Logic ---

interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

// La lista maestra ahora se importa de @/lib/dashboard-widgets
const ALL_WIDGETS = ALL_DASHBOARD_WIDGETS;

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [modulos, setModulos] = useState<Record<string, boolean> | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [widgetsLoaded, setWidgetsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [editingWidgets, setEditingWidgets] = useState(false);
  const [savingWidgets, setSavingWidgets] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Pull-to-refresh states
  const [startY, setStartY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

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
    if (!modulos) return false; // Bloqueo preventivo si no hay datos
    return modulos[name] === true;
  }

  function isWidgetVisible(id: string) {
    if (!widgetsLoaded) return true; // Si aún no se cargó configuración, mostrar todos por defecto
    const w = widgets.find((w) => w.id === id);
    return w ? w.visible : true;
  }

  function shouldShowWidget(id: string, module: string | null) {
    // Si el módulo no está activo, el widget se oculta SIEMPRE, ignore config
    if (module && !hasModule(module)) return false;

    // Si el módulo es null (global) o está activo, respetamos la visibilidad configurada
    return isWidgetVisible(id);
  }

  async function loadAll() {
    try {
      setLoading(true);
      const [dashRes, widgetRes] = await Promise.all([
        api.get("/api/admin/dashboard"),
        api.get("/admin/configuracion/widgets").catch(() => ({ data: { widgets: [] } })),
      ]);

      const dashboardData = dashRes.data as DashboardData;
      setData(dashboardData);

      const isLargeScreen = typeof window !== "undefined" && window.innerWidth >= 1024;
      const isPwaMobile = isMobileDevice() && isStandalone();
      const useMobileProfile = isPwaMobile && !isLargeScreen;

      // Resetear módulos antes de cargar para evitar "fantasmas"
      setModulos(null);

      // Cargar módulos primero para filtrar widgets
      const mods = await api.get(useMobileProfile ? "/auth/me/modules?mobile=true" : "/auth/me/modules");
      setModulos(mods.data || {});

      // Usar perfil de widgets correcto
      let w = useMobileProfile ? (widgetRes.data?.widgets_mobile || []) : (widgetRes.data?.widgets || []);

      // Si no hay configuración guardada, inicializamos con todos los widgets del sistema filtrados
      if (w.length === 0) {
        w = ALL_WIDGETS.map((wd, index) => ({ id: wd.id, visible: true, order: index }));
      }
      setWidgets(w);
      setWidgetsLoaded(true);
    } catch (err: any) {
      console.error("Error cargando dashboard:", err);
      setError(err.response?.data?.error || "Error al cargar datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullProgress(0);
    }
  }

  // --- Pull to Refresh Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setStartY(e.touches[0].pageY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return;
    const y = e.touches[0].pageY;
    const diff = y - startY;
    if (diff > 0 && window.scrollY === 0) {
      const progress = Math.min(diff / 150, 1);
      setPullProgress(progress);
    }
  };

  const handleTouchEnd = () => {
    // Reducimos el umbral de 0.8 a 0.5 (aprox 75px) para que sea más fácil activarlo
    if (pullProgress > 0.5 && !refreshing) {
      setRefreshing(true);
      loadAll();
    } else {
      setPullProgress(0);
    }
    setStartY(0);
  };

  useEffect(() => {
    loadAll();

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    // Escuchar actualizaciones de configuración para recargar datos
    const handleRefresh = () => loadAll();
    window.addEventListener("session-updated", handleRefresh);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("session-updated", handleRefresh);
    };
  }, []);

  async function saveWidgetsConfig() {
    try {
      setSavingWidgets(true);
      await api.put("/admin/configuracion/widgets", { widgets });
      setEditingWidgets(false);
    } catch (e) {
      console.error("Error guardando widgets", e);
      alert("Error al guardar la configuración");
    } finally {
      setSavingWidgets(false);
    }
  }

  function toggleWidget(id: string) {
    setWidgets((prev) => {
      const existing = prev.find((w) => w.id === id);
      if (existing) {
        return prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      } else {
        return [...prev, { id, visible: false, order: prev.length }];
      }
    });
  }

  if (loading) return <SkeletonDashboard />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div
      className="p-2 md:p-8 w-full space-y-4 md:space-y-8 pb-20 md:pb-8 min-w-0 overflow-x-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay de carga durante refresco forzado */}
      {(loading || refreshing) && !pullProgress && (
        <div className="fixed inset-0 z-[100] bg-background/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
          <div className="bg-card/80 p-6 rounded-2xl shadow-xl border flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse">Sincronizando Dashboard...</p>
          </div>
        </div>
      )}

      {/* Indicador Pull to Refresh */}
      {pullProgress > 0 && (
        <div
          className="absolute top-0 left-0 w-full flex justify-center py-2 pointer-events-none transition-opacity"
          style={{ opacity: pullProgress, transform: `translateY(${pullProgress * 20}px)` }}
        >
          <div className="bg-primary/10 text-primary p-2 rounded-full shadow-sm">
            <RefreshCw size={16} className={cn("animate-spin", pullProgress < 0.8 && "animate-none")} />
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visión general y métricas clave.</p>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Euro className="w-5 h-5 text-gray-500" /> Previsualizar Factura {previewFacturaNum}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (previewUrl) saveAs(previewUrl, `Factura_${previewFacturaNum}.pdf`);
                  }}
                  className="text-sm text-blue-600 hover:underline px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Descargar
                </button>
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setIsPreviewOpen(false);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-4">
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-full rounded-lg border shadow-sm bg-white" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Widget Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shouldShowWidget("kpi_beneficio", "facturacion") && data.beneficioReal && (
          <div className="col-span-2 lg:col-span-1 row-span-2 lg:row-span-1 h-full">
            <BeneficioRealCard data={data.beneficioReal} />
          </div>
        )}
        {shouldShowWidget("kpi_empleados", "empleados") && (
          <div className="col-span-1 h-full"><KpiEmpleados data={data.empleadosActivos} /></div>
        )}
        {shouldShowWidget("kpi_fichajes", "fichajes") && (
          <div className="col-span-1 h-full"><KpiFichajes data={data.fichajesHoy} /></div>
        )}
        {shouldShowWidget("kpi_sospechosos", "fichajes") && (
          <div className="col-span-1 h-full"><KpiSospechosos data={data.sospechososHoy} /></div>
        )}
        {shouldShowWidget("kpi_calendario", "calendario") && (
          <div className="col-span-1 h-full"><KpiCalendario /></div>
        )}
        {shouldShowWidget("kpi_clientes", "clientes") && (
          <div className="col-span-1 h-full"><KpiClientes activos={data.clientesActivos} nuevos={data.clientesNuevos} /></div>
        )}
        {shouldShowWidget("kpi_facturacion", "facturacion") && (
          <div className="col-span-1 h-full"><KpiFacturacion saldo={data.saldoTotal} facturas={data.facturasPendientes} /></div>
        )}
        {shouldShowWidget("kpi_trabajos", "partes_dia") && (
          <div className="col-span-1 h-full"><KpiTrabajos pendientes={data.trabajosPendientes} onOpenModal={() => setIsTrabajosModalOpen(true)} /></div>
        )}
        {
          shouldShowWidget("kpi_gcal_sync", "calendario") && data.calendarioSyncStatus && data.calendarioSyncStatus.enabled && (
            <div className="col-span-1 h-full"><KpiGCal status={data.calendarioSyncStatus} /></div>
          )
        }
      </div>

      {/* Charts & Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {shouldShowWidget("chart_actividad", "fichajes") && data.stats?.fichajesUltimosDias && (
          <ChartActividad data={data.stats.fichajesUltimosDias} />
        )}

        {shouldShowWidget("chart_clientes", "clientes") && (
          <ChartClientesOrTipos
            topClientes={data.stats?.topClientesSemana}
            distribucionTipos={data.stats?.fichajesPorTipoHoy}
            hasClientesModule={hasModule("clientes")}
            hasFichajesModule={hasModule("fichajes")}
            forceHideClientKpis={!hasModule("clientes")}
          />
        )}

        {shouldShowWidget("list_trabajando", "fichajes") && (
          <ListTrabajando data={data.trabajandoAhora} />
        )}

        {shouldShowWidget("list_fichajes", "fichajes") && (
          <ListFichajes data={data.ultimosFichajes} />
        )}

        {shouldShowWidget("list_facturas", "facturacion") && data.facturasPendientesList && (
          <ListFacturas
            data={data.facturasPendientesList}
            loadingPdfId={loadingPdfId}
            onPreview={handleOpenPreview}
            onEdit={(id) => router.push(`/admin/facturacion/facturas/editar/${id}`)}
          />
        )}
      </div>

      <TrabajosPendientesModal
        isOpen={isTrabajosModalOpen}
        onClose={() => setIsTrabajosModalOpen(false)}
        trabajos={data.trabajosPendientesList || []}
      />
    </div>
  );
}
