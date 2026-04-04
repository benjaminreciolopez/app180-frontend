"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
    Calculator, ArrowRight, ArrowDown, ArrowUp, Minus,
    TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
    ReceiptEuro, ShoppingCart, Loader2, Lightbulb,
} from "lucide-react";

interface SimulationResult {
    before: {
        ratios: Record<string, number>;
        riskScore: number;
        alertCount: number;
    };
    after: {
        ratios: Record<string, number>;
        riskScore: number;
        alertCount: number;
        alerts: any[];
    };
    delta: Record<string, number>;
    modeloImpact: {
        modelo303_resultado: number;
        modelo130_a_ingresar: number;
    };
    safeInvoicingThreshold: number | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    year?: number;
    trimestre?: number;
    prefill?: {
        type: "factura" | "gasto";
        base_imponible?: number;
        iva_pct?: number;
    };
}

export default function FiscalSimulatorDialog({ open, onClose, year, trimestre, prefill }: Props) {
    const now = new Date();
    const defaultYear = year || now.getFullYear();
    const defaultTrimestre = trimestre || Math.ceil((now.getMonth() + 1) / 3);

    const [type, setType] = useState<"factura" | "gasto">(prefill?.type || "gasto");
    const [base, setBase] = useState(prefill?.base_imponible?.toString() || "");
    const [ivaPct, setIvaPct] = useState(prefill?.iva_pct?.toString() || "21");
    const [simYear] = useState(defaultYear);
    const [simTrimestre] = useState(defaultTrimestre);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);

    const baseNum = parseFloat(base) || 0;
    const ivaNum = baseNum * (parseFloat(ivaPct) / 100);
    const totalNum = baseNum + ivaNum;

    const handleSimulate = async () => {
        if (baseNum <= 0) return;
        setLoading(true);
        setResult(null);

        try {
            const res = await authenticatedFetch("/api/admin/fiscal/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    year: simYear,
                    trimestre: simTrimestre,
                    operation: {
                        type,
                        base_imponible: baseNum,
                        iva_pct: parseFloat(ivaPct),
                        iva_importe: ivaNum,
                    },
                }),
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success) setResult(json.data);
            }
        } catch (err) {
            console.error("Error simulating:", err);
        } finally {
            setLoading(false);
        }
    };

    const DeltaArrow = ({ value }: { value: number }) => {
        if (Math.abs(value) < 0.001) return <Minus className="w-3 h-3 text-gray-400" />;
        if (value > 0) return <ArrowUp className="w-3 h-3 text-red-500" />;
        return <ArrowDown className="w-3 h-3 text-green-500" />;
    };

    const ScoreChange = ({ before, after }: { before: number; after: number }) => {
        const diff = after - before;
        const color = diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-gray-500";
        return (
            <div className="flex items-center gap-3">
                <div className="text-center">
                    <span className="text-2xl font-bold">{before}</span>
                    <p className="text-xs text-muted-foreground">Antes</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div className="text-center">
                    <span className={`text-2xl font-bold ${color}`}>{after}</span>
                    <p className="text-xs text-muted-foreground">Después</p>
                </div>
                {diff !== 0 && (
                    <Badge className={diff > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                        {diff > 0 ? "+" : ""}{diff} pts
                    </Badge>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> Simulador de Impacto Fiscal
                    </DialogTitle>
                    <DialogDescription>
                        Simula cómo afectaría una operación a tus ratios fiscales y al riesgo de inspección.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Input Form */}
                    <Card>
                        <CardContent className="pt-5 space-y-4">
                            {/* Type toggle */}
                            <div className="flex gap-2">
                                <Button
                                    variant={type === "gasto" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setType("gasto")}
                                    className="flex-1"
                                >
                                    <ShoppingCart className="w-4 h-4 mr-1" /> Gasto / Compra
                                </Button>
                                <Button
                                    variant={type === "factura" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setType("factura")}
                                    className="flex-1"
                                >
                                    <ReceiptEuro className="w-4 h-4 mr-1" /> Factura / Venta
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Base Imponible</Label>
                                    <Input
                                        type="number"
                                        value={base}
                                        onChange={e => setBase(e.target.value)}
                                        placeholder="10000"
                                        min={0}
                                        step={100}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">% IVA</Label>
                                    <Select value={ivaPct} onValueChange={setIvaPct}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="21">21%</SelectItem>
                                            <SelectItem value="10">10%</SelectItem>
                                            <SelectItem value="4">4%</SelectItem>
                                            <SelectItem value="0">0% (Exento)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg">
                                <div>
                                    <span className="text-muted-foreground">IVA: </span>
                                    <span className="font-medium">{formatCurrency(ivaNum)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total: </span>
                                    <span className="font-bold">{formatCurrency(totalNum)}</span>
                                </div>
                            </div>

                            <Button onClick={handleSimulate} disabled={loading || baseNum <= 0} className="w-full">
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Calculator className="w-4 h-4 mr-2" />
                                )}
                                Simular Impacto
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            {/* Risk Score Change */}
                            <Card>
                                <CardContent className="pt-5">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                        Score de Riesgo
                                    </p>
                                    <ScoreChange before={result.before.riskScore} after={result.after.riskScore} />
                                </CardContent>
                            </Card>

                            {/* Ratio Changes */}
                            <Card>
                                <CardContent className="pt-5 space-y-3">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Impacto en Ratios
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Gastos/Ingresos</span>
                                            <div className="flex items-center gap-2">
                                                <span>{(result.before.ratios.gastos_ingresos * 100).toFixed(1)}%</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="font-medium">{(result.after.ratios.gastos_ingresos * 100).toFixed(1)}%</span>
                                                <DeltaArrow value={result.delta.gastos_ingresos_ratio} />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Rendimiento Neto</span>
                                            <div className="flex items-center gap-2">
                                                <span>{formatCurrency(result.before.ratios.rendimiento_neto)}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="font-medium">{formatCurrency(result.after.ratios.rendimiento_neto)}</span>
                                                <DeltaArrow value={-result.delta.rendimiento_neto} />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Resultado IVA (303)</span>
                                            <div className="flex items-center gap-2">
                                                <span>{formatCurrency(result.before.ratios.resultado_iva)}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="font-medium">{formatCurrency(result.modeloImpact.modelo303_resultado)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Model Impact */}
                            <Card>
                                <CardContent className="pt-5 space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Impacto en Modelos Fiscales
                                    </p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Modelo 303 resultado</span>
                                        <span className="font-medium">{formatCurrency(result.modeloImpact.modelo303_resultado)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Modelo 130 a ingresar</span>
                                        <span className="font-medium">{formatCurrency(result.modeloImpact.modelo130_a_ingresar)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Safe invoicing threshold */}
                            {result.safeInvoicingThreshold !== null && result.safeInvoicingThreshold > 0 && (
                                <Card className="border-l-4 border-l-amber-500 bg-amber-50">
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-900">
                                                    Consejo para mantener ratio seguro
                                                </p>
                                                <p className="text-sm text-amber-800 mt-1">
                                                    Para compensar este gasto y mantener tu ratio gastos/ingresos dentro de la media del sector,
                                                    necesitas facturar al menos <strong>{formatCurrency(result.safeInvoicingThreshold)}</strong> adicionales
                                                    durante el resto del periodo.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* New alerts */}
                            {result.after.alerts.length > 0 && (
                                <Card className="border-l-4 border-l-red-500">
                                    <CardContent className="py-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                            <p className="text-sm font-semibold text-red-800">
                                                Alertas que se activarían con esta operación
                                            </p>
                                        </div>
                                        {result.after.alerts.map((alert: any, i: number) => (
                                            <div key={i} className="text-xs text-red-700 pl-6">
                                                - {alert.message}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* All clear */}
                            {result.after.alerts.length === 0 && result.after.riskScore <= result.before.riskScore && (
                                <Card className="border-l-4 border-l-green-500">
                                    <CardContent className="py-4 flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-800">
                                            Esta operación no dispararía nuevas alertas fiscales.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
