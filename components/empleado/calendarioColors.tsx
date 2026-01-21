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
      return "#22c55e";

    case "baja_medica":
      return "#ef4444";

    case "ausencia":
      return "#f59e0b"; // naranja

    case "festivo_local":
      return "#6366f1";

    case "festivo_nacional":
      return "#4338ca";

    case "convenio":
      return "#0ea5e9";

    case "cierre_empresa":
      return "#111827";

    case "laborable_extra":
      return "#14b8a6";

    case "domingo":
      return "#9ca3af";

    case "no_laborable":
      return "#9ca3af";

    case "jornada":
      return "#22c55e";

    case "jornada_real":
      return "#16a34a"; // verde más fuerte

    case "real_trabajo":
      return "#16a34a";

    case "real_descanso":
      return "#eab308";

    case "plan_trabajo":
      return "#93c5fd";

    case "plan_descanso":
      return "#fde68a";

    default:
      console.warn("Color no definido para tipo:", tipo);
      return "#64748b";
  }
}
