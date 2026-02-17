// app180-frontend/components/admin/drawer/AdminCalendarioBase.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { ChevronLeft, ChevronRight, Calendar, UserCheck, RefreshCw, Clock, Plus } from "lucide-react";

import { api } from "@/services/api";
import { getUser } from "@/services/auth";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { colorFor } from "@/components/empleado/calendarioColors";
import CalendarioLegend from "@/components/empleado/CalendarioLegend";

import IOSDrawer from "@/components/ui/IOSDrawer";
import DrawerDetalleAusenciaAdmin from "@/components/admin/drawer/DrawerDetalleAusenciaAdmin";
import DrawerPendientesAdmin from "@/components/admin/drawer/DrawerPendientesAdmin";
import DrawerCrearAusenciaAdmin from "@/components/admin/drawer/DrawerCrearAusenciaAdmin";
import DrawerDetalleJornadaAdmin from "@/components/admin/drawer/DrawerDetalleJornadaAdmin";
import DrawerDiaDetalleAdmin from "@/components/admin/drawer/DrawerDiaDetalleAdmin";
import DrawerCrearPlaningAdmin from "@/components/admin/drawer/DrawerCrearPlaningAdmin";

import { useIsMobile } from "@/hooks/useIsMobile";
import type { EventoAdmin } from "@/types/ausencias";
import type { CalendarioIntegradoEvento } from "@/types/calendario";
import { useRouter } from "next/navigation";

type Session = {
  modulos: Record<string, boolean>;
};

type ViewMode = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

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

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addOneDayYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`);
  if (isNaN(d.getTime())) return ymd;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toAllDayYMD(value: string | Date, desdeYear: string) {
  const raw = String(value).trim();
  if (isISODate(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const injected = `${raw} ${desdeYear}`;
  const d = new Date(injected);
  if (!isNaN(d.getTime())) return ymdFromDate(d);
  return raw.slice(0, 10);
}

function normalizeIntegratedForFC(
  e: CalendarioIntegradoEvento,
  desdeYear: string,
): CalendarioIntegradoEvento {
  const isAllDay = Boolean(e.allDay);
  if (isAllDay) {
    const start = toAllDayYMD(e.start, desdeYear);
    let end = e.end ? toAllDayYMD(e.end, desdeYear) : null;
    if (!end || end === start) end = addOneDayYMD(start);
    return { ...e, id: String(e.id), allDay: true, start, end };
  }
  return { ...e, id: String(e.id), allDay: false, start: String(e.start), end: e.end ? String(e.end) : null };
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
    const calTipo = ev.meta?.cal_tipo || "festivo";
    return colorFor(calTipo, "aprobado");
  }
  return "#6B7280";
}

const GOOGLE_CAL_CSS = `
  .fc-theme-standard td, .fc-theme-standard th {
    border: 1px solid #e5e7eb !important;
  }
  .fc .fc-daygrid-day-top {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 4px;
  }
  .fc .fc-daygrid-day-number {
    padding: 0 !important;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 2px;
    color: #3c4043;
    text-decoration: none !important;
  }
  .fc-day-today {
    background-color: transparent !important;
  }
  .fc-day-today .fc-daygrid-day-number {
    background-color: #1a73e8;
    color: white !important;
    border-radius: 50%;
  }
  .fc-col-header-cell {
    padding: 8px 0 !important;
    background: white;
    font-weight: 500 !important;
    text-transform: uppercase;
    font-size: 11px;
    color: #70757a;
    border-bottom: 1px solid #e5e7eb !important;
  }
  .fc .fc-daygrid-event-harness {
    margin-top: 1px !important;
  }
  .fc-h-event {
    border: none !important;
    padding: 2px 4px !important;
    font-size: 11px !important;
    border-radius: 4px !important;
    box-shadow: none !important;
  }
  .fc-daygrid-more-link {
    font-size: 11px !important;
    font-weight: bold !important;
    color: #3c4043 !important;
  }
