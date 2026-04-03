"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface CalendarioFiscalProps {
  year: string;
}

interface CalendarEntry {
  modelo: string;
  periodo: string;
  limite: string;
  label: string;
  yearOffset?: number;
}

interface FiscalModelStatus {
  modelo: string;
  periodo: string;
  estado: string;
}

const DEADLINES: CalendarEntry[] = [
  // Trimestrales
  { modelo: "303", periodo: "1T", limite: "04-20", label: "Modelo 303 - 1T" },
  { modelo: "303", periodo: "2T", limite: "07-20", label: "Modelo 303 - 2T" },
  { modelo: "303", periodo: "3T", limite: "10-20", label: "Modelo 303 - 3T" },
  { modelo: "303", periodo: "4T", limite: "01-30", label: "Modelo 303 - 4T", yearOffset: 1 },
  { modelo: "130", periodo: "1T", limite: "04-20", label: "Modelo 130 - 1T" },
  { modelo: "130", periodo: "2T", limite: "07-20", label: "Modelo 130 - 2T" },
  { modelo: "130", periodo: "3T", limite: "10-20", label: "Modelo 130 - 3T" },
  { modelo: "130", periodo: "4T", limite: "01-30", label: "Modelo 130 - 4T", yearOffset: 1 },
  { modelo: "111", periodo: "1T", limite: "04-20", label: "Modelo 111 - 1T" },
  { modelo: "111", periodo: "2T", limite: "07-20", label: "Modelo 111 - 2T" },
  { modelo: "111", periodo: "3T", limite: "10-20", label: "Modelo 111 - 3T" },
  { modelo: "111", periodo: "4T", limite: "01-30", label: "Modelo 111 - 4T", yearOffset: 1 },
  { modelo: "115", periodo: "1T", limite: "04-20", label: "Modelo 115 - 1T" },
  { modelo: "115", periodo: "2T", limite: "07-20", label: "Modelo 115 - 2T" },
  { modelo: "115", periodo: "3T", limite: "10-20", label: "Modelo 115 - 3T" },
  { modelo: "115", periodo: "4T", limite: "01-30", label: "Modelo 115 - 4T", yearOffset: 1 },
  { modelo: "349", periodo: "1T", limite: "04-20", label: "Modelo 349 - 1T" },
  { modelo: "349", periodo: "2T", limite: "07-20", label: "Modelo 349 - 2T" },
  { modelo: "349", periodo: "3T", limite: "10-20", label: "Modelo 349 - 3T" },
  { modelo: "349", periodo: "4T", limite: "01-30", label: "Modelo 349 - 4T", yearOffset: 1 },
  // Anuales
  { modelo: "390", periodo: "OA", limite: "01-30", label: "Modelo 390 - Anual", yearOffset: 1 },
  { modelo: "190", periodo: "OA", limite: "01-31", label: "Modelo 190 - Anual", yearOffset: 1 },
  { modelo: "180", periodo: "OA", limite: "01-31", label: "Modelo 180 - Anual", yearOffset: 1 },
  { modelo: "347", periodo: "OA", limite: "02-28", label: "Modelo 347 - Anual", yearOffset: 1 },
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getDeadlineDate(dl: CalendarEntry, baseYear: number): Date {
  const y = dl.yearOffset ? baseYear + dl.yearOffset : baseYear;
  const [month, day] = dl.limite.split("-").map(Number);
  return new Date(y, month - 1, day);
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type DeadlineStatus = "presentado" | "pendiente" | "proximo" | "vencido";

function getStatus(days: number, presented: boolean): DeadlineStatus {
  if (presented) return "presentado";
  if (days < 0) return "vencido";
  if (days <= 30) return "proximo";
  return "pendiente";
}

const STATUS_CONFIG: Record<DeadlineStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  presentado: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Presentado" },
  proximo: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Proximo" },
  vencido: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Vencido" },
  pendiente: { icon: AlertTriangle, color: "text-slate-400", bg: "bg-white border-slate-200", label: "Pendiente" },
};

export default function CalendarioFiscal({ year }: CalendarioFiscalProps) {
  const [statuses, setStatuses] = useState<FiscalModelStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, [year]);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/calendario/${year}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStatuses(json.data || []);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const baseYear = parseInt(year);

  // Build enriched deadlines
  const enriched = DEADLINES.map((dl) => {
    const date = getDeadlineDate(dl, baseYear);
    const days = daysUntil(date);
    const presented = statuses.some(
      (s) => s.modelo === dl.modelo && s.periodo === dl.periodo && s.estado === "PRESENTADO"
    );
    const status = getStatus(days, presented);
    return { ...dl, date, days, status };
  });

  // Group by month
  const byMonth = new Map<number, typeof enriched>();
  enriched.forEach((dl) => {
    const m = dl.date.getMonth();
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(dl);
  });

  // Stats
  const totalCount = enriched.length;
  const presentedCount = enriched.filter((d) => d.status === "presentado").length;
  const overdueCount = enriched.filter((d) => d.status === "vencido").length;
  const upcomingCount = enriched.filter((d) => d.status === "proximo").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{totalCount}</p>
          <p className="text-xs text-muted-foreground">Total obligaciones</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{presentedCount}</p>
          <p className="text-xs text-green-700">Presentados</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{upcomingCount}</p>
          <p className="text-xs text-amber-700">Proximos (&lt;30d)</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-red-700">Vencidos</p>
        </div>
      </div>

      {/* Calendar grid by month */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(byMonth.entries())
          .sort(([a], [b]) => a - b)
          .map(([month, deadlines]) => (
            <Card key={month} className="overflow-hidden">
              <CardHeader className="py-2.5 px-3 bg-slate-50 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {MONTH_NAMES[month]} {deadlines[0]?.date.getFullYear()}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {deadlines
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map((dl, i) => {
                    const config = STATUS_CONFIG[dl.status];
                    const Icon = config.icon;
                    return (
                      <div
                        key={`${dl.modelo}-${dl.periodo}-${i}`}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs border ${config.bg}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span className="font-medium text-slate-700">{dl.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {dl.date.getDate()}/{dl.date.getMonth() + 1}
                          </span>
                          <Badge
                            variant={
                              dl.status === "presentado"
                                ? "default"
                                : dl.status === "vencido"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-[10px] h-4 px-1.5"
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ))}
      </div>

      {loading && (
        <p className="text-xs text-center text-muted-foreground">Cargando estado de presentaciones...</p>
      )}
    </div>
  );
}
