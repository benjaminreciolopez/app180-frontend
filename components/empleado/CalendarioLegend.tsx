// src/components/empleado/CalendarioLegend.tsx
"use client";

import { COLOR_MAP } from "./calendarioColors";

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export default function CalendarioLegend() {
  return (
    <div className="flex gap-4 overflow-x-auto whitespace-nowrap text-xs text-gray-700 py-1">
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.vacaciones} /> Vacaciones
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.baja_medica} /> Baja médica
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.festivo} /> Festivo
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.fichaje} /> Fichaje
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.no_laborable} /> No laborable
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.aprobado} /> Aprobado
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot color={COLOR_MAP.rechazado} /> Rechazado
      </span>
    </div>
  );
}