`;

// Función para generar color consistente y "bonito" basado en un string (ID)
// Usa HSL para asegurar que sean colores pastel/vivos legibles y no demasiado oscuros/claros.
function stringToColor(str: string): string {
  if (!str) return "#9CA3AF"; // Gray fallback
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generar HSL restringiendo el Hue (H)
  // Rango total: 0-360
  // Queremos evitar el ROJO (0-30 y 330-360) y NARANJA (30-50).
  // Usaremos un rango desplazado: 100 - 320 (Verdes, Azules, Púrpuras)
  
  const h = 100 + (Math.abs(hash) % 220); 
  const s = 60 + (Math.abs(hash) % 15); // 60% - 75% para no ser chillones
  const l = 45 + (Math.abs(hash) % 15); // 45% - 60% para legibilidad
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function getColorForEmployee(id: string | null | undefined): string {
  if (!id) return "#9CA3AF";
  return stringToColor(id);
}

function priorityFor(ev: CalendarioIntegradoEvento) {
  switch (ev.tipo) {
    case "ausencia": return 100;
    case "jornada_real": return 80;
    case "jornada_plan": return 60;
    case "no_laborable": return 40;
    case "calendario_empresa": return 30;
    default: return 10;
  }
}

function semanticKey(ev: CalendarioIntegradoEvento) {
  const empleado = ev.empleado_id || "";
  const baseDate = ev.allDay ? String(ev.start).slice(0, 10) : String(ev.start);
  const tipo = ev.tipo || "";
  const title = (ev.title || "").trim().toLowerCase();
  return `${tipo}|${empleado}|${baseDate}|${title}`;
}

function DrawerInfoEventoAdmin({ evento, onClose }: { evento: CalendarioIntegradoEvento; onClose: () => void; }) {
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
        <><div className="text-sm text-gray-500">Empleado</div><div className="text-sm">{evento.empleado_nombre}</div></>
      )}
      <button onClick={onClose} className="w-full py-3 rounded-xl border text-sm font-semibold mt-4">Cerrar</button>
    </div>
  );
}

export default function AdminCalendarioBase() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const confirm = useConfirm();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoActivo, setEmpleadoActivo] = useState<string>("");
  const [events, setEvents] = useState<CalendarioIntegradoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "pendiente" | "aprobado" | "rechazado">("todos");
  const [openDayYmd, setOpenDayYmd] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarioIntegradoEvento | null>(null);
  const [openPendientes, setOpenPendientes] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  const [openCrearPlaning, setOpenCrearPlaning] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  function loadSession() {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const u = JSON.parse(raw);
      setSession({ modulos: u.modulos || {} });
    } catch {}
  }

  function apiCalendar() { return calendarRef.current?.getApi(); }
  function syncTitle() { const api = apiCalendar(); if (api) setTitle(cap(api.view.title)); }

  async function loadEmpleados() {
    try {
      const user = getUser();
      const hasEmpleadosModule = user?.modulos?.empleados !== false;

      const res = await api.get("/employees");
      let lista = Array.isArray(res.data) ? res.data : [];

      if (!hasEmpleadosModule && user?.id) {
        lista = lista.filter((emp: any) => 
          emp.user_id && String(emp.user_id) === String(user.id)
        );
      }
      setEmpleados(lista);

      // Si no hay módulo de empleados, forzar que el empleado activo sea el admin
      if (!hasEmpleadosModule && lista.length > 0) {
        setEmpleadoActivo(lista[0].id);
      }
    } catch (e) {
      console.error("[DEBUG] Error fetching employees:", e);
      setEmpleados([]);
    }
  }

  async function loadEventsForCurrentView() {
    const apiCal = apiCalendar();
    if (!apiCal) return;
    const desde = ymdFromDate(apiCal.view.activeStart);
    const hasta = ymdFromDate(apiCal.view.activeEnd);
    const desdeYear = String(desde).slice(0, 4);
    setLoading(true);
    try {
      const res = await api.get("/admin/calendario/integrado", {
        params: {
          desde, hasta,
          empleado_id: empleadoActivo || undefined,
          include_real: hasModule("fichajes") || !hasModule("empleados") ? 1 : 0,
          include_plan: hasModule("empleados") || !hasModule("empleados") ? 1 : 0,
          include_ausencias: hasModule("ausencias") ? 1 : 0,
        },
      });
      console.log("[DEBUG] Calendar Response:", res.data); // DEBUG
      const arr: CalendarioIntegradoEvento[] = Array.isArray(res.data) ? res.data : [];
      const normalized = arr.map((e) => normalizeIntegratedForFC(e, desdeYear));
      console.log("[DEBUG] Normalized Events:", normalized); // DEBUG
      const map = new Map<string, CalendarioIntegradoEvento>();
      for (const ev of normalized) {
        const key = semanticKey(ev);
        const prev = map.get(key);
        if (!prev || priorityFor(ev) > priorityFor(prev)) map.set(key, ev);
      }
      setEvents(Array.from(map.values()));
    } catch (e) { console.error(e); setEvents([]); } finally { setLoading(false); }
  }

  useEffect(() => {
    loadSession();
    const onSessionUpdated = () => loadSession();
    window.addEventListener("session-updated", onSessionUpdated);
    return () => window.removeEventListener("session-updated", onSessionUpdated);
  }, []);

  function hasModule(name: string) {
    if (!session) return true;
    return session.modulos?.[name] !== false;
  }

  useEffect(() => {
    // Siempre cargar empleados, la lógica de filtrado interna se encarga 
    // de mostrar solo al admin si el módulo está desactivado.
    loadEmpleados();
  }, [session]);

  useEffect(() => {
    if (calendarRef.current) loadEventsForCurrentView();
  }, [empleadoActivo, estadoFiltro]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (calendarRef.current) { syncTitle(); loadEventsForCurrentView(); }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.tipo === "ausencia" && !hasModule("ausencias")) return false;
      if (e.tipo === "jornada_real" && !hasModule("fichajes") && hasModule("empleados")) return false;
      if (e.tipo === "jornada_plan" && !hasModule("empleados") && !e.empleado_id) return false;
      
      // Permitir explícitamente si es el propio admin (cuando el módulo de empleados está off)
      if (!hasModule("empleados") && (e.tipo === "jornada_plan" || e.tipo === "jornada_real")) {
        return true; 
      }
      if (estadoFiltro !== "todos" && e.tipo === "ausencia") return e.estado === estadoFiltro;
      return true;
    });
  }, [events, estadoFiltro, session]);

  const fcEvents = useMemo(() => {
    return filteredEvents.map((e) => {
      let col = (e as any).color || (e as any).backgroundColor;
      
      // Si no hay color explícito (override en DB) y es jornada_plan, usar color por empleado
      if (!col && e.tipo === "jornada_plan") {
          col = getColorForEmployee(e.empleado_id);
      }
      
      // Fallback a lógica standard
      if (!col) col = colorForIntegrado(e);

      return {
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end ?? undefined,
        allDay: Boolean(e.allDay),
        backgroundColor: col,
        borderColor: col,
        extendedProps: { ...e },
        display: "block",
      };
    });
  }, [filteredEvents]);

  function goPrev() { apiCalendar()?.prev(); syncTitle(); loadEventsForCurrentView(); }
  function goNext() { apiCalendar()?.next(); syncTitle(); loadEventsForCurrentView(); }
  function changeView(v: ViewMode) { setView(v); apiCalendar()?.changeView(v); syncTitle(); loadEventsForCurrentView(); }
  function handleDateClick(info: any) { const ymd = String(info?.dateStr || "").slice(0, 10); if (ymd) { setOpenDayYmd(ymd); setSelected(null); } }
  function handleEventClick(info: any) { const start: Date | null = info?.event?.start || null; if (start) { setOpenDayYmd(ymdFromDate(start)); } }

  const FiltersSidebar = (
    <div className="space-y-6">
      <div className="space-y-2">
        <button
          onClick={() => { setOpenDayYmd(ymdFromDate(new Date())); setOpenCrearPlaning(true); }}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar size={18} />
          </div>
          Crear Planing
        </button>

        {hasModule("ausencias") && hasModule("empleados") && (
          <button
            onClick={() => setOpenCrear(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-gray-700 font-medium"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
               <Clock size={18} />
            </div>
            Ausencia
          </button>
        )}
      </div>

      {hasModule("empleados") && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">Visualización</label>
          <div className="space-y-1">
            <button
               onClick={() => setEmpleadoActivo("")}
               className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                 empleadoActivo === "" ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-gray-100 text-gray-600"
               }`}
            >
              <UserCheck size={16} />
              Todos los empleados
            </button>
            <div className="max-h-[300px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {empleados.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEmpleadoActivo(e.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    empleadoActivo === e.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: getColorForEmployee(e.id) }} />
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">Mapa de Colores</div>
      <div className="px-2 text-xs text-gray-500 mb-2">
         Los horarios de trabajo se muestran con el color asignado a cada empleado (ver lista arriba) o el color del servicio si es específico.
      </div>
    
      {/* ... rest of sidebar ... */}
      
      {hasModule("ausencias") && hasModule("empleados") && (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">Filtrar Ausencias</label>
          <div className="grid grid-cols-1 gap-1">
            {["todos", "pendiente", "aprobado", "rechazado"].map((est) => (
               <button
                 key={est}
                 onClick={() => setEstadoFiltro(est as any)}
                 className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                   estadoFiltro === est ? "bg-gray-100 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-600"
                 }`}
               >
                 {est}
               </button>
            ))}
          </div>
          <button
            onClick={() => setOpenPendientes(true)}
            className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs font-medium hover:border-gray-300 hover:text-gray-500 transition-colors"
          >
            Ver Pendientes
          </button>
        </div>
      )}

      <button
        onClick={loadEventsForCurrentView}
        className="w-full mt-4 py-2.5 text-[11px] text-gray-400 flex items-center justify-center gap-2 hover:text-gray-600 transition-colors"
      >
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        Actualizar calendario
      </button>

      <button
        onClick={async () => {
           const ok = await confirm({
             title: "Cerrar sesión",
             description: "¿Cerrar sesión?",
             confirmLabel: "Cerrar sesión",
             variant: "destructive",
           });
           if (ok) {
             document.cookie = "token=; Max-Age=0; path=/;";
             localStorage.removeItem("token");
             localStorage.removeItem("user_180");
             window.location.href = "/login";
           }
        }}
        className="w-full mt-4 py-2.5 text-[11px] text-red-500 font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
      >
        Cerrar Sesión
      </button>
    </div>
  );

  const CalendarControls = (
    <div className="px-5 py-3 flex items-center justify-between bg-white border-b">
      <div className="flex items-center gap-6">
        <div className="text-xl font-semibold text-gray-800 min-w-[180px]">{title}</div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => { apiCalendar()?.today(); syncTitle(); loadEventsForCurrentView(); }}
            className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors mr-2"
          >
            Hoy
          </button>
          <button onClick={goPrev} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goNext} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50/50">
        <button
          onClick={() => changeView("dayGridMonth")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
            view === "dayGridMonth" ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mes
        </button>
        <button
          onClick={() => changeView("timeGridWeek")}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
            view === "timeGridWeek" ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Semana
        </button>
      </div>
    </div>
  );
  
  // Estado para el drawer de filtros en móvil
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  if (isMobile) {
    return (
      <div className="fullscreen-page w-full h-[100dvh] flex flex-col bg-white overflow-hidden">
        {/* Header Mobile Google Style */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 bg-white z-20 shadow-sm">
           <div className="flex items-center gap-3">
             <button onClick={() => router.push("/admin/dashboard")} className="p-2 -ml-2 text-gray-600 rounded-full hover:bg-gray-100">
               <ChevronLeft size={24} />
             </button>
             <h1 className="text-lg font-bold text-gray-900 truncate max-w-[150px]">{title}</h1>
           </div>
           
           <div className="flex items-center gap-1">
              <div className="flex items-center mr-2">
                 <button onClick={goPrev} className="p-2 text-gray-600 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
                 <button onClick={goNext} className="p-2 text-gray-600 rounded-full hover:bg-gray-100"><ChevronRight size={20}/></button>
              </div>
              <button 
                onClick={() => { apiCalendar()?.today(); syncTitle(); loadEventsForCurrentView(); }}
                className="w-8 h-8 flex items-center justify-center border rounded-full text-xs font-bold text-gray-700 active:bg-gray-100"
                title="Ir a hoy"
              >
                {new Date().getDate()}
              </button>
              <button onClick={() => setShowMobileFilters(true)} className="p-2 text-gray-600 rounded-full hover:bg-gray-100 ml-1">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                 </svg>
              </button>
           </div>
        </div>

        {/* Calendar Area */}
        <div className="flex-1 relative w-full overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/70 z-50 grid place-items-center text-sm">Cargando...</div>}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            locale={esLocale}
            initialView={view} // Mobile default usually list or dayGrid
            headerToolbar={false}
            events={fcEvents as any}
            height="100%"
            expandRows
            datesSet={() => { syncTitle(); loadEventsForCurrentView(); }}
            eventDisplay="block"
            dayMaxEvents={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={(arg) => {
                 // Simplified mobile content
                 return (
                  <div className="truncate px-1 py-0.5 text-[10px] font-semibold leading-tight flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: arg.backgroundColor }} />
                      <span className="truncate">{arg.event.title}</span>
                   </div>
                 );
            }}
          />
        </div>
        
        {/* FAB para Crear */}
        <button 
           onClick={() => { setOpenDayYmd(ymdFromDate(new Date())); setOpenCrearPlaning(true); }}
           className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center z-30 active:scale-95 transition-transform"
        >
          <Plus size={32} />
        </button>

        {/* Drawer de Filtros Mobile */}
        <IOSDrawer open={showMobileFilters} onClose={() => setShowMobileFilters(false)} header={{ title: "Filtros y Leyenda", onClose: () => setShowMobileFilters(false), canGoBack: true, onBack: () => setShowMobileFilters(false) }}>
           <div className="p-4 space-y-6 pb-20">
              {/* Fallback Back Button */}
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="w-full flex items-center gap-2 text-indigo-600 font-semibold mb-2 active:bg-indigo-50 p-2 rounded-lg"
              >
                <ChevronLeft size={20} />
                Volver al Calendario
              </button>

              <CalendarioLegend />
              {FiltersSidebar}
           </div>
        </IOSDrawer>

        {openDayYmd && (
          <IOSDrawer open onClose={() => setOpenDayYmd(null)} header={{ title: "Detalle del día", canGoBack: true, onBack: () => setOpenDayYmd(null), onClose: () => setOpenDayYmd(null) }}>
            <DrawerDiaDetalleAdmin ymd={openDayYmd} allEvents={filteredEvents} onSelectEvent={(ev) => setSelected(ev)} onCreatePlaning={() => setOpenCrearPlaning(true)} onClose={() => setOpenDayYmd(null)} />
          </IOSDrawer>
        )}

        {selected && selected.tipo === "ausencia" && (
           <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle ausencia", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
             <DrawerDetalleAusenciaAdmin evento={selected as any as EventoAdmin} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); loadEventsForCurrentView(); }} />
           </IOSDrawer>
        )}

        {selected && selected.tipo === "jornada_real" && (
           <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle jornada", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
             <DrawerDetalleJornadaAdmin jornadaId={selected.meta?.jornada_id} onClose={() => setSelected(null)} />
           </IOSDrawer>
        )}

        {selected && selected.tipo !== "ausencia" && selected.tipo !== "jornada_real" && (
           <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
             <DrawerInfoEventoAdmin evento={selected} onClose={() => setSelected(null)} />
           </IOSDrawer>
        )}

        {openPendientes && (
           <IOSDrawer open onClose={() => setOpenPendientes(false)} header={{ title: "Pendientes", canGoBack: true, onBack: () => setOpenPendientes(false), onClose: () => setOpenPendientes(false) }}>
             <DrawerPendientesAdmin onClose={() => setOpenPendientes(false)} onUpdated={() => loadEventsForCurrentView()} onOpenDetalle={() => {}} />
           </IOSDrawer>
        )}

        {openCrear && (
           <IOSDrawer open onClose={() => setOpenCrear(false)} header={{ title: "Crear ausencia", canGoBack: true, onBack: () => setOpenCrear(false), onClose: () => setOpenCrear(false) }}>
             <DrawerCrearAusenciaAdmin empleados={empleados} empleadoDefaultId={empleadoActivo || undefined} onClose={() => setOpenCrear(false)} onCreated={() => loadEventsForCurrentView()} />
           </IOSDrawer>
        )}

        {openCrearPlaning && (
           <IOSDrawer open onClose={() => setOpenCrearPlaning(false)} header={{ title: "Asignar Planing", canGoBack: true, onBack: () => setOpenCrearPlaning(false), onClose: () => setOpenCrearPlaning(false) }}>
             <DrawerCrearPlaningAdmin fechaDefault={openDayYmd || undefined} empleadoDefaultId={empleadoActivo || undefined} empleados={empleados} onClose={() => setOpenCrearPlaning(false)} onCreated={() => loadEventsForCurrentView()} />
           </IOSDrawer>
        )}
      </div>
    );
  }

  // Desktop Return
  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{GOOGLE_CAL_CSS}</style>
      {CalendarControls}

      <div className="flex h-[calc(100vh-65px)] overflow-hidden">
        {/* Sidebar Desktop */}
        <div className="w-72 h-full border-r bg-white p-5 overflow-y-auto hidden lg:block border-gray-200">
          {FiltersSidebar}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <CalendarioLegend />
          </div>
        </div>

        {/* main Area */}
        <div className="flex-1 h-full bg-white relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-10 grid place-items-center backdrop-blur-[1px]">
               <div className="flex flex-col items-center gap-3">
                 <RefreshCw size={24} className="animate-spin text-indigo-600" />
                 <span className="text-xs font-medium text-gray-500">Sincronizando...</span>
               </div>
            </div>
          )}

          <div className="h-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={esLocale}
              initialView={view}
              headerToolbar={false}
              events={fcEvents as any}
              height="100%"
              expandRows
              handleWindowResize
              datesSet={() => { syncTitle(); loadEventsForCurrentView(); }}
              eventDisplay="block"
              dayMaxEvents={true}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventContent={(arg) => {
                const props = arg.event.extendedProps;
                // Intentar sacar cliente del primer bloque si es plan
                let clienteLabel = "";
                const meta = props.meta || {};
                
                // V5: Si es asignación continua, cliente_nombre viene directo en meta
                if (meta.es_asignacion && meta.cliente_nombre) {
                   clienteLabel = meta.cliente_nombre;
                } else if (props.tipo === "jornada_plan" && meta.bloques?.length) {
                   // Legacy / Detail logic
                   const c = meta.bloques[0].cliente_nombre;
                   if (c) clienteLabel = c;
                   if (meta.bloques.length > 1) {
                     const unique = new Set(meta.bloques.map((b:any) => b.cliente_nombre));
                     if (unique.size > 1) clienteLabel = "Varios clientes";
                   }
                }

                return (
                  <div className="truncate px-1 py-0.5 text-[10px] font-semibold leading-tight flex flex-col gap-0.5">
                     <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: arg.backgroundColor }} />
                        <span className="truncate">{arg.event.title}</span>
                     </div>
                     {clienteLabel && (
                       <div className="text-[9px] text-gray-500 pl-2.5 truncate">
                         {clienteLabel}
                       </div>
                     )}
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Shared Drawers (Desktop uses them too for actions) */}
      {openDayYmd && (
        <IOSDrawer open onClose={() => setOpenDayYmd(null)} header={{ title: cap(new Date(openDayYmd).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })), canGoBack: true, onBack: () => setOpenDayYmd(null), onClose: () => setOpenDayYmd(null) }}>
          <DrawerDiaDetalleAdmin ymd={openDayYmd} allEvents={filteredEvents} onSelectEvent={(ev) => setSelected(ev)} onCreatePlaning={() => setOpenCrearPlaning(true)} onClose={() => setOpenDayYmd(null)} />
        </IOSDrawer>
      )}

      {selected && selected.tipo === "ausencia" && (
         <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle ausencia", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
           <DrawerDetalleAusenciaAdmin evento={selected as any as EventoAdmin} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); loadEventsForCurrentView(); }} />
         </IOSDrawer>
      )}

      {selected && selected.tipo === "jornada_real" && (
         <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle jornada", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
           <DrawerDetalleJornadaAdmin jornadaId={selected.meta?.jornada_id} onClose={() => setSelected(null)} />
         </IOSDrawer>
      )}

      {selected && selected.tipo !== "ausencia" && selected.tipo !== "jornada_real" && (
         <IOSDrawer open onClose={() => setSelected(null)} header={{ title: "Detalle", canGoBack: true, onBack: () => setSelected(null), onClose: () => setSelected(null) }}>
           <DrawerInfoEventoAdmin evento={selected} onClose={() => setSelected(null)} />
         </IOSDrawer>
      )}

      {openPendientes && (
         <IOSDrawer open onClose={() => setOpenPendientes(false)} header={{ title: "Pendientes", canGoBack: true, onBack: () => setOpenPendientes(false), onClose: () => setOpenPendientes(false) }}>
           <DrawerPendientesAdmin onClose={() => setOpenPendientes(false)} onUpdated={() => loadEventsForCurrentView()} onOpenDetalle={() => {}} />
         </IOSDrawer>
      )}

      {openCrear && (
         <IOSDrawer open onClose={() => setOpenCrear(false)} header={{ title: "Crear ausencia", canGoBack: true, onBack: () => setOpenCrear(false), onClose: () => setOpenCrear(false) }}>
           <DrawerCrearAusenciaAdmin empleados={empleados} empleadoDefaultId={empleadoActivo || undefined} onClose={() => setOpenCrear(false)} onCreated={() => loadEventsForCurrentView()} />
         </IOSDrawer>
      )}

      {openCrearPlaning && (
         <IOSDrawer open onClose={() => setOpenCrearPlaning(false)} header={{ title: "Asignar Planing", canGoBack: true, onBack: () => setOpenCrearPlaning(false), onClose: () => setOpenCrearPlaning(false) }}>
           <DrawerCrearPlaningAdmin fechaDefault={openDayYmd || undefined} empleadoDefaultId={empleadoActivo || undefined} empleados={empleados} onClose={() => setOpenCrearPlaning(false)} onCreated={() => loadEventsForCurrentView()} />
         </IOSDrawer>
      )}
    </div>
  );
}
