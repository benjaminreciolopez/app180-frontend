// app180-frontend/components/admin/drawer/AdminCalendarioBase.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { api } from "@/services/api";
import { colorFor } from "@/components/empleado/calendarioColors";
import CalendarioLegend from "@/components/empleado/CalendarioLegend";

import IOSDrawer from "@/components/ui/IOSDrawer";
import DrawerDetalleAusenciaAdmin from "@/components/admin/drawer/DrawerDetalleAusenciaAdmin";
import DrawerPendientesAdmin from "@/components/admin/drawer/DrawerPendientesAdmin";
import DrawerCrearAusenciaAdmin from "@/components/admin/drawer/DrawerCrearAusenciaAdmin";
import DrawerDetalleJornadaAdmin from "@/components/admin/drawer/DrawerDetalleJornadaAdmin";

import { useIsMobile } from "@/hooks/useIsMobile";
import type { EventoAdmin, Pendiente } from "@/types/ausencias";
import type { CalendarioIntegradoEvento } from "@/types/calendario";

type ViewMode = "dayGridMonth" | "timeGridWeek";

type Empleado = {
  id: string;
  nombre: string;
};

// =========================
// Utils
// =========================

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Devuelve YYYY-MM-DD si es parseable.
function normalizeDateOnly(v: any): string | null {
  if (!v) return null;

  if (typeof v === "string") {
    // Ya es "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss..."
    const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];

    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }

  // Date object
  if (v instanceof Date) {
    if (!isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    return null;
  }

  // fallback
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

function addOneDayYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Normaliza el evento de backend para FullCalendar:
// - start/end: strings coherentes
// - allDay: boolean
// - end EXCLUSIVO si allDay y viene date-only (esto es clave para que pinte rangos)
function normalizeIntegratedForFC(
  e: CalendarioIntegradoEvento,
): CalendarioIntegradoEvento {
  const allDay = Boolean(e.allDay);

  // Normaliza start
  const startDateOnly = normalizeDateOnly(e.start);
  const start =
    allDay && startDateOnly
      ? startDateOnly
      : typeof e.start === "string"
        ? e.start
        : String(e.start);

  // Normaliza end (puede ser null)
  const endDateOnly = normalizeDateOnly(e.end);
  let end: string | null =
    e.end == null
      ? null
      : allDay && endDateOnly
        ? endDateOnly
        : typeof e.end === "string"
          ? e.end
          : String(e.end);

  // IMPORTANTÍSIMO:
  // FullCalendar para eventos allDay espera que end sea "exclusive".
  // Tu backend ya manda end exclusive para calendario_empresa/no_laborable,
  // pero para ausencias (que salen de fecha_fin) tú estás devolviendo endExclusive (fin+1) en backend.
  // Aun así, por seguridad: si viene end date-only y parece inclusive (mismo formato),
  // lo convertimos a exclusive SOLO cuando detectamos que backend te ha dado end inclusive.
  //
  // ¿Cómo lo detectamos sin liarnos?
  // - Si el evento es "ausencia" y endDateOnly existe, asumimos que backend ya envía exclusive.
  // - Para el resto, si allDay y end date-only existe y end <= start (raro), lo arreglamos.
  //
  // Además: si por cualquier razón algún evento allDay trae end date-only "inclusive",
  // el síntoma típico es que no se pinta el último día. Por eso, aquí hacemos:
  // - Si allDay y endDateOnly existe y el backend NO marcó una bandera, no podemos saber.
  // Así que aplicamos una regla segura:
  // - Si el backend ya da end exclusive para ausencias, NO sumamos.
  // - Si el evento es no_laborable / calendario_empresa, backend también da exclusive, NO sumamos.
  // - Si es jornada_plan y lo generas en backend como rango horario, no aplica.
  //
  // En resumen: NO tocamos end salvo situaciones anómalas.
  if (allDay && endDateOnly && startDateOnly) {
    // Si end <= start, lo forzamos a start+1
    if (endDateOnly <= startDateOnly) {
      end = addOneDayYMD(startDateOnly);
    }
  }

  return {
    ...e,
    id: String(e.id),
    start,
    end, // string | null
    allDay,
  };
}

function colorForIntegrado(ev: CalendarioIntegradoEvento) {
  if (ev.tipo === "ausencia") {
    const ausTipo = ev?.meta?.ausencia_tipo || "vacaciones";
    return colorFor(ausTipo, (ev.estado as any) || "aprobado");
  }

  if (ev.tipo === "jornada_real") {
    const wc = Number(ev?.meta?.warn_count || 0);
    if (wc >= 2) return colorFor("fichaje", "rechazado");
    if (wc >= 1) return colorFor("fichaje", "pendiente");
    return colorFor("fichaje", "aprobado");
  }

  if (ev.tipo === "jornada_plan") return "#9CA3AF";

  if (ev.tipo === "calendario_empresa" || ev.tipo === "no_laborable") {
    return colorFor("festivo", "aprobado");
  }

  return "#6B7280";
}

// Drawer simple informativo (festivos / plan / etc.)
function DrawerInfoEventoAdmin({
  evento,
  onClose,
}: {
  evento: CalendarioIntegradoEvento;
  onClose: () => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="text-sm text-gray-500">Tipo</div>
      <div className="text-base font-semibold">{evento.tipo}</div>

      <div className="text-sm text-gray-500">Título</div>
      <div className="text-base">{evento.title}</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-gray-500">Inicio</div>
          <div className="text-sm">{String(evento.start)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Fin</div>
          <div className="text-sm">{evento.end ? String(evento.end) : "-"}</div>
        </div>
      </div>

      {evento.empleado_nombre && (
        <>
          <div className="text-sm text-gray-500">Empleado</div>
          <div className="text-sm">{evento.empleado_nombre}</div>
        </>
      )}

      {evento.estado && (
        <>
          <div className="text-sm text-gray-500">Estado</div>
          <div className="text-sm">{evento.estado}</div>
        </>
      )}

      {evento?.meta && (
        <>
          <div className="text-sm text-gray-500">Meta</div>
          <pre className="text-xs bg-gray-50 border rounded-xl p-3 overflow-auto">
            {JSON.stringify(evento.meta, null, 2)}
          </pre>
        </>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl border text-sm font-semibold"
      >
        Cerrar
      </button>
    </div>
  );
}

// =========================
// Component
// =========================

export default function AdminCalendarioBase() {
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string>("");

  const [events, setEvents] = useState<CalendarioIntegradoEvento[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");

  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

  const [selected, setSelected] = useState<CalendarioIntegradoEvento | null>(
    null,
  );

  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  // Dedup por id (evita duplicados si backend repite o el estado se mezcla)
  const uniqueEvents = useMemo(() => {
    return Array.from(new Map(events.map((e) => [String(e.id), e])).values());
  }, [events]);

  function apiCalendar() {
    return calendarRef.current?.getApi();
  }

  function syncTitle() {
    const api = apiCalendar();
    if (!api) return;
    setTitle(cap(api.view.title));
  }

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
      setEmpleados(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEmpleados([]);
    }
  }

  async function loadEventsForCurrentView() {
    const apiCal = apiCalendar();
    if (!apiCal) return;

    const start = apiCal.view.activeStart.toISOString().slice(0, 10);
    const end = apiCal.view.activeEnd.toISOString().slice(0, 10);

    setLoading(true);

    try {
      const res = await api.get("/admin/calendario/integrado", {
        params: {
          desde: start,
          hasta: end,
          empleado_id: empleadoActivo || undefined,
          include_real: 1,
          include_plan: empleadoActivo ? 1 : undefined,
        },
      });

      const arr: CalendarioIntegradoEvento[] = Array.isArray(res.data)
        ? res.data
        : [];

      const normalized = arr.map(normalizeIntegratedForFC);

      // Filtro por estado SOLO para ausencias
      const filtered =
        estadoFiltro === "todos"
          ? normalized
          : normalized.filter((e) => {
              if (e.tipo !== "ausencia") return true;
              return e.estado === estadoFiltro;
            });

      setEvents(filtered);
    } catch (e) {
      console.error("❌ Error cargando calendario integrado:", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial de empleados
  useEffect(() => {
    loadEmpleados();
  }, []);

  // Cuando cambian filtros, refresca eventos si ya hay calendar
  useEffect(() => {
    if (calendarRef.current) loadEventsForCurrentView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoActivo, estadoFiltro]);

  // Primera carga events tras mount (cuando FullCalendar ya se ha montado)
  useEffect(() => {
    const t = setTimeout(() => {
      if (calendarRef.current) {
        syncTitle();
        loadEventsForCurrentView();
      }
    }, 0);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eventos para FullCalendar:
  // Nota: FullCalendar prefiere end: undefined si no hay, pero nosotros trabajamos end: string|null.
  // Aquí convertimos null -> undefined para FC, evitando problemas de render.
  const fcEvents = useMemo(() => {
    return uniqueEvents.map((e) => {
      const col = colorForIntegrado(e);

      return {
        id: String(e.id),
        title: e.tipo === "ausencia" ? e.title : `[${e.tipo}] ${e.title}`,
        start: e.start,
        end: e.end ?? undefined,
        allDay: Boolean(e.allDay),
        backgroundColor: col,
        borderColor: col,
        extendedProps: { ...e },
        display: "block",
      };
    });
  }, [uniqueEvents]);

  function goPrev() {
    apiCalendar()?.prev();
    syncTitle();
    loadEventsForCurrentView();
  }

  function goNext() {
    apiCalendar()?.next();
    syncTitle();
    loadEventsForCurrentView();
  }

  function changeView(v: ViewMode) {
    setView(v);
    apiCalendar()?.changeView(v);
    syncTitle();
    loadEventsForCurrentView();
  }

  function handleEventClick(info: any) {
    const ext = info?.event?.extendedProps as CalendarioIntegradoEvento;
    if (!ext) return;
    setSelected(ext);
  }

  const Filters = (
    <div className="space-y-3 px-3 pt-3">
      <div className="bg-white border rounded-2xl px-3 py-3">
        <label className="block text-[12px] mb-1">Empleado</label>
        <select
          value={empleadoActivo}
          onChange={(e) => setEmpleadoActivo(e.target.value)}
          className="w-full text-sm"
        >
          <option value="">Todos los empleados</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-2xl px-3 py-3">
        <label className="block text-[12px] mb-1">
          Estado (solo ausencias)
        </label>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as any)}
          className="w-full text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setOpenCrear(true)}
            className="py-3 rounded-xl bg-black text-white text-sm font-semibold"
          >
            + Crear
          </button>

          <button
            onClick={() => setOpenPendientes(true)}
            className="py-3 rounded-xl border text-sm font-semibold"
          >
            Pendientes
          </button>
        </div>
      </div>

      <button
        onClick={loadEventsForCurrentView}
        className="w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        Recargar
      </button>
    </div>
  );

  const CalendarControls = (
    <div className="px-3 py-3 border-b bg-background">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold truncate">{title}</div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border overflow-hidden text-[13px] font-medium">
            <button
              onClick={() => changeView("dayGridMonth")}
              className={`px-3 py-1.5 ${
                view === "dayGridMonth" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => changeView("timeGridWeek")}
              className={`px-3 py-1.5 ${
                view === "timeGridWeek" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Semana
            </button>
          </div>

          <button onClick={goPrev} className="w-9 h-9 grid place-items-center">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goNext} className="w-9 h-9 grid place-items-center">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  // =========================
  // MOBILE
  // =========================
  if (isMobile) {
    return (
      <div className="fullscreen-page w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-hidden">
          <CalendarioLegend />
          {CalendarControls}
          {Filters}
        </div>

        <div className="fullscreen-content relative w-full max-w-full overflow-x-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-50 grid place-items-center text-sm">
              Cargando calendario…
            </div>
          )}

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locale={esLocale}
            initialView={view}
            headerToolbar={false}
            events={fcEvents as any}
            height="100%"
            contentHeight="auto"
            expandRows
            handleWindowResize
            datesSet={() => {
              syncTitle();
              loadEventsForCurrentView();
            }}
            eventClick={handleEventClick}
          />
        </div>

        {/* Drawer seleccionado: ausencia */}
        {selected && selected.tipo === "ausencia" && (
          <IOSDrawer
            open
            onClose={() => setSelected(null)}
            header={{
              title: "Detalle de ausencia",
              canGoBack: true,
              onBack: () => setSelected(null),
              onClose: () => setSelected(null),
            }}
          >
            <DrawerDetalleAusenciaAdmin
              evento={selected as any as EventoAdmin}
              onClose={() => setSelected(null)}
              onUpdated={() => {
                setSelected(null);
                loadEventsForCurrentView();
              }}
            />
          </IOSDrawer>
        )}

        {/* Drawer seleccionado: jornada_real */}
        {selected && selected.tipo === "jornada_real" && (
          <IOSDrawer
            open
            onClose={() => setSelected(null)}
            header={{
              title: "Detalle de jornada",
              canGoBack: true,
              onBack: () => setSelected(null),
              onClose: () => setSelected(null),
            }}
          >
            <DrawerDetalleJornadaAdmin
              jornadaId={selected.meta?.jornada_id}
              onClose={() => setSelected(null)}
            />
          </IOSDrawer>
        )}

        {/* Drawer seleccionado: otros */}
        {selected &&
          selected.tipo !== "ausencia" &&
          selected.tipo !== "jornada_real" && (
            <IOSDrawer
              open
              onClose={() => setSelected(null)}
              header={{
                title: "Detalle",
                canGoBack: true,
                onBack: () => setSelected(null),
                onClose: () => setSelected(null),
              }}
            >
              <DrawerInfoEventoAdmin
                evento={selected}
                onClose={() => setSelected(null)}
              />
            </IOSDrawer>
          )}

        {/* Pendientes */}
        {openPendientes && (
          <IOSDrawer
            open
            onClose={() => setOpenPendientes(false)}
            header={{
              title: "Pendientes",
              canGoBack: true,
              onBack: () => setOpenPendientes(false),
              onClose: () => setOpenPendientes(false),
            }}
          >
            <DrawerPendientesAdmin
              onClose={() => setOpenPendientes(false)}
              onUpdated={() => loadEventsForCurrentView()}
              onOpenDetalle={(p: Pendiente) => {
                console.log("Pendiente detalle:", p);
              }}
            />
          </IOSDrawer>
        )}

        {/* Crear ausencia */}
        {openCrear && (
          <IOSDrawer
            open
            onClose={() => setOpenCrear(false)}
            header={{
              title: "Crear ausencia",
              canGoBack: true,
              onBack: () => setOpenCrear(false),
              onClose: () => setOpenCrear(false),
            }}
          >
            <DrawerCrearAusenciaAdmin
              empleados={empleados}
              empleadoDefaultId={empleadoActivo || undefined}
              onClose={() => setOpenCrear(false)}
              onCreated={() => loadEventsForCurrentView()}
            />
          </IOSDrawer>
        )}
      </div>
    );
  }

  // =========================
  // DESKTOP
  // =========================
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario laboral</h1>
          <div className="shrink-0">
            <CalendarioLegend />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="font-semibold text-[15px] text-gray-900">{title}</div>

          <div className="flex rounded-full border border-black/10 overflow-hidden text-[13px] font-medium">
            <button
              onClick={() => changeView("dayGridMonth")}
              className={[
                "px-3 py-1.5",
                view === "dayGridMonth"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700",
              ].join(" ")}
            >
              Mes
            </button>
            <button
              onClick={() => changeView("timeGridWeek")}
              className={[
                "px-3 py-1.5",
                view === "timeGridWeek"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700",
              ].join(" ")}
            >
              Semana
            </button>
          </div>

          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 active:bg-black/10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 active:bg-black/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3">{Filters}</div>

        <div className="col-span-12 lg:col-span-9 bg-white border border-black/5 rounded-2xl overflow-hidden">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 z-10 grid place-items-center text-sm text-gray-500">
                Cargando calendario…
              </div>
            )}

            <div className="p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locale={esLocale}
                initialView={view}
                headerToolbar={false}
                events={fcEvents as any}
                height="calc(100vh - 220px)"
                contentHeight="auto"
                expandRows
                handleWindowResize
                datesSet={() => {
                  syncTitle();
                  loadEventsForCurrentView();
                }}
                eventClick={handleEventClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          DRAWERS
         ========================= */}

      {/* Ausencia */}
      {selected && selected.tipo === "ausencia" && (
        <IOSDrawer
          open
          onClose={() => setSelected(null)}
          header={{
            title: "Detalle de ausencia",
            canGoBack: true,
            onBack: () => setSelected(null),
            onClose: () => setSelected(null),
          }}
        >
          <DrawerDetalleAusenciaAdmin
            evento={selected as any as EventoAdmin}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              setSelected(null);
              loadEventsForCurrentView();
            }}
          />
        </IOSDrawer>
      )}

      {/* Jornada real */}
      {selected && selected.tipo === "jornada_real" && (
        <IOSDrawer
          open
          onClose={() => setSelected(null)}
          header={{
            title: "Detalle de jornada",
            canGoBack: true,
            onBack: () => setSelected(null),
            onClose: () => setSelected(null),
          }}
        >
          <DrawerDetalleJornadaAdmin
            jornadaId={selected.meta?.jornada_id}
            onClose={() => setSelected(null)}
          />
        </IOSDrawer>
      )}

      {/* Otros tipos: festivos, plan, etc */}
      {selected &&
        selected.tipo !== "ausencia" &&
        selected.tipo !== "jornada_real" && (
          <IOSDrawer
            open
            onClose={() => setSelected(null)}
            header={{
              title: "Detalle",
              canGoBack: true,
              onBack: () => setSelected(null),
              onClose: () => setSelected(null),
            }}
          >
            <DrawerInfoEventoAdmin
              evento={selected}
              onClose={() => setSelected(null)}
            />
          </IOSDrawer>
        )}

      {/* Pendientes */}
      {openPendientes && (
        <IOSDrawer
          open
          onClose={() => setOpenPendientes(false)}
          header={{
            title: "Pendientes",
            canGoBack: true,
            onBack: () => setOpenPendientes(false),
            onClose: () => setOpenPendientes(false),
          }}
        >
          <DrawerPendientesAdmin
            onClose={() => setOpenPendientes(false)}
            onUpdated={() => loadEventsForCurrentView()}
            onOpenDetalle={(p: Pendiente) => {
              console.log("Pendiente detalle:", p);
            }}
          />
        </IOSDrawer>
      )}

      {/* Crear ausencia */}
      {openCrear && (
        <IOSDrawer
          open
          onClose={() => setOpenCrear(false)}
          header={{
            title: "Crear ausencia",
            canGoBack: true,
            onBack: () => setOpenCrear(false),
            onClose: () => setOpenCrear(false),
          }}
        >
          <DrawerCrearAusenciaAdmin
            empleados={empleados}
            empleadoDefaultId={empleadoActivo || undefined}
            onClose={() => setOpenCrear(false)}
            onCreated={() => loadEventsForCurrentView()}
          />
        </IOSDrawer>
      )}
    </div>
  );
}
