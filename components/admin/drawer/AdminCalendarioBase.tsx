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
import DrawerDiaDetalleAdmin from "./DrawerDiaDetalleAdmin";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { EventoAdmin } from "@/types/ausencias";
import type { CalendarioIntegradoEvento } from "@/types/calendario";

/**
 * OBJETIVO (igual que calendario empleado):
 * - Click en CUALQUIER día (tenga o no eventos) => Drawer de resumen del día (DrawerDiaDetalleAdmin)
 * - Dentro del drawer, lista de eventos del día (festivos/ausencias/jornadas/plan)
 * - Click en un evento de esa lista => abre drawer específico:
 *    - ausencia => DrawerDetalleAusenciaAdmin
 *    - jornada_real => DrawerDetalleJornadaAdmin
 *    - otros => DrawerInfoEventoAdmin (informativo)
 *
 * Además:
 * - Las AUSENCIAS se pintan como allDay con end EXCLUSIVO (FullCalendar)
 * - Festivos / no laborable se comportan como eventos clicables (en el drawer del día)
 */

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

function ymdFromDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addOneDayYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Normaliza para FullCalendar:
 * - start/end deben ser ISO o YYYY-MM-DD
 * - Para allDay: end debe ser EXCLUSIVO (día siguiente)
 *
 * Backend en tu getCalendarioIntegradoAdmin ya entrega end EXCLUSIVO para allDay
 * (ausencias y calendario empresa). Aun así, aquí protegemos:
 * - si llega end inclusivo YYYY-MM-DD, lo volvemos exclusivo.
 */
