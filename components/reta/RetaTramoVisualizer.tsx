"use client";

type TramoRaw = {
  tramo?: number;
  tramo_num?: number;
  rendMin?: number | null;
  rendMax?: number | null;
  rend_neto_mensual_min?: number | null;
  rend_neto_mensual_max?: number | null;
  baseMin?: number | null;
  baseMax?: number | null;
  base_min?: number | null;
  base_max?: number | null;
  tipoCotizacion?: number | null;
  tipo_cotizacion?: number | null;
};

type Props = {
  tramos: TramoRaw[];
  tramoActual: number | null;
  tramoRecomendado: number | null;
  rendimientoMensual: number | null;
};

const n = (val: number | null | undefined): number => Number(val) || 0;

export function RetaTramoVisualizer({ tramos, tramoActual, tramoRecomendado, rendimientoMensual }: Props) {
  if (!tramos || tramos.length === 0) return null;

  // Normalize field names (backend may send snake_case or camelCase)
  const normalized = tramos.map(t => ({
    tramo: t.tramo ?? t.tramo_num ?? 0,
    rendMin: n(t.rendMin ?? t.rend_neto_mensual_min),
    rendMax: t.rendMax ?? t.rend_neto_mensual_max,
    baseMin: n(t.baseMin ?? t.base_min),
    baseMax: n(t.baseMax ?? t.base_max),
  }));

  const maxBase = Math.max(...normalized.map(t => t.baseMax), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Recomendado
        </span>
      </div>

      {normalized.map((t) => {
        const widthPct = (t.baseMax / maxBase) * 100;
        const isActual = t.tramo === tramoActual;
        const isRecomendado = t.tramo === tramoRecomendado;

        let barColor = "bg-muted";
        if (isActual && isRecomendado) barColor = "bg-green-500";
        else if (isActual) barColor = "bg-blue-500";
        else if (isRecomendado) barColor = "bg-green-500";

        return (
          <div key={t.tramo} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-right font-mono text-muted-foreground">{t.tramo}</span>
            <div className="flex-1 h-5 bg-muted/30 rounded-sm overflow-hidden relative">
              <div
                className={`h-full rounded-sm transition-all ${barColor} ${isActual || isRecomendado ? "opacity-100" : "opacity-30"}`}
                style={{ width: `${widthPct}%` }}
              />
              {(isActual || isRecomendado) && (
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium">
                  {t.baseMin.toFixed(0)}€ - {t.baseMax.toFixed(0)}€
                  {isActual && !isRecomendado && " (actual)"}
                  {isRecomendado && !isActual && " (recom.)"}
                  {isActual && isRecomendado && " ✓"}
                </span>
              )}
            </div>
            <span className="w-20 text-right font-mono text-muted-foreground">
              {t.rendMax == null ? `>${t.rendMin.toFixed(0)}€` : `${t.rendMin.toFixed(0)}-${n(t.rendMax).toFixed(0)}€`}
            </span>
          </div>
        );
      })}

      {rendimientoMensual !== null && (
        <p className="text-xs text-center mt-2 text-muted-foreground">
          Rendimiento neto mensual estimado: <span className="font-semibold">{rendimientoMensual.toFixed(2)} €</span>
        </p>
      )}
    </div>
  );
}
