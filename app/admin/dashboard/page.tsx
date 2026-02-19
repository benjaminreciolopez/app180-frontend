
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { getUser } from "@/services/auth";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import {
  Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList,
  RefreshCw, Briefcase, LayoutGrid, X, Save, Settings, TrendingUp
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

// --- Logic ---

interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

const ALL_WIDGETS = [
  { id: "kpi_beneficio", label: "KPI: Beneficio Real", module: "facturacion", icon: TrendingUp },
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
  const [savingWidgets, setSavingWidgets] = useState(false);
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
    if (!widgetsLoaded) return true; // Si aún no se cargó configuración, mostrar todos por defecto
    const w = widgets.find((w) => w.id === id);
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

      const dashboardData = dashRes.data as DashboardData; // Type assertion

      setData(dashboardData);
      let w = widgetRes.data?.widgets || [];

      // Cargar módulos actualizados de la sesión
      const user = getUser();
      if (user) {
        const isLargeScreen = typeof window !== "undefined" && window.innerWidth >= 1024;
        const isPwaMobile = isMobileDevice() && isStandalone();
        const useMobileModules = isPwaMobile && !isLargeScreen;
        const mods = await api.get(useMobileModules ? "/auth/me/modules?mobile=true" : "/auth/me/modules");
        setModulos(mods.data || {});
      }

      // Si no hay configuración guardada, inicializamos con todos visibles
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
    }
  }

  useEffect(() => {
    loadAll();

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function saveWidgetsConfig() {
    try {
      setSavingWidgets(true);
      await api.post("/admin/configuracion/widgets", { widgets });
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

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visión general y métricas clave.</p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all text-sm font-medium text-gray-700"
          >
            <Settings className="w-4 h-4" /> Personalizar
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Configurar Widgets</h3>
                <button onClick={() => setOpenMenu(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {ALL_WIDGETS.filter(w => !w.module || hasModule(w.module)).map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 text-gray-500 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all">
                        <w.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{w.label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isWidgetVisible(w.id)} onChange={() => toggleWidget(w.id)} />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-gray-50">
                <button
                  onClick={() => {
                    saveWidgetsConfig();
                    setOpenMenu(false);
                  }}
                  disabled={savingWidgets}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {savingWidgets ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {shouldShowWidget("chart_clientes", null) && (
          <ChartClientesOrTipos
            topClientes={data.stats?.topClientesSemana}
            distribucionTipos={data.stats?.fichajesPorTipoHoy}
            hasClientesModule={hasModule("clientes")}
            hasFichajesModule={hasModule("fichajes")}
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
