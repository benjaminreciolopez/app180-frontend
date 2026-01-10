// src/components/empleado/drawer/DrawerCalendario.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";

import { api } from "@/services/api";
import type { CalendarioEvento } from "./calendarioTypes";
import { colorFor } from "./calendarioColors";
import CalendarioLegend from "./CalendarioLegend";

export default function DrawerCalendario({
  onSelectEvent,
}: {
  onSelectEvent: (ev: CalendarioEvento) => void;
}) {
  const [events, setEvents] = useState<CalendarioEvento[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/calendario/usuario");
      const data = Array.isArray(res.data) ? res.data : [];
      setEvents(data);
    } catch (e) {
      console.error("Error calendario usuario", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div className="p-3 space-y-3">
      <CalendarioLegend />

      <div className="bg-white border border-black/5 rounded-2xl p-2">
        {loading ? (
          <div className="p-3 text-sm text-gray-500">Cargando calendario…</div>
        ) : (
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            locale={esLocale}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            events={fcEvents as any}
            height="auto"
            eventClick={(info) => {
              const ext = info.event.extendedProps as any;
              if (ext) onSelectEvent(ext as CalendarioEvento);
            }}
          />
        )}
      </div>

      <button
        onClick={load}
        className="w-full py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04]"
      >
        Recargar
      </button>
    </div>
  );
}
