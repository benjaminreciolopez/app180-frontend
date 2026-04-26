"use client";

import { Wifi } from "lucide-react";

interface LiveIndicatorProps {
  livePolling: boolean;
  onToggle: () => void;
  lastUpdated: Date | null;
  intervalSeconds?: number;
  size?: "sm" | "md";
}

/**
 * Pequeño indicador de "tabla en vivo" con toggle Live/Pausado y hora de
 * última lectura. Se usa con useLiveTable para mantener consistencia visual
 * en todas las pantallas.
 */
export function LiveIndicator({
  livePolling,
  onToggle,
  lastUpdated,
  intervalSeconds = 60,
  size = "sm",
}: LiveIndicatorProps) {
  const small = size === "sm";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-md font-medium border transition-colors ${
          small ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
        } ${
          livePolling
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
        }`}
        title={
          livePolling
            ? `Refresco automático cada ${intervalSeconds}s. Click para pausar.`
            : "Pausado. Click para reactivar."
        }
      >
        <Wifi size={small ? 11 : 12} className={livePolling ? "animate-pulse" : ""} />
        {livePolling ? "Live" : "Pausado"}
      </button>
      {lastUpdated && (
        <span className="text-[10px] text-muted-foreground" title={lastUpdated.toLocaleString("es-ES")}>
          {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
    </div>
  );
}
