// app180-frontend/components/admin/drawer/DrawerDiaDetalleAdmin.tsx
"use client";

import { useMemo } from "react";
import type { CalendarioIntegradoEvento } from "@/types/calendario";
import { colorFor } from "@/components/empleado/calendarioColors";

function addOneDayYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function ymdFromAny(x: any) {
  return String(x).slice(0, 10);
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
    return colorFor("festivo", "aprobado");
  }

  return "#6B7280";
}

/**
 * Determina si un evento "toca" el día ymd.
 * - allDay: start=YYYY-MM-DD, end=YYYY-MM-DD exclusivo => ymd in [start, end)
 * - timed: usa fecha de start
 */
function eventTouchesDay(ev: CalendarioIntegradoEvento, ymd: string) {
  const isAllDay = Boolean(ev.allDay);

  const s = ymdFromAny(ev.start);
  const e = ev.end ? ymdFromAny(ev.end) : null;

  if (isAllDay) {
    const endEx = e || addOneDayYMD(s);
    return ymd >= s && ymd < endEx;
  }

  return s === ymd;
}

function sortDayEvents(
  a: CalendarioIntegradoEvento,
  b: CalendarioIntegradoEvento,
) {
  const ad = Boolean(a.allDay);
  const bd = Boolean(b.allDay);
  if (ad !== bd) return ad ? -1 : 1;

  const as = String(a.start);
  const bs = String(b.start);
  return as.localeCompare(bs);
}

function buildHeader(ymd: string, dayEvents: CalendarioIntegradoEvento[]) {
  const cal = dayEvents.find((e) => e.tipo === "calendario_empresa");
  const noLab = dayEvents.find((e) => e.tipo === "no_laborable");

  let laborable = true;
  let label = "Laborable";
  let descripcion: string | null = null;

  if (cal) {
    laborable = false;
    label = "Festivo";
    descripcion = cal.title || null;
  } else if (noLab) {
    laborable = false;
    label = "No laborable";
    descripcion = "Día no laborable";
  }

  return { laborable, label, descripcion };
}

export default function DrawerDiaDetalleAdmin({
  ymd,
  allEvents,
  onSelectEvent,
  onClose,
}: {
  ymd: string;
  allEvents: CalendarioIntegradoEvento[];
  onSelectEvent: (ev: CalendarioIntegradoEvento) => void;
  onClose: () => void;
}) {
  const dayEvents = useMemo(() => {
    return allEvents
      .filter((ev) => eventTouchesDay(ev, ymd))
      .sort(sortDayEvents);
  }, [allEvents, ymd]);

  const header = useMemo(() => buildHeader(ymd, dayEvents), [ymd, dayEvents]);

  const fechaHuman = useMemo(() => {
    try {
      return new Date(`${ymd}T00:00:00`).toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return ymd;
    }
  }, [ymd]);

  return (
    <div className="p-4 space-y-3">
      {/* Cabecera */}
      <div className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">{header.label}</span>
        {" · "}
        {fechaHuman}
      </div>

      {header.descripcion ? (
        <div className="text-xs text-gray-500">{header.descripcion}</div>
      ) : null}

      {/* Resumen breve */}
      <div className="text-xs text-gray-500">
        {header.laborable ? "Día laborable." : "Día no laborable."}{" "}
        {dayEvents.length ? `Eventos: ${dayEvents.length}.` : "Sin eventos."}
      </div>

      {/* Eventos */}
      {dayEvents.length === 0 ? (
        <div className="text-sm text-gray-500">
          No hay eventos para este día.
        </div>
      ) : (
        <ul className="space-y-2">
          {dayEvents.map((ev) => {
            const col = colorForIntegrado(ev);
            const right =
              ev.tipo === "ausencia"
                ? ev.estado || ""
                : ev.tipo === "jornada_real"
                  ? ev.estado || ""
                  : "";

            return (
              <li
                key={String(ev.id)}
                onClick={() => onSelectEvent(ev)}
                className="border rounded p-3 flex items-center justify-between cursor-pointer active:bg-black/[0.04]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col }}
                  />
                  <span className="font-medium truncate">{ev.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {right ? (
                    <span className="text-xs text-gray-500">{right}</span>
                  ) : null}
                  <span className="text-[11px] text-gray-400">[{ev.tipo}]</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04]"
      >
        Cerrar
      </button>
    </div>
  );
}
