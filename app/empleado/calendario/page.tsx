"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api } from "@/services/api";
import listPlugin from "@fullcalendar/list";

type EventoCalendario = {
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
};

const COLOR_MAP: Record<string, string> = {
  laborable: "#16a34a",
  festivo: "#dc2626",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  no_laborable: "#6b7280",
};

export default function EmpleadoCalendarioPage() {
  const [events, setEvents] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCalendario() {
    try {
      const res = await api.get("/calendario/usuario");

      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: EventoCalendario[] = data.map((e: any) => {
        const color = COLOR_MAP[e.tipo] || COLOR_MAP.no_laborable;

        return {
          title:
            e.tipo === "festivo"
              ? e.label || "Festivo"
              : `${e.tipo.replace("_", " ")}${
                  e.estado ? ` (${e.estado})` : ""
                }`,
          start: e.fecha_inicio || e.fecha,
          end: e.fecha_fin
            ? new Date(new Date(e.fecha_fin).getTime() + 86400000).toISOString()
            : undefined,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("Error cargando calendario", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendario();
  }, []);

  if (loading) {
    return <div className="p-6">Cargando calendario…</div>;
  }

  return (
    <div className="app-main space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calendario laboral</h1>
        <p className="text-sm text-gray-500">
          Festivos, vacaciones y ausencias
        </p>
      </div>

      <div className="bg-white p-4 border rounded">
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          initialView="dayGridMonth"
          locale="es"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          events={events}
          height="auto"
        />
      </div>
    </div>
  );
}