function normalizeIntegratedForFC(
  e: CalendarioIntegradoEvento,
): CalendarioIntegradoEvento {
  const start = String(e.start);
  const end = e.end == null ? null : String(e.end);

  const isAllDay = Boolean(e.allDay);

  // Si es allDay y start/end son YYYY-MM-DD, asumimos que end podría venir inclusivo y lo hacemos exclusivo.
  // OJO: si backend ya lo envía exclusivo, esto lo convertiría en +1 día (mal).
  // Para evitar eso: sólo hacemos +1 si detectamos que end <= start (caso raro) o si end parece inclusivo:
  // Heurística segura: si la duración parece 0 días (end==start) => lo hacemos +1.
  if (
    isAllDay &&
    end &&
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    if (end === start) {
      return { ...e, start, end: addOneDayYMD(end), allDay: true };
    }
    // Normal: lo dejamos tal cual (backend ya exclusivo)
    return { ...e, start, end, allDay: true };
  }

  return {
    ...e,
    start,
    end,
    allDay: isAllDay,
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

// =========================
// Drawer informativo genérico (para eventos no-ausencia / no-jornada_real)
// =========================

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
// Drawer de detalle del DÍA (igual que empleado)
// - siempre abre aunque no haya eventos
// - lista eventos del día y click para abrir detalle
// =========================

type DiaDetalleAdminData = {
  fecha: string; // YYYY-MM-DD
  label: string; // "Laborable" / "No laborable" / etc.
  descripcion?: string | null; // texto adicional (festivo nombre, etc.)
  laborable: boolean;
  eventos: CalendarioIntegradoEvento[];
};

function buildDiaDetalleData(
  ymd: string,
  dayEvents: CalendarioIntegradoEvento[],
): DiaDetalleAdminData {
  // Deducir "laborable" y label/descripcion a partir de eventos calendario/no_laborable si existen
  const cal = dayEvents.find((e) => e.tipo === "calendario_empresa");
  const noLab = dayEvents.find((e) => e.tipo === "no_laborable");

  let laborable = true;
  let label = "Laborable";
  let descripcion: string | null = null;

  if (cal) {
    laborable = false;
    label = "Festivo";
    descripcion = cal.title || null;
  } else if (noLab) {
    laborable = false;
    label = "No laborable";
    descripcion = "Día no laborable";
  }

  return {
    fecha: ymd,
    laborable,
    label,
    descripcion,
    eventos: dayEvents,
  };
}

function sameYMD(a: string, b: string) {
  return String(a).slice(0, 10) === String(b).slice(0, 10);
}

/**
 * Determina si un evento "toca" un día ymd.
 * - allDay: start=YYYY-MM-DD, end=YYYY-MM-DD exclusivo => ymd in [start, end)
 * - timed: usa fecha de start
 */
function eventTouchesDay(ev: CalendarioIntegradoEvento, ymd: string) {
  const isAllDay = Boolean(ev.allDay);

  const s = String(ev.start).slice(0, 10);
  const e = ev.end ? String(ev.end).slice(0, 10) : null;

  if (isAllDay) {
    // Si no hay end, asumimos 1 día
    const endEx = e || addOneDayYMD(s);
    return ymd >= s && ymd < endEx;
  }

  // timed: consideramos el día del start
  return sameYMD(s, ymd);
}

function sortDayEvents(
  a: CalendarioIntegradoEvento,
  b: CalendarioIntegradoEvento,
) {
  // allDay primero, luego por hora de inicio
  const ad = Boolean(a.allDay);
  const bd = Boolean(b.allDay);
  if (ad !== bd) return ad ? -1 : 1;

  const as = String(a.start);
  const bs = String(b.start);
  return as.localeCompare(bs);
}

// =========================
// Main component
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

  // Drawer de día (SIEMPRE)
  const [openDayYmd, setOpenDayYmd] = useState<string | null>(null);

  // Drawer de evento seleccionado (desde lista del día)
  const [selected, setSelected] = useState<CalendarioIntegradoEvento | null>(
    null,
  );

  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  // =========================
  // Helpers
  // =========================

  const uniqueEvents = useMemo(() => {
    // Evitar duplicados por id
    return Array.from(new Map(events.map((e) => [String(e.id), e])).values());
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (estadoFiltro === "todos") return uniqueEvents;
    return uniqueEvents.filter((e) => {
      if (e.tipo !== "ausencia") return true;
      return e.estado === estadoFiltro;
    });
  }, [uniqueEvents, estadoFiltro]);

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

    const start = ymdFromDate(apiCal.view.activeStart);
    const end = ymdFromDate(apiCal.view.activeEnd);

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

      setEvents(normalized);
    } catch (e) {
      console.error("Error cargando calendario integrado admin", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Effects
  // =========================

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    if (calendarRef.current) loadEventsForCurrentView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoActivo, estadoFiltro]);

  useEffect(() => {
    // primer load una vez que el calendarRef exista
    const t = setTimeout(() => {
      if (calendarRef.current) {
        syncTitle();
        loadEventsForCurrentView();
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // FullCalendar events (lo que se pinta)
  // =========================

  const fcEvents = useMemo(() => {
    return filteredEvents.map((e) => {
      const col = colorForIntegrado(e);

      // FullCalendar tolera end undefined; nuestro type puede ser null.
      // Para no romper TS ni la librería:
      const end = e.end ?? undefined;

      return {
        id: String(e.id),
        title: `[${e.tipo}] ${e.title}`,
        start: e.start,
        end,
        allDay: Boolean(e.allDay),
        backgroundColor: col,
        borderColor: col,
        extendedProps: { ...e },
        display: "block",
      };
    });
  }, [filteredEvents]);

  // =========================
  // Navigation / view
  // =========================

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

  // =========================
  // Clicks: IGUAL QUE EMPLEADO
  // - dateClick: abre drawer del día siempre
  // - eventClick: NO abre detalle directo, abre drawer del día correspondiente
  //   (y desde ahí seleccionas evento)
  // =========================

  function openDay(ymd: string) {
    setSelected(null);
    setOpenDayYmd(ymd);
  }

  function handleDateClick(info: any) {
    const ymd = String(info?.dateStr || "").slice(0, 10);
    if (!ymd) return;
    openDay(ymd);
  }

  function handleEventClick(info: any) {
    // En lugar de abrir evento directo, abrimos el día (igual que empleado)
    const start = info?.event?.start;
    if (!start) return;
    const ymd = ymdFromDate(start);
    openDay(ymd);
  }

  // =========================
  // Filters UI (igual tu versión anterior)
  // =========================

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
              className={`px-3 py-1.5 ${view === "dayGridMonth" ? "bg-black text-white" : "bg-white"}`}
            >
              Mes
            </button>
            <button
              onClick={() => changeView("timeGridWeek")}
              className={`px-3 py-1.5 ${view === "timeGridWeek" ? "bg-black text-white" : "bg-white"}`}
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
            dateClick={handleDateClick}
            eventClick={handleEventClick}
          />
        </div>

        {/* Drawer del día (SIEMPRE) */}
        {openDayYmd && (
          <IOSDrawer
            open
            onClose={() => setOpenDayYmd(null)}
            header={{
              title: "Detalle del día",
              canGoBack: true,
              onBack: () => setOpenDayYmd(null),
              onClose: () => setOpenDayYmd(null),
            }}
          >
            <DrawerDiaDetalleAdmin
              ymd={openDayYmd}
              allEvents={filteredEvents}
              onSelectEvent={(ev) => {
                setSelected(ev);
              }}
              onClose={() => setOpenDayYmd(null)}
            />
          </IOSDrawer>
        )}

        {/* Drawer específico de evento, abierto DESDE el drawer del día */}
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
              onOpenDetalle={(p) => {
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
                dateClick={handleDateClick}
                eventClick={handleEventClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drawer del día (SIEMPRE) */}
      {openDayYmd && (
        <IOSDrawer
          open
          onClose={() => setOpenDayYmd(null)}
          header={{
            title: "Detalle del día",
            canGoBack: true,
            onBack: () => setOpenDayYmd(null),
            onClose: () => setOpenDayYmd(null),
          }}
        >
          <DrawerDiaDetalleAdmin
            ymd={openDayYmd}
            allEvents={filteredEvents}
            onSelectEvent={(ev) => setSelected(ev)}
            onClose={() => setOpenDayYmd(null)}
          />
        </IOSDrawer>
      )}

      {/* Drawer específico de evento */}
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
            onOpenDetalle={(p) => {
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
