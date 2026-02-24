"use client";

import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { TrendingUp, TrendingDown, Scale, Calendar } from "lucide-react";

interface CuentaPyG {
    cuenta_codigo: string;
    cuenta_nombre: string;
    grupo: string;
    subgrupo: string;
    importe: number;
}

interface SeccionPyG {
    cuentas: CuentaPyG[];
    total: number;
}

interface PygData {
    periodo: { desde: string; hasta: string };
    ingresos: SeccionPyG;
    gastos: SeccionPyG;
    resultado: number;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function PerdidasGananciasPage() {
    const [fechaDesde, setFechaDesde] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-01-01`;
    });
    const [fechaHasta, setFechaHasta] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<PygData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/pyg?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
            );
            if (res.ok) {
                const json = await res.json();
                if (json.success !== false) {
                    setData(json.data || json);
                } else {
                    setError(json.message || "Error al cargar PyG");
                }
            } else {
                setError("Error al cargar la cuenta de perdidas y ganancias");
            }
        } catch (err) {
            console.error("Error loading PyG:", err);
            setError("Error de conexion al cargar PyG");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [fechaDesde, fechaHasta]);

    const renderCuentasTable = (cuentas: CuentaPyG[]) => {
        const grouped: Record<string, CuentaPyG[]> = {};
        cuentas.forEach((c) => {
            const key = c.subgrupo || c.grupo;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
        });

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Cuenta</TableHead>
                        <TableHead className="text-xs text-right">Importe</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(grouped).map(([grupo, items]) => (
                        <>
                            <TableRow key={`grupo-${grupo}`} className="bg-slate-50/50">
                                <TableCell
                                    colSpan={2}
                                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-1.5"
                                >
                                    {grupo}
                                </TableCell>
                            </TableRow>
                            {items.map((cuenta) => (
                                <TableRow key={cuenta.cuenta_codigo}>
                                    <TableCell className="py-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700">
                                                {cuenta.cuenta_nombre}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {cuenta.cuenta_codigo}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-medium tabular-nums">
                                        {formatCurrency(cuenta.importe)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Perdidas y Ganancias
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Cuenta de resultados del ejercicio por periodo.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                Desde
                            </span>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="h-8 px-2 border-none bg-slate-50 font-bold text-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                Hasta
                            </span>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="h-8 px-2 border-none bg-slate-50 font-bold text-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading && <LoadingSpinner />}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {!loading && data && (
                <>
                    {/* Two columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* INGRESOS */}
                        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-green-100 bg-green-50/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-green-900">
                                        INGRESOS
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.ingresos.cuentas.length > 0 ? (
                                    renderCuentasTable(data.ingresos.cuentas)
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">
                                        Sin cuentas de ingresos en el periodo
                                    </p>
                                )}
                                <div className="border-t border-green-100 bg-green-50/50 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-bold text-green-900">
                                        Total Ingresos
                                    </span>
                                    <span className="text-lg font-bold text-green-700 tabular-nums">
                                        {formatCurrency(data.ingresos.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* GASTOS */}
                        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-red-100 bg-red-50/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-red-900">
                                        GASTOS
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.gastos.cuentas.length > 0 ? (
                                    renderCuentasTable(data.gastos.cuentas)
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">
                                        Sin cuentas de gastos en el periodo
                                    </p>
                                )}
                                <div className="border-t border-red-100 bg-red-50/50 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-bold text-red-900">
                                        Total Gastos
                                    </span>
                                    <span className="text-lg font-bold text-red-700 tabular-nums">
                                        {formatCurrency(data.gastos.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Resultado summary */}
                    <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <CardContent className="py-6 px-6">
                            <div className="flex flex-col items-center gap-4">
                                {/* Equation row */}
                                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                            Total Ingresos
                                        </span>
                                        <span className="font-bold text-green-700 tabular-nums">
                                            {formatCurrency(data.ingresos.total)}
                                        </span>
                                    </div>
                                    <span className="text-slate-300 font-bold text-lg">-</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                            Total Gastos
                                        </span>
                                        <span className="font-bold text-red-700 tabular-nums">
                                            {formatCurrency(data.gastos.total)}
                                        </span>
                                    </div>
                                    <span className="text-slate-300 font-bold text-lg">=</span>
                                </div>

                                {/* Resultado */}
                                <div className="flex flex-col items-center gap-2">
                                    <Badge
                                        variant="default"
                                        className={`text-sm px-4 py-1.5 ${
                                            data.resultado >= 0
                                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                : "bg-red-100 text-red-800 hover:bg-red-100"
                                        }`}
                                    >
                                        <Scale className="w-3.5 h-3.5 mr-1.5" />
                                        {data.resultado >= 0 ? "Beneficio" : "Perdida"}
                                    </Badge>
                                    <span
                                        className={`text-3xl md:text-4xl font-bold tabular-nums ${
                                            data.resultado >= 0
                                                ? "text-green-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {formatCurrency(data.resultado)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Resultado del periodo {fechaDesde} al {fechaHasta}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
