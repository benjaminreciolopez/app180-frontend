"use client";

import { useEffect, useState, useCallback } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import {
    Shield, ShieldAlert, ShieldCheck, Settings, Calculator,
    TrendingUp, TrendingDown, AlertTriangle, Info, XCircle,
    Banknote, Car, FileWarning, BarChart3, ArrowRight,
} from "lucide-react";
import FiscalAlertConfigDrawer from "./FiscalAlertConfigDrawer";
import FiscalSimulatorDialog from "./FiscalSimulatorDialog";

interface FiscalAlert {
    triggered: boolean;
    alert_type: string;
    severity: "info" | "warning" | "critical";
    current_value: number | null;
    threshold: number | null;
    message: string;
    recommendation: string;
    details?: any[];
}

interface FiscalRatios {
    gastos_ingresos: number;
    iva_deducible_devengado: number;
    rendimiento_neto: number;
    resultado_iva: number;
    ingresos_acumulados: number;
    gastos_acumulados: number;
}

interface AlertData {
    alerts: FiscalAlert[];
    riskScore: number;
    ratios: FiscalRatios;
    config: any;
}

const SEVERITY_CONFIG = {
    info: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Info, label: "Info" },
    warning: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle, label: "Atención" },
    critical: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "Crítico" },
};

const ALERT_ICONS: Record<string, any> = {
    gastos_ingresos_ratio: BarChart3,
    gastos_sin_ingresos: BarChart3,
    consecutive_losses: TrendingDown,
    iva_ratio: FileWarning,
    iva_sin_devengado: FileWarning,
    gasto_spike: TrendingUp,
    ingreso_drop: TrendingDown,
    cash_payments: Banknote,
    missing_retentions: AlertTriangle,
    vehicle_expenses: Car,
};

