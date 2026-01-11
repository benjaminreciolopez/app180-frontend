"use client";

import { COLOR_MAP } from "./calendarioColors";

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function Item({ color, label }: { color: string; label: string }) {
  return (
    <span className="legend-item">
      <Dot color={color} />
      <span>{label}</span>
    </span>
  );
}

export default function CalendarioLegend() {
  return (
    <div className="legend-horizontal text-xs text-gray-700">
      <Item color={COLOR_MAP.vacaciones} label="Vacaciones" />
      <Item color={COLOR_MAP.baja_medica} label="Baja médica" />
      <Item color={COLOR_MAP.festivo} label="Festivo" />
      <Item color={COLOR_MAP.fichaje} label="Fichaje" />
      <Item color={COLOR_MAP.no_laborable} label="No laborable" />
      <Item color={COLOR_MAP.aprobado} label="Aprobado" />
      <Item color={COLOR_MAP.rechazado} label="Rechazado" />
    </div>
  );
}
