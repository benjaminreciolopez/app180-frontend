// AdminCalendarioBase (versión limpia y estable)
// - Separación clara de datos vs UI
// - Normalización de eventos consistente
// - Sin hacks de fechas
// - Sin re-renders peligrosos
// - Sin error React #301

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
import type { EventoAdmin } from "@/types/ausencias";
import type { CalendarioIntegradoEvento } from "@/types/calendario";

// =========================
// Utils
// =========================

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function normalizeEvent(e: CalendarioIntegradoEvento) {
  return {
    ...e,
    id: String(e.id),
    start: e.start,
end?: string
    allDay: Boolean(e.allDay),
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
// Component
// =========================

export default function AdminCalendarioBase() {
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<{ id: string; nombre: string }[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string>("");

  const [rawEvents, setRawEvents] = useState<CalendarioIntegradoEvento[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"dayGridMonth" | "timeGridWeek">("dayGridMonth");
  const [title, setTitle] = useState("");

  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "pendiente" | "aprobado" | "rechazado">("todos");

  const [selected, setSelected] = useState<CalendarioIntegradoEvento | null>(null);

  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  // =========================
  // Data
  // =========================

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
      setEmpleados(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEmpleados([]);
    }
  }

  function apiCalendar() {
    return calendarRef.current?.getApi();
  }

  function syncTitle() {
    const api = apiCalendar();
    if (!api) return;
    setTitle(cap(api.view.title));
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

      const arr: CalendarioIntegradoEvento[] = Array.isArray(res.data) ? res.data : [];
      setRawEvents(arr.map(normalizeEvent));
    } catch {
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    if (calendarRef.current) loadEventsForCurrentView();
  }, [empleadoActivo, estadoFiltro]);

  // =========================
  // Derived
  // =========================

  const filteredEvents = useMemo(() => {
    if (estadoFiltro === "todos") return rawEvents;

    return rawEvents.filter((e) => {
      if (e.tipo !== "ausencia") return true;
      return e.estado === estadoFiltro;
    });
  }, [rawEvents, estadoFiltro]);

  const fcEvents = useMemo(() => {
    return filteredEvents.map((e) => {
      const col = colorForIntegrado(e);
      return {
        id: e.id,
        title: `[${e.tipo}] ${e.title}`,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        backgroundColor: col,
        borderColor: col,
        extendedProps: { ...e },
        display: "block",
      };
    });
  }, [filteredEvents]);

  function handleEventClick(info: any) {
    const ext = info?.event?.extendedProps;
    if (!ext || typeof ext !== "object") return;
    setSelected({ ...ext });
  }

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

  function changeView(v: "dayGridMonth" | "timeGridWeek") {
    setView(v);
    apiCalendar()?.changeView(v);
    syncTitle();
    loadEventsForCurrentView();
  }

  // =========================
  // Render
  // =========================

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario laboral</h1>
          <CalendarioLegend />
        </div>

        <div className="flex items-center gap-2">
          <div className="font-semibold text-[15px] text-gray-900">{title}</div>

          <div className="flex rounded-full border border-black/10 overflow-hidden text-[13px] font-medium">
            <button
              onClick={() => changeView("dayGridMonth")}
              className={view === "dayGridMonth" ? "bg-black text-white px-3 py-1.5" : "bg-white text-gray-700 px-3 py-1.5"}
            >
              Mes
            </button>
            <button
              onClick={() => changeView("timeGridWeek")}
              className={view === "timeGridWeek" ? "bg-black text-white px-3 py-1.5" : "bg-white text-gray-700 px-3 py-1.5"}
            >
              Semana
            </button>
          </div>

          <button onClick={goPrev} className="w-9 h-9 rounded-full grid place-items-center">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goNext} className="w-9 h-9 rounded-full grid place-items-center">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
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
          />
        </IOSDrawer>
      )}

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
