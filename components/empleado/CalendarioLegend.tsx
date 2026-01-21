import { colorFor } from "./calendarioColors";

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
    <div className="legend-horizontal text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-2">
      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("vacaciones")} /> Vacaciones
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("baja_medica")} /> Baja médica
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("festivo_local")} /> Festivo local
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("festivo_nacional")} /> Festivo nacional
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("convenio")} /> Ajuste convenio
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("cierre_empresa")} /> Cierre empresa
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("domingo")} /> Domingo
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("laborable_extra")} /> Laborable extra
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("real_trabajo")} /> Trabajo real
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("real_descanso")} /> Descanso real
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("plan_trabajo")} /> Plan trabajo
      </span>

      <span className="legend-item inline-flex items-center gap-2">
        <Dot color={colorFor("plan_descanso")} /> Plan descanso
      </span>
    </div>
  );
}
