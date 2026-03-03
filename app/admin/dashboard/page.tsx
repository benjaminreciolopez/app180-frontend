
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  RefreshCw, Euro, X
} from "lucide-react";
import { saveAs } from "file-saver";

// --- Imported Types & Widgets ---
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
import { useDashboard } from "@/hooks/useDashboard";

const ALL_WIDGETS = ALL_DASHBOARD_WIDGETS;

export default function DashboardPage() {
  const router = useRouter();
  const { dashData: data, widgets: fetchedWidgets, modulos, isLoading: loading, isRefetching, error, refetch } = useDashboard();

  // Derive widget visibility
  const widgets = fetchedWidgets.length > 0
    ? fetchedWidgets
    : (data ? ALL_WIDGETS.map((wd, index) => ({ id: wd.id, visible: true, order: index })) : []);
  const widgetsLoaded = !!data;

  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const pullProgressRef = useRef(0);
  const refreshingRef = useRef(false);
  const refetchRef = useRef(refetch);

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

  const hasModule = (name: string) => {
    if (!modulos) return false;
    return modulos[name] === true;
  };

  const isWidgetVisible = (id: string) => {
    if (!widgetsLoaded) return false;
    const w = widgets.find((w) => w.id === id);
    return w ? w.visible : false;
  };

  const shouldShowWidget = (id: string, module: string | null) => {
    if (module && !hasModule(module)) return false;
    return isWidgetVisible(id);
  };

  // Keep refs updated
  useEffect(() => { refetchRef.current = refetch; });
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  // Sync pull-to-refresh state with React Query
  useEffect(() => {
    if (!isRefetching && refreshing) {
      setRefreshing(false);
      setPullProgress(0);
    }
  }, [isRefetching, refreshing]);

  // Pull-to-Refresh con listeners nativos (evita problemas de eventos sintéticos de React)
  useEffect(() => {
    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      } else {
        startY = 0;
        pulling = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || startY === 0) return;
      const diff = e.touches[0].pageY - startY;
      if (diff > 0 && window.scrollY === 0) {
        // Prevenir scroll nativo del navegador durante el arrastre
        e.preventDefault();
        const progress = Math.min(diff / 160, 1);
        pullProgressRef.current = progress;
        setPullProgress(progress);
      } else {
        pulling = false;
        pullProgressRef.current = 0;
        setPullProgress(0);
      }
    };

    const onTouchEnd = () => {
      if (pullProgressRef.current > 0.4 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        refetchRef.current();
      }
      pullProgressRef.current = 0;
      startY = 0;
      pulling = false;
      setPullProgress(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handleRefresh = () => refetchRef.current();
    window.addEventListener("session-updated", handleRefresh);
    return () => window.removeEventListener("session-updated", handleRefresh);
  }, []);

  if (loading && !data) return <SkeletonDashboard />;
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={refetch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Reintentar</button>
    </div>
  );
  if (!data) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">No se pudieron cargar los datos</p>
      <button onClick={refetch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Reintentar</button>
    </div>
  );

  return (
    <div
      className="p-2 md:p-8 w-full space-y-4 md:space-y-8 pb-20 md:pb-8 min-w-0 overflow-x-hidden relative"
    >
      {/* Overlay solo en refresh manual (no en carga inicial, que ya tiene skeleton) */}
      {(refreshing || isRefetching) && !pullProgress && data && (
        <div className="fixed inset-0 z-[100] bg-background/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
          <div className="bg-card/80 p-6 rounded-2xl shadow-xl border flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse">Actualizando...</p>
          </div>
        </div>
      )}

      {/* Indicador Pull */}
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visión general y métricas clave.</p>
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
                  onClick={() => previewUrl && saveAs(previewUrl, `Factura_${previewFacturaNum}.pdf`)}
                  className="text-sm text-blue-600 hover:underline px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Descargar
                </button>
                <button
                  onClick={() => { setPreviewUrl(null); setIsPreviewOpen(false); }}
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

      {/* Widgets */}
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
        {shouldShowWidget("kpi_gcal_sync", "calendario") && data.calendarioSyncStatus?.enabled && (
          <div className="col-span-1 h-full"><KpiGCal status={data.calendarioSyncStatus} /></div>
        )}
      </div>

      {/* Charts & Lists */}
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
