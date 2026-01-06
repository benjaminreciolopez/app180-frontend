"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";

import { api } from "@/services/api";

type Empleado = {
  id: string;
  nombre: string;
};

type EventoCalendario = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
};
const COLOR_MAP: Record<string, string> = {
  laborable: "#16a34a",
  festivo: "#dc2626",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  no_laborable: "#6b7280",
};

export default function AdminCalendarioPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEmpleados() {
    const res = await api.get("/employees");
    setEmpleados(res.data || []);
  }

  async function loadEventos() {
    setLoading(true);
    try {
      const res = await api.get("/calendario/empresa", {
        params: { empleado_id: empleadoId || undefined },
      });

      const data = Array.isArray(res.data) ? res.data : [];

      const mapped: EventoCalendario[] = data.map((e: any) => {
        const color = COLOR_MAP[e.tipo] || COLOR_MAP.no_laborable;

        return {
          id: e.id,
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
          color,
        };
      });

      setEventos(mapped);
    } catch (e) {
      console.error("Error cargando calendario", e);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    loadEventos();
  }, [empleadoId]);

  return (
    <div className="app-main space-y-4">
      <h1 className="text-2xl font-bold">Calendario laboral</h1>

      {/* SELECT EMPLEADO */}
      <div className="flex gap-4 items-center">
        <select
          className="border rounded px-3 py-2"
          value={empleadoId}
          onChange={(e) => setEmpleadoId(e.target.value)}
        >
          <option value="">Todos los empleados</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-4 text-sm mt-2">
        {Object.entries(COLOR_MAP).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: v }}
            />
            <span>{k.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {/* CALENDARIO */}
      <div className="bg-white border rounded p-2">
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
          events={eventos}
          height="auto"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando calendario…</p>}
    </div>
  );
}
