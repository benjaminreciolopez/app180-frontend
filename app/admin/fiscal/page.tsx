
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FileText, Calculator, TrendingUp, AlertTriangle } from "lucide-react";

type FiscalData = {
    periodo: {
        year: string;
        trimestre: string;
        startDate: string;
        endDate: string;
    };
    modelo303: {
        devengado: { base: number; cuota: number };
        deducible: { base: number; cuota: number };
        resultado: number;
    };
    modelo130: {
        ingresos: number;
        gastos: number;
        rendimiento: number;
        pago_fraccionado: number;
        a_ingresar: number;
    };
};

export default function FiscalModelsPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [trimestre, setTrimestre] = useState(getCurrentTrimestre().toString());
    const [data, setData] = useState<FiscalData | null>(null);
    const [loading, setLoading] = useState(false);

    function getCurrentTrimestre() {
        const month = new Date().getMonth();
        return Math.floor(month / 3) + 1;
    }

    async function loadData() {
        if (!year || !trimestre) return;
        setLoading(true);
        try {
            const res = await api.get(`/admin/fiscal/models?year=${year}&trimestre=${trimestre}`);
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error("Error cargando modelos:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [year, trimestre]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(val);
    };

    if (!data && loading) return <LoadingSpinner fullPage />;

    return (
        <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Modelos Fiscales
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Previsión de impuestos (IVA e IRPF) basada en tu facturación y gastos.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026, 2027].map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={trimestre} onValueChange={setTrimestre}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1T (Ene-Mar)</SelectItem>
                            <SelectItem value="2">2T (Abr-Jun)</SelectItem>
                            <SelectItem value="3">3T (Jul-Sep)</SelectItem>
                            <SelectItem value="4">4T (Oct-Dic)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                        <Calculator className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </header>

            {data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* MODELO 303 (IVA) */}
                    <Card className="border-l-4 border-l-blue-500 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center text-xl">
                                <span>Modelo 303 - IVA</span>
                                <span className={`text-lg font-bold px-3 py-1 rounded-full ${data.modelo303.resultado > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {data.modelo303.resultado > 0 ? "A Pagar" : "A Devolver/Compensar"}
                                </span>
                            </CardTitle>
                            <CardDescription>Liquidación trimestral del Impuesto sobre el Valor Añadido</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500 font-medium">IVA Repercutido (Ventas)</p>
                                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                        {formatCurrency(data.modelo303.devengado.cuota)}
                                    </p>
                                    <p className="text-xs text-slate-400">Base: {formatCurrency(data.modelo303.devengado.base)}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-sm text-slate-500 font-medium">IVA Soportado (Gastos)</p>
                                    <p className="text-lg font-semibold text-green-600">
                                        -{formatCurrency(data.modelo303.deducible.cuota)}
                                    </p>
                                    <p className="text-xs text-slate-400">Base: {formatCurrency(data.modelo303.deducible.base)}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-between items-center pt-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Resultado Liquidación</span>
                                <span className={`text-2xl font-black ${data.modelo303.resultado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(data.modelo303.resultado)}
                                </span>
                            </div>

                            {data.modelo303.resultado > 0 && (
                                <div className="flex gap-2 items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md border border-yellow-200 dark:border-yellow-800">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>
                                        Para reducir este pago, puedes adelantar inversiones o gastos deducibles antes del {new Date(data.periodo.endDate).toLocaleDateString()}.
                                    </p>
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    {/* MODELO 130 (IRPF) */}
                    <Card className="border-l-4 border-l-orange-500 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center text-xl">
                                <span>Modelo 130 - IRPF</span>
                                <span className="text-sm px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-normal text-slate-600 dark:text-slate-400">
                                    Acumulado Anual
                                </span>
                            </CardTitle>
                            <CardDescription>Pago fraccionado (20%) sobre rendimiento neto acumulado</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500 font-medium">Ingresos Computables</p>
                                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                        {formatCurrency(data.modelo130.ingresos)}
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-sm text-slate-500 font-medium">Gastos Deducibles</p>
                                    <p className="text-lg font-semibold text-orange-600">
                                        -{formatCurrency(data.modelo130.gastos)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Rendimiento Neto</span>
                                <span className="font-bold">{formatCurrency(data.modelo130.rendimiento)}</span>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Cuota 20%</span>
                                    <span>{formatCurrency(data.modelo130.pago_fraccionado)}</span>
                                </div>
                                {/* Aquí irían pagos anteriores si los tuviéramos */}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">A Ingresar (Trimestre)</span>
                                    <span className="text-2xl font-black text-orange-600">
                                        {formatCurrency(data.modelo130.a_ingresar)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* GRÁFICO RESUMEN */}
                    <Card className="lg:col-span-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-gray-500" />
                                Evolución Fiscal {year}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            {/* Placeholder para gráfico futuro de evolución trimestral */}
                            <div className="h-full flex items-center justify-center text-muted-foreground bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-dashed text-sm">
                                Los datos históricos de trimestres anteriores se mostrarán aquí conforme completes el ejercicio.
                            </div>
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
}
