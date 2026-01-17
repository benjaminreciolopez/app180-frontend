// src/components/empleado/calendarioColors.tsx
import type { CalendarioTipo } from "./calendarioTypes";

export const COLOR_MAP: Record<string, string> = {
  laborable: "#e5e7eb", // gris claro
  festivo: "#dc2626",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  fichaje: "#111827",
  no_laborable: "#6b7280",
  trabajo: "#2563eb",

  // estados
  pendiente: "#f59e0b",
  aprobado: "#16a34a",
  rechazado: "#9ca3af",
};

export function colorFor(
  tipo?: CalendarioTipo | string,
  estado?: "pendiente" | "aprobado" | "rechazado"
) {
  // Rechazado siempre gris
  if (estado === "rechazado") return COLOR_MAP.rechazado;

  // Pendiente: color de estado
  if (estado === "pendiente") return COLOR_MAP.pendiente;

  // Tipo manda
  if (tipo && COLOR_MAP[tipo]) return COLOR_MAP[tipo];

  return COLOR_MAP.no_laborable;
}
