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
import DrawerDetalleAusenciaAdmin from "../drawer/DrawerDetalleAusenciaAdmin";
import DrawerPendientesAdmin from "../drawer/DrawerPendientesAdmin";
import DrawerCrearAusenciaAdmin from "../drawer/DrawerCrearAusenciaAdmin";
import IOSDrawer from "@/components/ui/IOSDrawer";

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

export default function CalendarioDesktop() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string | null>(null);
  const [events, setEvents] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<EventoAdmin | null>(null);

  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendario laboral</h1>

      {/* CONTROLES */}
      <div className="grid md:grid-cols-3 gap-3">
        <select
          value={empleadoActivo || ""}
          onChange={(e) => setEmpleadoActivo(e.target.value)}
          className="border rounded px-3 py-2"
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
          className="border rounded px-3 py-2"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenCrear(true)}
            className="px-4 py-2 rounded bg-black text-white"
          >
            + Crear ausencia
          </button>
          <button
            onClick={() => setOpenPendientes(true)}
            className="px-4 py-2 rounded border"
          >
            Pendientes
          </button>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goPrev}>
            <ChevronLeft />
          </button>
          <button onClick={goNext}>
            <ChevronRight />
          </button>
          <div className="font-semibold">{title}</div>
        </div>

        <div className="flex border rounded overflow-hidden">
          <button
            onClick={() => changeView("dayGridMonth")}
            className={`px-3 py-1 ${
              view === "dayGridMonth" ? "bg-black text-white" : ""
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => changeView("timeGridWeek")}
            className={`px-3 py-1 ${
              view === "timeGridWeek" ? "bg-black text-white" : ""
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* CALENDARIO */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 grid place-items-center">
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

      {/* DRAWERS reutilizados */}
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
            onUpdated={loadEvents}
            onOpenDetalle={(p) => console.log(p)}
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
            onCreated={loadEvents}
          />
        </IOSDrawer>
      )}
    </div>
  );
}
