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

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDaysISO(isoDate: string, days: number) {
  // isoDate: YYYY-MM-DD
  const [y, m, dd] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, dd || 1);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function titleForTipo(tipo?: string) {
  const t = String(tipo || "").toLowerCase();

  if (t === "vacaciones") return "Vacaciones";
  if (t === "baja_medica") return "Baja médica";

  if (t === "festivo_local") return "Festivo local";
  if (t === "festivo_nacional") return "Festivo nacional";
  if (t === "festivo_empresa") return "Festivo de empresa";

  if (t === "convenio") return "Ajuste de convenio";
  if (t === "cierre_empresa") return "Cierre de empresa";
  if (t === "no_laborable") return "No laborable";

  if (t === "jornada_real") return "Jornada (real)";
  if (t === "jornada_plan") return "Jornada (plan)";

  // fallback
  return t ? t.replaceAll("_", " ") : "Evento";
}

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
      // ÚNICO endpoint del calendario del empleado (integrado)
      const params = new URLSearchParams({ desde, hasta });
      const res = await api.get(
        `/empleado/calendario/integrado?${params.toString()}`,
      );
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error calendario integrado", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const fcEvents = useMemo(() => {
    return (events || []).map((e) => {
      const tipo = String(e.tipo || "").toLowerCase();
      const col = colorFor(tipo, e.estado);

      // FullCalendar: eventos allDay deben tener end (exclusive) para render fiable
      const allDay = Boolean(e.allDay);
      const start = String(e.start);
      let end = e.end ? String(e.end) : undefined;

      if (allDay) {
        // Si viene solo start (un día), end debe ser el día siguiente (exclusive)
        // Si viene end y es inclusive (mismo día), igual forzamos +1 si coincide con start
        if (!end) {
          end = addDaysISO(start.slice(0, 10), 1);
        } else {
          const s = start.slice(0, 10);
          const z = end.slice(0, 10);
          if (z === s) end = addDaysISO(s, 1);
        }
      }

      const isBackground = e.meta?.display === "background";

      const computedTitle = e.title || titleForTipo(tipo);

      return {
        id: String(e.id),
        title: computedTitle,
        start,
        end,
        allDay,
        backgroundColor: col,
        borderColor: col,
        textColor: "#f79c9cff",
        display: isBackground ? "background" : "block",
        extendedProps: { ...e },
      };
    });
  }, [events]);

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
    <div className="fullscreen-page">
      <div className="p-3 space-y-3 shrink-0">
        <CalendarioLegend />

        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
          <div className="px-3 h-12 border-b flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  apiCalendar()?.prev();
                }}
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  apiCalendar()?.next();
                }}
                type="button"
              >
                <ChevronRight size={18} />
              </button>
              <div className="ml-2 font-semibold">{title}</div>
            </div>

            <div className="flex rounded-full border overflow-hidden text-sm">
              <button
                className={`px-3 py-1 ${view === "dayGridMonth" ? "bg-gray-100" : ""}`}
                onClick={() => setView("dayGridMonth")}
                type="button"
              >
                Mes
              </button>
              <button
                className={`px-3 py-1 ${view === "timeGridWeek" ? "bg-gray-100" : ""}`}
                onClick={() => setView("timeGridWeek")}
                type="button"
              >
                Semana
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fullscreen-content relative">
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
          height="100%"
          contentHeight="100%"
          expandRows
          handleWindowResize
          datesSet={(arg) => {
            syncTitle();
            load(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10));
          }}
          dateClick={(arg) => onSelectDay(arg.dateStr.slice(0, 10))}
          dayCellClassNames={(arg) => {
            const isSunday = arg.date.getDay() === 0;
            return isSunday ? ["fc-sunday"] : [];
          }}
        />
      </div>
    </div>
  );
}
