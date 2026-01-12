// src/components/empleado/drawer/DrawerCalendario.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { api } from "@/services/api";
import type { CalendarioEvento } from "./calendarioTypes";
import { colorFor } from "./calendarioColors";
import CalendarioLegend from "./CalendarioLegend";

type ViewMode = "dayGridMonth" | "timeGridWeek";

export default function DrawerCalendario({
  onSelectEvent,
}: {
  onSelectEvent: (ev: CalendarioEvento) => void;
}) {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [events, setEvents] = useState<CalendarioEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");

  // =========================
  // LOAD EVENTS (con rango)
  // =========================
  async function load(desde?: string, hasta?: string) {
    console.log("🔄 Cargando calendario...", { desde, hasta });

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const url = params.toString()
        ? `/calendario/usuario?${params.toString()}`
        : "/calendario/usuario";

      const res = await api.get(url);
      console.log("📦 DATA CALENDARIO:", res.data);

      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error calendario usuario", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // REFRESCOS PWA
  // =========================
  useEffect(() => {
    const onFocus = () => load();
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    const onOnline = () => load();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    const interval = setInterval(() => load(), 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    load();
  }, []);

  // =========================
  // MAP EVENTS
  // =========================
  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const col = colorFor(e.tipo);
      return {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end || undefined,
        allDay: e.allDay ?? true,
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
    syncTitle();
  }

  function goNext() {
    apiCalendar()?.next();
    syncTitle();
  }

  function changeView(v: ViewMode) {
    setView(v);
    apiCalendar()?.changeView(v);
    syncTitle();
  }

  function syncTitle() {
    const api = apiCalendar();
    if (!api) return;
    setTitle(api.view.title.charAt(0).toUpperCase() + api.view.title.slice(1));
  }

  // =========================
  // INIT TITLE
  // =========================
  useEffect(() => {
    setTimeout(syncTitle, 0);
  }, []);

  return (
    <div className="p-3 space-y-3">
      <CalendarioLegend />

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        {/* =========================
            HEADER iOS
        ========================= */}
        <div className="px-3 h-12 border-b flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-1">
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

            <div className="ml-2 font-semibold text-[15px] text-gray-900">
              {title}
            </div>
          </div>

          {/* Right */}
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
              key={fcEvents.map((e) => e.id).join(",")}
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={esLocale}
              initialView={view}
              headerToolbar={false}
              events={fcEvents as any}
              height="auto"
              contentHeight="auto"
              expandRows
              datesSet={(arg) => {
                const desde = arg.startStr.slice(0, 10);
                const hasta = arg.endStr.slice(0, 10);
                load(desde, hasta);
              }}
              eventClick={(info) => {
                const ext = info.event.extendedProps as any;
                if (ext) onSelectEvent(ext as CalendarioEvento);
              }}
            />
          )}
        </div>
      </div>

      <button
        onClick={() => load()}
        className="w-full py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04]"
      >
        Recargar
      </button>
    </div>
  );
}
