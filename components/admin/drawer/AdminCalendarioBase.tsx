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

type ViewMode = "dayGridMonth" | "timeGridWeek";

type Props = {
  mode: "mobile" | "desktop";
};

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

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminCalendarioBase({ mode }: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string>("");

  const [events, setEvents] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");

  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

  const [selected, setSelected] = useState<EventoAdmin | null>(null);
  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
      setEmpleados(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error cargando empleados", e);
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
    loadEmpleados();
  }, []);

  useEffect(() => {
    if (calendarRef.current) loadEventsForCurrentView();
  }, [empleadoActivo, estadoFiltro]);

  useEffect(() => {
    setTimeout(syncTitle, 0);
  }, []);

  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const col = colorFor(e.tipo);
      const prettyTipo = e.tipo?.replaceAll("_", " ") || "ausencia";
      return {
        id: e.id,
        title:
          mode === "desktop"
            ? `${e.empleado_nombre} · ${prettyTipo} · ${e.estado}`
            : `${e.empleado_nombre} · ${prettyTipo}`,
        start: e.start,
        end: e.end,
        allDay: true,
        backgroundColor: col,
        borderColor: col,
        extendedProps: e,
      };
    });
  }, [events, mode]);

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

  const HeaderIOS = (
    <div className="px-3 h-12 border-b flex items-center gap-2 bg-background">
      <button
        onClick={goPrev}
        className="w-9 h-9 rounded-full grid place-items-center"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={goNext}
        className="w-9 h-9 rounded-full grid place-items-center"
      >
        <ChevronRight size={18} />
      </button>
      <div className="ml-1 font-semibold text-[15px] truncate">{title}</div>
    </div>
  );

  const Filters = (
    <div className="space-y-3 px-3">
      <div className="bg-white border border-black/5 rounded-2xl px-3 py-3">
        <label className="block text-[12px] text-gray-500 mb-1">Empleado</label>
        <select
          value={empleadoActivo}
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

      <div className="bg-white border border-black/5 rounded-2xl px-3 py-3">
        <label className="block text-[12px] text-gray-500 mb-1">Estado</label>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as any)}
          className="w-full text-sm border-none focus:ring-0"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setOpenCrear(true)}
            className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold"
          >
            + Crear
          </button>

          <button
            onClick={() => setOpenPendientes(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold border border-black/10 bg-white"
          >
            Pendientes
          </button>
        </div>
      </div>

      <button
        onClick={loadEventsForCurrentView}
        className="w-full py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        Recargar
      </button>
    </div>
  );

  const CalendarControls = (
    <div className="px-3 py-3 border-b bg-background">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-black/10 overflow-hidden text-[13px] font-medium">
            <button
              onClick={() => changeView("dayGridMonth")}
              className={`px-3 py-1.5 ${
                view === "dayGridMonth"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => changeView("timeGridWeek")}
              className={`px-3 py-1.5 ${
                view === "timeGridWeek"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Semana
            </button>
          </div>

          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full grid place-items-center"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full grid place-items-center"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "mobile") {
    return (
      <div className="bg-background h-[100svh] w-full flex flex-col overflow-hidden">
        <div className="sticky top-0 z-40">{HeaderIOS}</div>

        <div className="sticky top-12 z-30 bg-background">
          <CalendarioLegend />
        </div>

        <div className="relative flex-1 min-h-0">
          {loading && (
            <div className="absolute inset-0 bg-white/70 z-50 grid place-items-center text-sm text-gray-500">
              Cargando calendario…
            </div>
          )}

          <div className="h-full overflow-y-auto overflow-x-hidden">
            {Filters}
            {CalendarControls}

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={esLocale}
              initialView={view}
              headerToolbar={false}
              events={fcEvents as any}
              expandRows
              handleWindowResize
              datesSet={() => {
                syncTitle();
                loadEventsForCurrentView();
              }}
              eventClick={(info) => {
                const ext = info.event.extendedProps as any;
                if (ext) setSelected(ext as EventoAdmin);
              }}
            />
          </div>
        </div>

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
                loadEventsForCurrentView();
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
              onUpdated={() => loadEventsForCurrentView()}
              onOpenDetalle={(p) => console.log("pendiente detalle", p)}
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
              onCreated={() => loadEventsForCurrentView()}
            />
          </IOSDrawer>
        )}
      </div>
    );
  }

  // Desktop (lo dejamos como lo tienes, con buen layout)
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
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 active:bg-black/10"
            aria-label="Siguiente"
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
                eventClick={(info) => {
                  const ext = info.event.extendedProps as any;
                  if (ext) setSelected(ext as EventoAdmin);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drawers desktop */}
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
              loadEventsForCurrentView();
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
            onUpdated={() => loadEventsForCurrentView()}
            onOpenDetalle={(p) => console.log("pendiente detalle", p)}
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
            onCreated={() => loadEventsForCurrentView()}
          />
        </IOSDrawer>
      )}
    </div>
  );
}
