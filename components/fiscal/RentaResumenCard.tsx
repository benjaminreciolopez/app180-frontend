"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RentaResumenProps {
  data: {
    estado: string;
    resultado: string;
    importe_resultado: number;
    cuota_diferencial: number;
    cuota_liquida?: number;
    cuota_integra_total?: number;
    cuota_integra?: number;
    retenciones_pagos_cuenta?: number;
    retenciones?: number;
    pagos_fraccionados: number;
    base_liquidable_general?: number;
    base_imponible?: number;
    total_deducciones?: number;
  };
  tipo: "irpf" | "sociedades";
}

const estadoLabels: Record<string, { text: string; color: string }> = {
  borrador: { text: "Borrador", color: "bg-slate-100 text-slate-700" },
  en_progreso: { text: "En progreso", color: "bg-amber-100 text-amber-700" },
  calculado: { text: "Calculado", color: "bg-blue-100 text-blue-700" },
  presentado: { text: "Presentado", color: "bg-green-100 text-green-700" },
  rectificada: { text: "Rectificada", color: "bg-purple-100 text-purple-700" },
};

export function RentaResumenCard({ data, tipo }: RentaResumenProps) {
  const { resultado, importe_resultado, cuota_diferencial, estado } = data;
  const estadoCfg = estadoLabels[estado] || estadoLabels.borrador;

  const isAPagar = resultado === "a_pagar";
  const isADevolver = resultado === "a_devolver";

  const baseLiq = tipo === "irpf" ? data.base_liquidable_general : data.base_imponible;
  const cuotaIntegra = tipo === "irpf" ? data.cuota_integra_total : data.cuota_integra;
  const retenciones = tipo === "irpf" ? data.retenciones_pagos_cuenta : data.retenciones;
  const deducciones = data.total_deducciones;

  return (
    <Card className={`border-2 ${
      isAPagar ? "border-red-200 bg-red-50/50" :
      isADevolver ? "border-green-200 bg-green-50/50" :
      "border-slate-200"
    }`}>
      <CardContent className="py-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: resultado */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isAPagar ? "bg-red-100" : isADevolver ? "bg-green-100" : "bg-slate-100"
            }`}>
              {isAPagar ? <TrendingUp className="w-6 h-6 text-red-600" /> :
               isADevolver ? <TrendingDown className="w-6 h-6 text-green-600" /> :
               <Minus className="w-6 h-6 text-slate-400" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {tipo === "irpf" ? "Resultado Renta IRPF" : "Resultado Imp. Sociedades"}
              </p>
              <p className={`text-2xl font-bold ${
                isAPagar ? "text-red-600" : isADevolver ? "text-green-600" : "text-slate-600"
              }`}>
                {isAPagar ? "A pagar: " : isADevolver ? "A devolver: " : "Cero: "}
                {formatCurrency(importe_resultado || 0)}
              </p>
            </div>
          </div>

          {/* Right: key figures */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Base liquidable</p>
              <p className="text-sm font-semibold">{formatCurrency(baseLiq || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Cuota integra</p>
              <p className="text-sm font-semibold">{formatCurrency(cuotaIntegra || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Deducciones</p>
              <p className="text-sm font-semibold text-green-600">-{formatCurrency(deducciones || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Retenciones + pagos</p>
              <p className="text-sm font-semibold text-green-600">
                -{formatCurrency((retenciones || 0) + (data.pagos_fraccionados || 0))}
              </p>
            </div>
            <Badge className={estadoCfg.color}>{estadoCfg.text}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
