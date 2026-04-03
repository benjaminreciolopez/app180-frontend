"use client";

type Props = {
  riesgo: number | null;
  confianza: number | null;
};

export function RetaRegularizacionGauge({ riesgo, confianza }: Props) {
  if (riesgo === null) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Sin datos de regularizacion
      </div>
    );
  }

  const abs = Math.abs(riesgo);
  const isPositive = riesgo > 0;
  const maxScale = 3000;
  const pct = Math.min((abs / maxScale) * 100, 100);

  let color = "text-green-600";
  let bgColor = "bg-green-100 dark:bg-green-900/30";
  let label = "Correcto";

  if (abs > 1000) {
    color = isPositive ? "text-red-600" : "text-blue-600";
    bgColor = isPositive ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30";
    label = isPositive ? "Riesgo alto" : "Sobreestimado";
  } else if (abs > 500) {
    color = isPositive ? "text-amber-600" : "text-blue-500";
    bgColor = isPositive ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/20";
    label = isPositive ? "Riesgo moderado" : "Ligera devolucion";
  } else if (abs > 100) {
    color = "text-green-600";
    bgColor = "bg-green-50 dark:bg-green-900/20";
    label = isPositive ? "Ajuste menor" : "Pequena devolucion";
  }

  return (
    <div className={`rounded-lg p-4 ${bgColor} text-center space-y-2`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Regularizacion estimada</p>
      <p className={`text-3xl font-bold ${color}`}>
        {isPositive ? "+" : "-"}{abs.toFixed(0)} €
      </p>
      <p className={`text-sm font-medium ${color}`}>{label}</p>
      {isPositive && abs > 500 && (
        <p className="text-xs text-muted-foreground">
          Importe estimado a pagar a la Seguridad Social a fin de ano
        </p>
      )}
      {!isPositive && abs > 100 && (
        <p className="text-xs text-muted-foreground">
          Posible devolucion por sobrecotizacion
        </p>
      )}

      {/* Barra de progreso */}
      <div className="w-full bg-muted/50 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all ${isPositive ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {confianza !== null && (
        <p className="text-[10px] text-muted-foreground">
          Confianza de la estimacion: {confianza}%
          {confianza < 50 && " — Datos insuficientes para estimacion fiable"}
        </p>
      )}
    </div>
  );
}
