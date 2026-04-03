"use client";

import { formatCurrency } from "@/lib/utils";

const TRAMOS = [
  { desde: 0, hasta: 12450, tipo: 19, color: "bg-green-400" },
  { desde: 12450, hasta: 20200, tipo: 24, color: "bg-lime-400" },
  { desde: 20200, hasta: 35200, tipo: 30, color: "bg-yellow-400" },
  { desde: 35200, hasta: 60000, tipo: 37, color: "bg-orange-400" },
  { desde: 60000, hasta: 300000, tipo: 45, color: "bg-red-400" },
  { desde: 300000, hasta: 600000, tipo: 47, color: "bg-red-600" },
];

interface EscalaIRPFProps {
  baseLiquidable: number;
}

export function EscalaIRPF({ baseLiquidable }: EscalaIRPFProps) {
  // Find which tramo the base falls in
  const maxDisplay = Math.max(baseLiquidable * 1.2, 80000);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Escala IRPF 2025 - Posicion del contribuyente
      </h3>

      {/* Bar visualization */}
      <div className="relative h-10 rounded-lg overflow-hidden flex">
        {TRAMOS.map((tramo, idx) => {
          const tramoAncho = Math.min(tramo.hasta, maxDisplay) - tramo.desde;
          if (tramoAncho <= 0) return null;
          const widthPct = (tramoAncho / maxDisplay) * 100;

          return (
            <div
              key={idx}
              className={`${tramo.color} relative flex items-center justify-center text-xs font-bold text-white/90 transition-all`}
              style={{ width: `${widthPct}%`, minWidth: widthPct > 3 ? "auto" : "0" }}
              title={`${formatCurrency(tramo.desde)} - ${formatCurrency(tramo.hasta)}: ${tramo.tipo}%`}
            >
              {widthPct > 8 && <span>{tramo.tipo}%</span>}
            </div>
          );
        })}

        {/* Position marker */}
        {baseLiquidable > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
            style={{ left: `${Math.min((baseLiquidable / maxDisplay) * 100, 100)}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-xs px-2 py-0.5 rounded">
              {formatCurrency(baseLiquidable)}
            </div>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {TRAMOS.map((tramo, idx) => {
          const isActive = baseLiquidable > tramo.desde;
          const baseEnTramo = isActive
            ? Math.min(baseLiquidable, tramo.hasta) - tramo.desde
            : 0;
          const cuotaTramo = baseEnTramo > 0 ? baseEnTramo * (tramo.tipo / 100) : 0;

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-xs ${isActive ? "font-medium" : "text-muted-foreground"}`}
            >
              <div className={`w-2.5 h-2.5 rounded-sm ${tramo.color} ${!isActive ? "opacity-40" : ""}`} />
              <span>
                {formatCurrency(tramo.desde)}-{tramo.hasta >= 300000 ? "300k+" : formatCurrency(tramo.hasta)}
              </span>
              <span className="text-muted-foreground">({tramo.tipo}%)</span>
              {isActive && cuotaTramo > 0 && (
                <span className="text-slate-700 font-semibold ml-1">
                  = {formatCurrency(Math.round(cuotaTramo * 100) / 100)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
