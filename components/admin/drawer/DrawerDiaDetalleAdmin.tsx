// =========================
// 2) FRONTEND: Drawer del día (Admin) -> igual empleado, pero con CalendarioIntegradoEvento
// Archivo: app180-frontend/components/admin/drawer/DrawerDiaDetalleAdmin.tsx
// =========================

"use client";

import { useMemo } from "react";
import type { CalendarioIntegradoEvento } from "@/types/calendario";
import { colorFor } from "@/components/empleado/calendarioColors";

type DiaDetalleAdminData = {
  fecha: string; // YYYY-MM-DD
  laborable: boolean;
  label: string;
  descripcion?: string | null;
  eventos: CalendarioIntegradoEvento[];
};

function addOneDayYMD(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toYMD(d: string | Date) {
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 10);

  const x = new Date(s);
  if (isNaN(x.getTime())) return s.slice(0, 10);
  return x.toISOString().slice(0, 10);
}

function eventTouchesDay(ev: CalendarioIntegradoEvento, ymd: string) {
  const isAllDay = Boolean(ev.allDay);

  if (isAllDay) {
    const s = toYMD(ev.start);
    const endEx = ev.end ? toYMD(ev.end) : addOneDayYMD(s);
    return ymd >= s && ymd < endEx;
  }

  // Timed: compara por fecha del start (sin TZ hacks)
  const s = toYMD(String(ev.start).slice(0, 10));
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

function buildDiaDetalleData(
  ymd: string,
  dayEvents: CalendarioIntegradoEvento[],
): DiaDetalleAdminData {
  // Prioridad: festivo -> no_laborable -> laborable
  const festivo = dayEvents.find((e) => e.tipo === "calendario_empresa");
  const noLab = dayEvents.find((e) => e.tipo === "no_laborable");

  let laborable = true;
  let label = "Laborable";
  let descripcion: string | null = null;

  if (festivo) {
    laborable = false;
    label = "Festivo";
    descripcion = festivo.title || null;
  } else if (noLab) {
    laborable = false;
    label = "No laborable";
    descripcion = "Día no laborable";
  }

  return { fecha: ymd, laborable, label, descripcion, eventos: dayEvents };
}

function tipoLabel(t: CalendarioIntegradoEvento["tipo"]) {
  switch (t) {
    case "calendario_empresa":
      return "Festivo";
    case "no_laborable":
      return "No laborable";
    case "ausencia":
      return "Ausencia";
    case "jornada_real":
      return "Jornada real";
    case "jornada_plan":
      return "Plan";
    default:
      return t;
  }
}

function colorForEvento(ev: CalendarioIntegradoEvento) {
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
  if (ev.tipo === "calendario_empresa" || ev.tipo === "no_laborable") {
    return colorFor("festivo", "aprobado");
  }
  if (ev.tipo === "jornada_plan") return "#9CA3AF";
  return "#6B7280";
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
    const arr = (allEvents || [])
      .filter((ev) => eventTouchesDay(ev, ymd))
      .slice()
      .sort(sortDayEvents);
    return arr;
  }, [allEvents, ymd]);

  const data = useMemo(
    () => buildDiaDetalleData(ymd, dayEvents),
    [ymd, dayEvents],
  );

  return (
    <div className="p-4 space-y-3">
      {/* Cabecera */}
      <div className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">{data.label}</span>
        {" · "}
        {new Date(data.fecha).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      {data.descripcion ? (
        <div className="text-xs text-gray-500">{data.descripcion}</div>
      ) : null}

      {/* Resumen */}
      <div className="text-xs text-gray-500">
        {data.laborable ? "Día laborable" : "Día no laborable"} ·{" "}
        {data.eventos.length} evento(s)
      </div>

      {/* Lista de eventos */}
      {data.eventos.length === 0 ? (
        <div className="text-sm text-gray-500">
          No hay eventos para este día.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.eventos.map((ev) => {
            const col = colorForEvento(ev);

            const rightLabel =
              ev.tipo === "ausencia" && ev.estado
                ? ev.estado
                : ev.tipo === "jornada_real" && ev.estado
                  ? ev.estado
                  : tipoLabel(ev.tipo);

            return (
              <li
                key={String(ev.id)}
                onClick={() => onSelectEvent(ev)}
                className="border rounded p-3 flex items-center justify-between cursor-pointer active:bg-black/[0.04]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col }}
                    />
                    <span className="font-medium truncate">
                      {ev.title}
                      {ev.empleado_nombre ? ` · ${ev.empleado_nombre}` : ""}
                    </span>
                  </div>

                  {/* Subtexto (rango) */}
                  <div className="text-xs text-gray-500 mt-1">
                    {String(ev.start).slice(0, 10)}
                    {ev.end ? ` → ${String(ev.end).slice(0, 10)}` : ""}
                  </div>
                </div>

                <span className="text-xs text-gray-500 shrink-0">
                  {rightLabel}
                </span>
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
