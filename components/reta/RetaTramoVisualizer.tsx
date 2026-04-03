"use client";

type Tramo = {
  tramo: number;
  rendMin: number;
  rendMax: number;
  baseMin: number;
  baseMax: number;
  tipoCotizacion: number;
};

type Props = {
  tramos: Tramo[];
  tramoActual: number | null;
  tramoRecomendado: number | null;
  rendimientoMensual: number | null;
};

export function RetaTramoVisualizer({ tramos, tramoActual, tramoRecomendado, rendimientoMensual }: Props) {
  if (!tramos || tramos.length === 0) return null;

  const maxBase = Math.max(...tramos.map(t => t.baseMax));

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

      {tramos.map((t) => {
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
              {t.rendMax === Infinity ? `>${t.rendMin.toFixed(0)}€` : `${t.rendMin.toFixed(0)}-${t.rendMax.toFixed(0)}€`}
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
