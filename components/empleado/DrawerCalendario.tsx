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

type BackendDia = {
  fecha: string;
  es_laborable: boolean;
  ausencia_tipo?: string | null;
  estado?: string | null;

  minutos_trabajados?: number | null;
  avisos_count?: number | null;
  tiene_incidencias?: boolean | null;
};

function safeYMD(v: string) {
  return String(v).slice(0, 10);
}

function fmtMin(min?: number | null) {
  if (min == null || Number.isNaN(Number(min))) return "";
  const m = Math.max(0, Math.floor(Number(min)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${String(r).padStart(2, "0")}m`;
}

function buildEventId(prefix: string, ymd: string) {
  return `${prefix}-${ymd}`;
}

function mapDiasToEventos(dias: BackendDia[]): CalendarioEvento[] {
  const out: CalendarioEvento[] = [];

  for (const d of dias) {
    const fecha = safeYMD(d.fecha);

    if (d.ausencia_tipo) {
      const tipo = d.ausencia_tipo;
      const pretty = String(tipo).replace("_", " ");
      const extra =
        d.minutos_trabajados != null
          ? ` · ${fmtMin(d.minutos_trabajados)}`
          : "";

      out.push({
        id: buildEventId(tipo, fecha),
        tipo,
        title: `${pretty}${extra}${d.estado ? ` (${d.estado})` : ""}`,
        start: fecha,
        end: null,
        allDay: true,
        estado: (d.estado as any) || "aprobado",
      });
      continue;
    }

    if (d.es_laborable === false) {
      const extra =
        d.minutos_trabajados != null
          ? ` · ${fmtMin(d.minutos_trabajados)}`
          : "";

      out.push({
        id: buildEventId("festivo", fecha),
        tipo: "festivo",
        title: `Festivo${extra}`,
        start: fecha,
        end: null,
        allDay: true,
      });
    }
  }

  return out;
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

  const uniqueEvents = useMemo(
    () => Array.from(new Map(events.map((e) => [e.id, e])).values()),
    [events]
  );

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
      const res = await api.get(`/calendario?${params.toString()}`);
      const dias = Array.isArray(res.data) ? res.data : [];
      setEvents(mapDiasToEventos(dias));
    } catch (e) {
      console.error("Error calendario usuario", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const fcEvents = useMemo(
    () =>
      uniqueEvents.map((e) => {
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
    [uniqueEvents]
  );

  useEffect(() => {
    setTimeout(syncTitle, 0);
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
            <button onClick={() => setView("dayGridMonth")}>Mes</button>
            <button onClick={() => setView("timeGridWeek")}>Semana</button>
          </div>
        </div>

        <div className="p-2 relative">
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
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
          />
        </div>
      </div>
    </div>
  );
}
// app180-frontend/app/empleado/dashboard/page.tsx
