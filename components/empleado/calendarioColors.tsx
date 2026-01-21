export const COLOR_MAP: Record<string, string> = {
  // ausencias
  vacaciones: "#16a34a",
  baja_medica: "#dc2626",

  // festivos / cierres / no laborables
  festivo_nacional: "#4f46e5",
  festivo_local: "#4f46e5",
  festivo_empresa: "#4f46e5",
  cierre_empresa: "#111827",
  no_laborable: "#6b7280",

  // convenios
  convenio: "#2563eb",

  // planificación / real (si decides mostrarlos)
  jornada_plan: "#60a5fa",
  jornada_real: "#15803d",
  plan_trabajo: "#60a5fa",
  plan_descanso: "#f59e0b",
  real_trabajo: "#16a34a",
  real_descanso: "#f97316",

  // fallback si llega algo no controlado
  default: "#64748b",
};

export function colorFor(tipo?: string | null, estado?: string | null) {
  const t = String(tipo || "").toLowerCase();

  // Si quieres diferenciar por estado
  if ((t === "vacaciones" || t === "baja_medica") && estado) {
    const s = String(estado).toLowerCase();
    if (s === "pendiente") return "#f59e0b";
    if (s === "rechazado") return "#6b7280";
    // aprobado -> color normal
  }

  if (COLOR_MAP[t]) return COLOR_MAP[t];
  console.warn("Color no definido para tipo:", t);
  return COLOR_MAP.default;
}
