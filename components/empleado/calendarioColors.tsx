// src/components/empleado/calendarioColors.tsx
import type { CalendarioTipo } from "./calendarioTypes";
import type { EstadoAusencia } from "./calendarioTypes";

export const COLOR_MAP: Record<string, string> = {
  laborable: "#e5e7eb", // gris claro
  festivo: "#dc2626",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  fichaje: "#111827",
  no_laborable: "#6b7280",
  trabajo: "#2563eb",

  plan_trabajo: "rgba(22,163,74,0.15)",
  plan_descanso: "rgba(249,115,22,0.15)",

  jornada: "#111827",
  descanso: "#f97316",

  // estados
  pendiente: "#f59e0b",
  aprobado: "#16a34a",
  rechazado: "#9ca3af",
};

export function colorFor(tipo: string, estado?: EstadoAusencia) {
  switch (tipo) {
    case "vacaciones":
      return "#22c55e"; // verde

    case "baja_medica":
      return "#ef4444"; // rojo

    case "festivo_local":
      return "#6366f1"; // índigo

    case "festivo_nacional":
      return "#4338ca"; // índigo oscuro

    case "convenio":
      return "#0ea5e9"; // azul

    case "cierre_empresa":
      return "#111827"; // casi negro

    case "laborable_extra":
      return "#14b8a6"; // teal

    case "domingo":
      return "#9ca3af"; // gris

    case "no_laborable":
      return "#9ca3af"; // gris

    case "jornada":
      return "#22c55e";

    case "real_trabajo":
      return "#16a34a";

    case "real_descanso":
      return "#eab308";

    case "plan_trabajo":
      return "#93c5fd";

    case "plan_descanso":
      return "#fde68a";

    default:
      return "#64748b"; // gris neutro
  }
}
