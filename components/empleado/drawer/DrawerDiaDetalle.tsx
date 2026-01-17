"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { CalendarioEvento } from "../calendarioTypes";
import { colorFor } from "../calendarioColors";

export default function DrawerDiaDetalle({
  ymd,
  onSelectEvent,
}: {
  ymd: string;
  onSelectEvent: (ev: CalendarioEvento) => void;
}) {
  const [events, setEvents] = useState<CalendarioEvento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/calendario/usuario", {
          params: { desde: ymd, hasta: ymd },
        });

        const dias = Array.isArray(res.data) ? res.data : [];

        // Convertir día → evento(s)
        const mapped: CalendarioEvento[] = dias.flatMap((d: any) => {
          const fecha = String(d.fecha).slice(0, 10);
          const out: CalendarioEvento[] = [];

          if (d.ausencia_tipo) {
            out.push({
              id: `aus-${fecha}`,
              tipo: d.ausencia_tipo,
              title:
                d.ausencia_tipo === "baja_medica"
                  ? "Baja médica"
                  : "Vacaciones",
              start: fecha,
              allDay: true,
              estado: d.estado || "aprobado",
            });
          } else if (d.es_laborable === false) {
            out.push({
              id: `festivo-${fecha}`,
              tipo: "festivo",
              title: "Festivo",
              start: fecha,
              allDay: true,
            });
          } else if (d.minutos_trabajados > 0) {
            out.push({
              id: `trabajo-${fecha}`,
              tipo: "trabajo",
              title: `Trabajado · ${d.minutos_trabajados} min`,
              start: fecha,
              allDay: true,
            });
          } else if (d.es_laborable === true) {
            out.push({
              id: `laborable-${fecha}`,
              tipo: "laborable",
              title: "Laborable",
              start: fecha,
              allDay: true,
            });
          }

          return out;
        });

        setEvents(mapped);
      } catch (e) {
        console.error("Error cargando día", e);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ymd]);

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm text-gray-500">Eventos del día {ymd}</div>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-gray-500">
          No hay eventos para este día.
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const col = colorFor(ev.tipo, ev.estado);
            return (
              <li
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className="border rounded p-3 flex items-center justify-between cursor-pointer active:bg-black/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: col }}
                  />
                  <span className="font-medium">{ev.title}</span>
                </div>

                {ev.estado ? (
                  <span className="text-xs text-gray-500">{ev.estado}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
// app180-frontend/app/empleado/dashboard/page.tsx
