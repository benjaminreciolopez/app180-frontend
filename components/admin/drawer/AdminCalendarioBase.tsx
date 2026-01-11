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
import DrawerPendientesAdmin from "./DrawerPendientesAdmin";
import DrawerCrearAusenciaAdmin from "./DrawerCrearAusenciaAdmin";

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

export default function AdminCalendarioBase({
  mode = "desktop",
}: {
  mode?: "desktop" | "mobile";
}) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string | null>(null);

  const [events, setEvents] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPendientes, setOpenPendientes] = useState(false);

  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<EventoAdmin | null>(null);
  const [openCrear, setOpenCrear] = useState(false);

  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

  // =========================
  // LOAD EMPLEADOS
  // =========================
  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
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

  useEffect(() => {
    if (calendarRef.current) {
      loadEvents();
    }
  }, [empleadoActivo, estadoFiltro]);

  // =========================
  // LOAD EVENTS
  // =========================
  async function loadEvents() {
    const apiCal = calendarRef.current?.getApi();
    if (!apiCal) return;

    setLoading(true);

    const start = apiCal.view.activeStart.toISOString().slice(0, 10);
    const end = apiCal.view.activeEnd.toISOString().slice(0, 10);

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
    setTimeout(() => {
      syncTitle();
    }, 0);
  }, []);

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

  const isDesktop = mode === "desktop";

  return (
    <div className={isDesktop ? "space-y-4" : "p-3 space-y-3"}>
      {/* =========================
          TOOLBAR
      ========================= */}
      <div
        className={`bg-white border rounded-xl p-3 flex ${
          isDesktop ? "flex-row items-center justify-between" : "flex-col gap-2"
        }`}
      >
        <div className="flex gap-2 items-center">
          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5"
          >
            <ChevronRight size={18} />
          </button>

          <div className="ml-2 font-semibold">{title}</div>
        </div>

        <div className="flex gap-2">
          <select
            value={empleadoActivo || ""}
            onChange={(e) => setEmpleadoActivo(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Todos los empleados</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>

          <button
            onClick={() => setOpenCrear(true)}
            className="px-3 py-1.5 rounded bg-black text-white text-sm"
          >
            + Crear ausencia
          </button>

          <button
            onClick={() => setOpenPendientes(true)}
            className="px-3 py-1.5 rounded border text-sm"
          >
            Pendientes
          </button>
        </div>
      </div>

      {/* =========================
          CALENDAR
      ========================= */}
      <div className="bg-white border rounded-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 grid place-items-center text-sm">
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
          height={isDesktop ? "80vh" : "auto"}
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
      </div>

      {/* =========================
          DRAWERS
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

      {openPendientes && (
        <IOSDrawer
          open={true}
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
            onUpdated={() => {
              loadEvents();
            }}
            onOpenDetalle={(p) => {
              console.log("pendiente detalle", p);
            }}
          />
        </IOSDrawer>
      )}

      {openCrear && (
        <IOSDrawer
          open={true}
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
            onCreated={() => {
              loadEvents();
            }}
          />
        </IOSDrawer>
      )}
    </div>
  );
}
