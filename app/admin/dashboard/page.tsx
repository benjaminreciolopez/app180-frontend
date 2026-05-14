
"use client";

import { useEffect, useState, useRef } from "react";
import {
  RefreshCw, Euro, X, Loader2, Banknote
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";

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
import type { DashboardData } from "@/types/dashboard";

type FacturaPendienteRow = NonNullable<DashboardData["facturasPendientesList"]>[number];

const ALL_WIDGETS = ALL_DASHBOARD_WIDGETS;

export default function DashboardPage() {
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

  // --- Preview PDF de factura (silencioso, bloqueando pantalla) ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [previewFacturaNum, setPreviewFacturaNum] = useState<string>("");

  const handleOpenInvoice = async (id: string, numero: string) => {
    if (loadingPdfId) return;
    setLoadingPdfId(id);
    setPreviewFacturaNum(numero);
    setIsPreviewOpen(true);
    setPreviewUrl(null);
    try {
      const res = await api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch (e: any) {
      console.error("Error al cargar PDF", e);
      toast.error(e?.response?.data?.error || "No se pudo generar el PDF de la factura");
      setIsPreviewOpen(false);
    } finally {
      setLoadingPdfId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPreviewOpen(false);
    setPreviewFacturaNum("");
  };

  // --- Modal de cobro inline (sin navegar a /admin/cobros-pagos) ---
  const [cobroFactura, setCobroFactura] = useState<FacturaPendienteRow | null>(null);
  const [cobroSubmitting, setCobroSubmitting] = useState(false);
  const [cobroForm, setCobroForm] = useState({
    importe: "",
    fecha_pago: new Date().toISOString().slice(0, 10),
    metodo: "transferencia",
    referencia: "",
    notas: "",
  });

  const openCobroModal = (f: FacturaPendienteRow) => {
    const total = Number(f.total) || 0;
    const pagado = Number(f.pagado || 0);
    const saldo = Math.max(0, +(total - pagado).toFixed(2));
    setCobroForm({
      importe: saldo.toFixed(2),
      fecha_pago: new Date().toISOString().slice(0, 10),
      metodo: "transferencia",
      referencia: "",
      notas: "",
    });
    setCobroFactura(f);
  };

  const closeCobroModal = () => {
    if (cobroSubmitting) return;
    setCobroFactura(null);
  };

  const handleSubmitCobro = async () => {
    if (!cobroFactura) return;
    const importe = Number(cobroForm.importe);
    if (!importe || importe <= 0) {
      toast.error("Indica un importe válido");
      return;
    }
    const total = Number(cobroFactura.total) || 0;
    const pagado = Number(cobroFactura.pagado || 0);
    const saldo = +(total - pagado).toFixed(2);
    if (importe > saldo + 0.01) {
      toast.error(`El importe supera el saldo pendiente (${saldo.toFixed(2)} €)`);
      return;
    }
    setCobroSubmitting(true);
    try {
      await api.post("/admin/pagos", {
        cliente_id: cobroFactura.cliente_id,
        importe,
        metodo: cobroForm.metodo,
        fecha_pago: cobroForm.fecha_pago,
        referencia: cobroForm.referencia || null,
        notas: cobroForm.notas || null,
        asignaciones: [{
          factura_id: cobroFactura.id,
          importe,
        }],
      });
      toast.success(`Cobro registrado en factura ${cobroFactura.numero}`);
      setCobroFactura(null);
      refetch();
    } catch (e: any) {
      console.error("Error al registrar cobro", e);
      toast.error(e?.response?.data?.error || "Error al registrar el cobro");
    } finally {
      setCobroSubmitting(false);
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

      {/* Overlay bloqueante mientras se genera el PDF (antes de abrir el modal) */}
      {loadingPdfId && !previewUrl && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Generando PDF…</p>
              <p className="text-xs text-gray-500">Factura {previewFacturaNum}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de previsualización de factura */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Euro className="w-5 h-5 text-gray-500" /> Factura {previewFacturaNum}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-4">
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-full rounded-lg border shadow-sm bg-white" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" /> Cargando documento…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de cobro rápido (inline, sin navegación) */}
      {cobroFactura && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={closeCobroModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" /> Registrar Cobro
              </h3>
              <button
                onClick={closeCobroModal}
                disabled={cobroSubmitting}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-40"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Factura</span><span className="font-semibold">{cobroFactura.numero}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium truncate ml-2">{cobroFactura.cliente_nombre || "—"}</span></div>
                <div className="flex justify-between mt-1 pt-1 border-t border-slate-200"><span className="text-slate-500">Total</span><span>{Number(cobroFactura.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pagado</span><span>{Number(cobroFactura.pagado || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
                <div className="flex justify-between font-bold text-amber-700"><span>Saldo pendiente</span><span>{(Number(cobroFactura.total) - Number(cobroFactura.pagado || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Importe (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cobroForm.importe}
                    onChange={e => setCobroForm(f => ({ ...f, importe: e.target.value }))}
                    disabled={cobroSubmitting}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha cobro</label>
                  <input
                    type="date"
                    value={cobroForm.fecha_pago}
                    onChange={e => setCobroForm(f => ({ ...f, fecha_pago: e.target.value }))}
                    disabled={cobroSubmitting}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Método</label>
                <select
                  value={cobroForm.metodo}
                  onChange={e => setCobroForm(f => ({ ...f, metodo: e.target.value }))}
                  disabled={cobroSubmitting}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="bizum">Bizum</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Referencia <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={cobroForm.referencia}
                  onChange={e => setCobroForm(f => ({ ...f, referencia: e.target.value }))}
                  disabled={cobroSubmitting}
                  placeholder="Nº operación, concepto…"
                  className="w-full h-10 px-3 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
                <textarea
                  rows={2}
                  value={cobroForm.notas}
                  onChange={e => setCobroForm(f => ({ ...f, notas: e.target.value }))}
                  disabled={cobroSubmitting}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                onClick={closeCobroModal}
                disabled={cobroSubmitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitCobro}
                disabled={cobroSubmitting}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {cobroSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {cobroSubmitting ? "Registrando…" : "Confirmar cobro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay bloqueante mientras se registra el cobro */}
      {cobroSubmitting && (
        <div className="fixed inset-0 bg-black/30 z-[70] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="font-semibold text-gray-900">Registrando cobro…</p>
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
            loadingPdfId={loadingPdfId}
            onOpenInvoice={(id, numero) => handleOpenInvoice(id, numero)}
            onRegistrarCobro={(factura) => openCobroModal(factura)}
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
