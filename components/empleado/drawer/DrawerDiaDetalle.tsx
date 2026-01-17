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
        const res = await api.get("/calendario", {
          params: { desde: ymd, hasta: ymd },
        });
        setEvents(Array.isArray(res.data) ? res.data : []);
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
