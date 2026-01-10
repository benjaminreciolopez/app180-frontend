// src/components/admin/drawer/DrawerCalendarioAdmin.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { api } from "@/services/api";
import { colorFor } from "../../empleado/calendarioColors";
import IOSDrawer from "@/components/ui/IOSDrawer";
import DrawerDetalleAusenciaAdmin from "./DrawerDetalleAusenciaAdmin";

type ViewMode = "dayGridMonth" | "timeGridWeek";

type Empleado = {
  id: string;
  nombre: string;
};

type EventoAdmin = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: string;
  estado: string;
  start: string;
  end: string;
};

export default function DrawerCalendarioAdmin() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string | null>(null);

  const [events, setEvents] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<EventoAdmin | null>(null);

  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

  // =========================
  // LOAD EMPLEADOS
  // =========================
  async function loadEmpleados() {
    try {
      const res = await api.get("/admin/empleados");
      const list = Array.isArray(res.data) ? res.data : [];
      setEmpleados(list);
    } catch (e) {
      console.error("Error cargando empleados", e);
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    if (empleados.length && !empleadoActivo) {
      setEmpleadoActivo(empleados[0].id);
    }
  }, [empleados]);

  // =========================
  // LOAD EVENTS
  // =========================
  async function loadEvents() {
    const apiCal = calendarRef.current?.getApi();
    if (!apiCal) return;

    const start = apiCal.view.activeStart.toISOString().slice(0, 10);
    const end = apiCal.view.activeEnd.toISOString().slice(0, 10);

    setLoading(true);
    try {
      const res = await api.get("/admin/calendario/eventos", {
        params: {
          desde: start,
          hasta: end,
          empleado_id: empleadoActivo || undefined,
          estado: estadoFiltro === "todos" ? undefined : estadoFiltro,
        },
      });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error calendario admin", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [empleadoActivo, estadoFiltro]);

  // =========================
  // MAP EVENTS
  // =========================
  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const col = colorFor(e.tipo);
      return {
        id: e.id,
        title: `${e.empleado_nombre} · ${e.tipo}`,
        start: e.start,
        end: e.end,
        allDay: true,
        backgroundColor: col,
        borderColor: col,
        extendedProps: e,
      };
    });
  }, [events]);

  // =========================
  // CALENDAR CONTROLS
  // =========================
  function apiCalendar() {
    return calendarRef.current?.getApi();
  }

  function goPrev() {
    apiCalendar()?.prev();
  }

  function goNext() {
    apiCalendar()?.next();
  }

  function changeView(v: ViewMode) {
    setView(v);
    apiCalendar()?.changeView(v);
  }

  function syncTitle() {
    const api = apiCalendar();
    if (!api) return;
    setTitle(api.view.title.charAt(0).toUpperCase() + api.view.title.slice(1));
  }

  return (
    <div className="p-3 space-y-3">
      {/* =========================
          SELECTOR EMPLEADO
      ========================= */}
      <div className="bg-white border border-black/5 rounded-xl px-3 py-2">
        <select
          value={empleadoActivo || ""}
          onChange={(e) => setEmpleadoActivo(e.target.value)}
          className="w-full text-sm border-none focus:ring-0"
        >
          <option value="">Todos los empleados</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-black/5 rounded-xl px-3 py-2">
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as any)}
          className="w-full text-sm border-none focus:ring-0"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        {/* =========================
            HEADER iOS
        ========================= */}
        <div className="px-3 h-12 border-b flex items-center justify-between">
          <div className="flex items-center gap-1">
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

            <div className="ml-2 font-semibold text-[15px] text-gray-900">
              {title}
            </div>
          </div>

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
        </div>

        {/* =========================
            CALENDAR
        ========================= */}
        <div className="p-2">
          {loading ? (
            <div className="p-3 text-sm text-gray-500">
              Cargando calendario…
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={esLocale}
              initialView={view}
              headerToolbar={false}
              events={fcEvents as any}
              height="auto"
              contentHeight="auto"
              expandRows
              datesSet={() => {
                syncTitle();
                loadEvents();
              }}
              eventClick={(info) => {
                const ext = info.event.extendedProps as any;
                if (ext) setSelected(ext as EventoAdmin);
              }}
            />
          )}
        </div>

        {/* =========================
            DRAWER DETALLE
        ========================= */}
        {selected && (
          <IOSDrawer
            open={true}
            onClose={() => setSelected(null)}
            header={{
              title: "Detalle de ausencia",
              canGoBack: true,
              onBack: () => setSelected(null),
              onClose: () => setSelected(null),
            }}
          >
            <DrawerDetalleAusenciaAdmin
              evento={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => {
                setSelected(null);
                loadEvents();
              }}
            />
          </IOSDrawer>
        )}
      </div>
    </div>
  );
}
