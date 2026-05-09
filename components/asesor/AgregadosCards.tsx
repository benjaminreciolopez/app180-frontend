"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Users, ArrowRight, FileText, Receipt, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAsesorAgregados } from "@/hooks/useAsesorAgregados";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

/**
 * Cards "Mi Despacho" y "Mis Clientes" — separa visualmente la contabilidad
 * propia del asesor de la cartera consolidada de clientes (Nivel 3).
 */
export function AgregadosCards() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const { data, isLoading, error } = useAsesorAgregados(year);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Vista consolidada
        </h2>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1 font-medium"
          aria-label="Ejercicio"
        >
          {[0, 1, 2].map((delta) => {
            const y = new Date().getFullYear() - delta;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MI DESPACHO */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                </div>
                Mi Despacho
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                {data?.despacho?.nombre || "Asesoría"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="text-xs text-muted-foreground py-4">Cargando…</div>}
            {error && (
              <div className="text-xs text-red-600 py-2">
                Error al cargar agregados del despacho.
              </div>
            )}
            {!isLoading && !error && !data?.despacho && (
              <div className="text-xs text-muted-foreground py-3">
                Tu asesoría no tiene una empresa contable propia configurada todavía.
              </div>
            )}
            {data?.despacho && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <KPI
                    icon={<TrendingUp className="w-3 h-3" />}
                    label="Ingresos"
                    value={fmtEUR(data.despacho.ingresos)}
                    color="text-emerald-700 dark:text-emerald-300"
                  />
                  <KPI
                    icon={<TrendingDown className="w-3 h-3" />}
                    label="Gastos"
                    value={fmtEUR(data.despacho.gastos)}
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KPI
                    icon={<FileText className="w-3 h-3" />}
                    label="Facturas"
                    value={`${data.despacho.num_facturas}`}
                    sub={data.despacho.num_borradores ? `${data.despacho.num_borradores} borrador${data.despacho.num_borradores > 1 ? "es" : ""}` : ""}
                    color="text-foreground"
                  />
                  <KPI
                    icon={<Receipt className="w-3 h-3" />}
                    label="Resultado"
                    value={fmtEUR(data.despacho.resultado)}
                    color={data.despacho.resultado >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}
                  />
                </div>
                <Link
                  href="/asesor/contabilidad/balance"
                  className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  Ver contabilidad del despacho <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* MIS CLIENTES */}
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                </div>
                Mis Clientes
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
                {data?.clientes.num_clientes ?? 0} clientes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="text-xs text-muted-foreground py-4">Cargando…</div>}
            {error && (
              <div className="text-xs text-red-600 py-2">
                Error al cargar agregados de clientes.
              </div>
            )}
            {!isLoading && !error && data && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <KPI
                    icon={<TrendingUp className="w-3 h-3" />}
                    label="Ingresos cartera"
                    value={fmtEUR(data.clientes.ingresos_total)}
                    color="text-blue-700 dark:text-blue-300"
                  />
                  <KPI
                    icon={<TrendingDown className="w-3 h-3" />}
                    label="Gastos cartera"
                    value={fmtEUR(data.clientes.gastos_total)}
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KPI
                    icon={<FileText className="w-3 h-3" />}
                    label="Facturas"
                    value={`${data.clientes.num_facturas}`}
                    sub={data.clientes.num_borradores ? `${data.clientes.num_borradores} borradores` : ""}
                    color="text-foreground"
                  />
                  <KPI
                    icon={<AlertTriangle className="w-3 h-3" />}
                    label="Asientos por revisar"
                    value={`${data.clientes.pendientes_revision_asientos}`}
                    color={data.clientes.pendientes_revision_asientos > 0 ? "text-amber-700 dark:text-amber-300" : "text-foreground"}
                  />
                </div>
                <Link
                  href="/asesor/clientes"
                  className="text-xs text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                >
                  Ver lista de clientes <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white/60 dark:bg-card/60 rounded-lg px-2.5 py-2 border border-border/50">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${color || ""}`}>{value}</div>
      {sub ? (
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      ) : null}
    </div>
  );
}