function RiskGauge({ score }: { score: number }) {
    const getColor = (s: number) => {
        if (s <= 20) return { ring: "text-green-500", bg: "bg-green-50", label: "Bajo", labelColor: "text-green-700" };
        if (s <= 45) return { ring: "text-yellow-500", bg: "bg-yellow-50", label: "Moderado", labelColor: "text-yellow-700" };
        if (s <= 70) return { ring: "text-orange-500", bg: "bg-orange-50", label: "Alto", labelColor: "text-orange-700" };
        return { ring: "text-red-500", bg: "bg-red-50", label: "Muy Alto", labelColor: "text-red-700" };
    };

    const c = getColor(score);
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference - (score / 100) * circumference;

    return (
        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${c.bg}`}>
            <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                        strokeWidth="8" className="text-gray-200" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                        strokeWidth="8" className={c.ring}
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{score}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                </div>
            </div>
            <span className={`mt-2 text-sm font-semibold ${c.labelColor}`}>Riesgo {c.label}</span>
        </div>
    );
}

function RatioBar({ label, value, threshold, format = "percent" }: {
    label: string; value: number; threshold: number; format?: "percent" | "currency";
}) {
    const ratio = threshold > 0 ? Math.min((value / threshold) * 100, 150) : 0;
    const isOver = value > threshold;
    const barColor = isOver ? "bg-red-500" : ratio > 85 ? "bg-amber-500" : "bg-green-500";

    const displayValue = format === "currency" ? formatCurrency(value) : `${(value * 100).toFixed(1)}%`;
    const displayThreshold = format === "currency" ? formatCurrency(threshold) : `${(threshold * 100).toFixed(0)}%`;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-medium ${isOver ? "text-red-600" : "text-slate-700"}`}>
                    {displayValue} / {displayThreshold}
                </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(ratio, 100)}%` }} />
            </div>
        </div>
    );
}

interface Props {
    year: string;
    trimestre: string;
}

export default function FiscalAlertsPanel({ year, trimestre }: Props) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AlertData | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [simulatorOpen, setSimulatorOpen] = useState(false);

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/alerts?year=${year}&trimestre=${trimestre}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) setData(json.data);
            }
        } catch (err) {
            console.error("Error loading fiscal alerts:", err);
        } finally {
            setLoading(false);
        }
    }, [year, trimestre]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    if (loading) return <LoadingSpinner />;
    if (!data) return <p className="text-sm text-muted-foreground text-center py-8">No se pudieron cargar las alertas.</p>;

    const criticalCount = data.alerts.filter(a => a.severity === "critical").length;
    const warningCount = data.alerts.filter(a => a.severity === "warning").length;
    const infoCount = data.alerts.filter(a => a.severity === "info").length;

    return (
        <div className="space-y-6">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Inteligencia Fiscal</h2>
                    <p className="text-xs text-muted-foreground">
                        Análisis preventivo de riesgos frente a Hacienda · {trimestre}T {year}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                        <Settings className="w-4 h-4 mr-1" /> Configurar
                    </Button>
                    <Button size="sm" onClick={() => setSimulatorOpen(true)}>
                        <Calculator className="w-4 h-4 mr-1" /> Simulador
                    </Button>
                </div>
            </div>

            {/* Top row: Risk gauge + Summary + Ratios */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* Risk Gauge */}
                <Card>
                    <CardContent className="pt-6">
                        <RiskGauge score={data.riskScore} />
                        <div className="flex justify-center gap-3 mt-4">
                            {criticalCount > 0 && (
                                <Badge variant="destructive" className="text-xs">{criticalCount} crítica{criticalCount > 1 ? "s" : ""}</Badge>
                            )}
                            {warningCount > 0 && (
                                <Badge className="bg-amber-100 text-amber-800 text-xs">{warningCount} aviso{warningCount > 1 ? "s" : ""}</Badge>
                            )}
                            {infoCount > 0 && (
                                <Badge variant="secondary" className="text-xs">{infoCount} info</Badge>
                            )}
                            {data.alerts.length === 0 && (
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                    <ShieldCheck className="w-4 h-4" /> Sin alertas
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Key figures */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Resumen Acumulado {year}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ingresos</span>
                            <span className="font-semibold text-green-600">{formatCurrency(data.ratios.ingresos_acumulados)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gastos</span>
                            <span className="font-semibold text-red-600">{formatCurrency(data.ratios.gastos_acumulados)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between text-sm font-bold">
                            <span>Rendimiento</span>
                            <span className={data.ratios.rendimiento_neto >= 0 ? "text-green-700" : "text-red-700"}>
                                {formatCurrency(data.ratios.rendimiento_neto)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Resultado IVA ({trimestre}T)</span>
                            <span className="font-medium">{formatCurrency(data.ratios.resultado_iva)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sector: <span className="font-medium capitalize">{data.config.sector?.replace(/_/g, ' ') || 'No configurado'}</span>
                        </p>
                    </CardContent>
                </Card>

                {/* Ratios vs thresholds */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ratios vs Umbral Sector</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <RatioBar
                            label="Gastos / Ingresos"
                            value={data.ratios.gastos_ingresos}
                            threshold={data.config.thresholds.gastos_ingresos_ratio_max}
                        />
                        <RatioBar
                            label="IVA Deducible / Devengado"
                            value={data.ratios.iva_deducible_devengado}
                            threshold={data.config.thresholds.iva_deducible_devengado_ratio_max}
                        />
                        <div className="pt-2 border-t">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Info className="w-3 h-3" />
                                Umbrales basados en media sectorial AEAT
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts list */}
            {data.alerts.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Alertas Detectadas ({data.alerts.length})
                    </h3>
                    {data.alerts
                        .sort((a, b) => {
                            const order = { critical: 0, warning: 1, info: 2 };
                            return order[a.severity] - order[b.severity];
                        })
                        .map((alert, i) => {
                            const sev = SEVERITY_CONFIG[alert.severity];
                            const AlertIcon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
                            return (
                                <Card key={i} className={`border-l-4 ${alert.severity === 'critical' ? 'border-l-red-500' : alert.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${sev.color} shrink-0`}>
                                                <AlertIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={sev.color + " text-xs border"}>
                                                        {sev.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{alert.recommendation}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            )}

            {/* No alerts state */}
            {data.alerts.length === 0 && (
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="py-8 text-center">
                        <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-green-800">Todo en orden</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            No se han detectado alertas fiscales para el {trimestre}T de {year}.
                            Tus ratios están dentro de los parámetros normales de tu sector.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Simulator suggestion */}
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Calculator className="w-8 h-8 text-slate-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Simulador de Impacto Fiscal</p>
                            <p className="text-xs text-muted-foreground">
                                Antes de registrar un gasto grande o emitir una factura, simula cómo afectará a tus ratios fiscales y al riesgo de inspección.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSimulatorOpen(true)}>
                            Abrir Simulador <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Drawers/Dialogs */}
            <FiscalAlertConfigDrawer
                open={configOpen}
                onClose={() => setConfigOpen(false)}
                onSaved={loadAlerts}
            />
            <FiscalSimulatorDialog
                open={simulatorOpen}
                onClose={() => setSimulatorOpen(false)}
                year={parseInt(year)}
                trimestre={parseInt(trimestre)}
            />
        </div>
    );
}
