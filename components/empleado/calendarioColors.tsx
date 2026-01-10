// src/components/empleado/calendarioColors.tsx
import type { CalendarioTipo } from "./calendarioTypes";

export const COLOR_MAP: Record<string, string> = {
  laborable: "#16a34a",
  festivo: "#dc2626",
  vacaciones: "#f59e0b",
  baja_medica: "#2563eb",
  no_laborable: "#6b7280",
  fichaje: "#111827", // negro/gris muy oscuro
};

export function colorFor(tipo?: CalendarioTipo | string) {
  if (!tipo) return COLOR_MAP.no_laborable;
  return COLOR_MAP[tipo] || COLOR_MAP.no_laborable;
}
