"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, ArrowRight } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RetaResumen = {
  totalClientes: number;
  conRiesgoAlto: number;
  conAlertasPendientes: number;
};

export function RetaDashboardWidget() {
  const router = useRouter();
  const [data, setData] = useState<RetaResumen | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch("/asesor/reta/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json.resumen);
        }
      } catch {
        // silently fail - widget is optional
      }
    })();
  }, []);

  if (!data || data.totalClientes === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-300"
      onClick={() => router.push("/asesor/reta")}
    >
      <Shield size={18} />
      <div className="flex-1">
        <p className="text-sm font-semibold">
          RETA Autonomos
        </p>
        <p className="text-xs">
          {data.totalClientes} autonomo{data.totalClientes !== 1 ? "s" : ""}
          {data.conRiesgoAlto > 0 && (
            <span className="text-red-600 dark:text-red-400"> · {data.conRiesgoAlto} con riesgo alto</span>
          )}
          {data.conAlertasPendientes > 0 && (
            <span> · {data.conAlertasPendientes} alertas</span>
          )}
        </p>
      </div>
      {data.conRiesgoAlto > 0 && (
        <Badge variant="destructive" className="text-[10px]">
          {data.conRiesgoAlto}
        </Badge>
      )}
      <ArrowRight size={14} />
    </div>
  );
}
