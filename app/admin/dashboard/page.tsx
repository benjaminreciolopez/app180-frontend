
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw
} from "lucide-react";

// --- Imported Types & Widgets ---
import { BeneficioRealCard } from "@/components/admin/dashboard/BeneficioRealCard";
import {
  KpiEmpleados, KpiFichajes, KpiSospechosos, KpiCalendario,
  KpiClientes, KpiFacturacion, KpiTrabajos, KpiGCal,
  KpiFacturacionMes, KpiGastosMes, KpiBeneficioMes, KpiFacturacionYtd
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

  // Derive widget visibility — merge saved config with new widgets (default visible)
  const widgets = (() => {
    if (!data) return [];
    if (fetchedWidgets.length === 0) return ALL_WIDGETS.map((wd, index) => ({ id: wd.id, visible: true, order: index }));
    // Merge: keep saved config + add any new widgets not yet in config
    // If user has configured widgets, new ones default to hidden
    const savedIds = new Set(fetchedWidgets.map(w => w.id));
    const newWidgets = ALL_WIDGETS
      .filter(wd => !savedIds.has(wd.id))
      .map((wd, i) => ({ id: wd.id, visible: false, order: fetchedWidgets.length + i }));
    return [...fetchedWidgets, ...newWidgets];
  })();
  const widgetsLoaded = !!data;

  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const pullProgressRef = useRef(0);
  const refreshingRef = useRef(false);
  const refetchRef = useRef(refetch);

  const [isTrabajosModalOpen, setIsTrabajosModalOpen] = useState(false);

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

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shouldShowWidget("kpi_beneficio", "facturacion") && data.beneficioReal && (
          <div className="col-span-2 lg:col-span-1 row-span-2 lg:row-span-1 h-full">
            <BeneficioRealCard data={data.beneficioReal} />
          </div>
        )}
        {shouldShowWidget("kpi_facturacion_mes", "facturacion") && data.facturacionMensual && (
          <div className="col-span-1 h-full"><KpiFacturacionMes data={data.facturacionMensual} /></div>
        )}
        {shouldShowWidget("kpi_gastos_mes", "facturacion") && data.gastosMensuales && (
          <div className="col-span-1 h-full"><KpiGastosMes data={data.gastosMensuales} /></div>
        )}
        {shouldShowWidget("kpi_beneficio_mes", "facturacion") && data.facturacionMensual && data.gastosMensuales && (
          <div className="col-span-1 h-full"><KpiBeneficioMes facturacion={data.facturacionMensual} gastos={data.gastosMensuales} /></div>
        )}
        {shouldShowWidget("kpi_facturacion_ytd", "facturacion") && data.facturacionMensual && data.gastosMensuales && (
          <div className="col-span-1 h-full"><KpiFacturacionYtd facturacion={data.facturacionMensual} gastos={data.gastosMensuales} /></div>
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
            onOpenInvoice={(id) => router.push(`/admin/facturacion/editar/${id}`)}
            onRegistrarCobro={(clienteId, facturaId) =>
              router.push(`/admin/cobros-pagos?cliente_id=${encodeURIComponent(clienteId)}&factura_id=${encodeURIComponent(facturaId)}`)
            }
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
