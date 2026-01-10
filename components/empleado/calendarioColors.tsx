// src/components/empleado/calendarioColors.tsx
import type { CalendarioTipo } from "./calendarioTypes";

export const COLOR_MAP: Record<string, string> = {
  laborable: "#16a34a",
  festivo: "#e60d0d",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  fichaje: "#111827",
  no_laborable: "#6b7280",
  pendiente: "#f59e0b",
  aprobado: "#16a34a",
  rechazado: "#e60eee",
};
export function colorFor(tipo?: CalendarioTipo | string) {
  if (!tipo) return COLOR_MAP.no_laborable;
  return COLOR_MAP[tipo] || COLOR_MAP.no_laborable;
}
