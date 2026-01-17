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
  onSelectDay,
}: {
  onSelectDay: (ymd: string) => void;
}) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const lastRangeRef = useRef<{ desde: string; hasta: string } | null>(null);

  const [events, setEvents] = useState<CalendarioEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("dayGridMonth");
  const [title, setTitle] = useState("");

  function apiCalendar() {
    return calendarRef.current?.getApi();
  }

  function syncTitle() {
    const api = apiCalendar();
    if (!api) return;
    const t = api.view.title || "";
    setTitle(t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
  }

  async function load(desde: string, hasta: string) {
    const last = lastRangeRef.current;
    if (last && last.desde === desde && last.hasta === hasta) return;
    lastRangeRef.current = { desde, hasta };

    setLoading(true);
    try {
      const params = new URLSearchParams({ desde, hasta });
      const res = await api.get(
        `/calendario/usuario/eventos?${params.toString()}`
      );
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error calendario usuario", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const fcEvents = useMemo(
    () =>
      events.map((e) => {
        const col = colorFor(e.tipo, e.estado);
        return {
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end || undefined,
          allDay: e.allDay ?? true,
          backgroundColor: col,
          borderColor: col,
          textColor: "#fff",
        };
      }),
    [events]
  );

  useEffect(() => {
    const api = apiCalendar();
    if (!api) return;
    api.changeView(view);
  }, [view]);

  useEffect(() => {
    const api = apiCalendar();
    if (!api) return;
    syncTitle();
  }, []);

  return (
    <div className="p-3 space-y-3">
      <CalendarioLegend />

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        <div className="px-3 h-12 border-b flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => apiCalendar()?.prev()} type="button">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => apiCalendar()?.next()} type="button">
              <ChevronRight size={18} />
            </button>
            <div className="ml-2 font-semibold">{title}</div>
          </div>

          <div className="flex rounded-full border overflow-hidden text-sm">
            <button
              className={`px-3 py-1 ${
                view === "dayGridMonth" ? "bg-gray-100" : ""
              }`}
              onClick={() => setView("dayGridMonth")}
            >
              Mes
            </button>
            <button
              className={`px-3 py-1 ${
                view === "timeGridWeek" ? "bg-gray-100" : ""
              }`}
              onClick={() => setView("timeGridWeek")}
            >
              Semana
            </button>
          </div>
        </div>

        <div className="p-2 relative">
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 z-10">
              Cargando…
            </div>
          )}

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locale={esLocale}
            initialView={view}
            headerToolbar={false}
            events={fcEvents}
            datesSet={(arg) => {
              syncTitle();
              load(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10));
            }}
            dateClick={(arg) => onSelectDay(arg.dateStr.slice(0, 10))}
            dayCellClassNames={(arg) => {
              const isSunday = arg.date.getDay() === 0; // 0 = domingo
              return isSunday ? ["fc-sunday"] : [];
            }}
          />
        </div>
      </div>
    </div>
  );
}
// app180-frontend/components/empleado/DrawerCalendario.tsx
