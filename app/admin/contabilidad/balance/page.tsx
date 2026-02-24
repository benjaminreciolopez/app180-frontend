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

interface CuentaBalance {
    cuenta_codigo: string;
    cuenta_nombre: string;
    grupo: string;
    saldo: number;
}

interface SeccionBalance {
    cuentas: CuentaBalance[];
    total: number;
}

interface BalanceData {
    fecha: string;
    activo: SeccionBalance;
    pasivo: SeccionBalance;
    patrimonio: SeccionBalance;
    cuadra: boolean;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function BalanceSituacionPage() {
    const [fecha, setFecha] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<BalanceData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/balance?fecha=${fecha}`
            );
            if (res.ok) {
                const json = await res.json();
                if (json.success !== false) {
                    setData(json.data || json);
                } else {
                    setError(json.message || "Error al cargar el balance");
                }
            } else {
                setError("Error al cargar el balance de situacion");
            }
        } catch (err) {
            console.error("Error loading balance:", err);
            setError("Error de conexion al cargar el balance");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [fecha]);

    const renderCuentasTable = (cuentas: CuentaBalance[]) => {
        const grouped: Record<string, CuentaBalance[]> = {};
        cuentas.forEach((c) => {
            if (!grouped[c.grupo]) grouped[c.grupo] = [];
            grouped[c.grupo].push(c);
        });

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">Cuenta</TableHead>
                        <TableHead className="text-xs text-right">Saldo</TableHead>
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
                                        {formatCurrency(cuenta.saldo)}
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
                        Balance de Situacion
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Estado patrimonial de la empresa a una fecha determinada.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                        Fecha
                    </span>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="h-9 px-3 border-none bg-slate-50 font-bold text-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
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
                    {/* Three columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ACTIVO */}
                        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <CardTitle className="text-base font-bold text-blue-900">
                                            ACTIVO
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.activo.cuentas.length > 0 ? (
                                    renderCuentasTable(data.activo.cuentas)
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">
                                        Sin cuentas de activo
                                    </p>
                                )}
                                <div className="border-t border-blue-100 bg-blue-50/50 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-bold text-blue-900">
                                        Total Activo
                                    </span>
                                    <span className="text-lg font-bold text-blue-700 tabular-nums">
                                        {formatCurrency(data.activo.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PASIVO */}
                        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-red-100 bg-red-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                        </div>
                                        <CardTitle className="text-base font-bold text-red-900">
                                            PASIVO
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.pasivo.cuentas.length > 0 ? (
                                    renderCuentasTable(data.pasivo.cuentas)
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">
                                        Sin cuentas de pasivo
                                    </p>
                                )}
                                <div className="border-t border-red-100 bg-red-50/50 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-bold text-red-900">
                                        Total Pasivo
                                    </span>
                                    <span className="text-lg font-bold text-red-700 tabular-nums">
                                        {formatCurrency(data.pasivo.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PATRIMONIO NETO */}
                        <Card className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b border-green-100 bg-green-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <Scale className="w-4 h-4 text-green-600" />
                                        </div>
                                        <CardTitle className="text-base font-bold text-green-900">
                                            PATRIMONIO NETO
                                        </CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {data.patrimonio.cuentas.length > 0 ? (
                                    renderCuentasTable(data.patrimonio.cuentas)
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">
                                        Sin cuentas de patrimonio
                                    </p>
                                )}
                                <div className="border-t border-green-100 bg-green-50/50 px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm font-bold text-green-900">
                                        Total Patrimonio
                                    </span>
                                    <span className="text-lg font-bold text-green-700 tabular-nums">
                                        {formatCurrency(data.patrimonio.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary bar */}
                    <Card className="bg-white rounded-xl border border-slate-100 shadow-sm">
                        <CardContent className="py-5 px-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                            Total Activo
                                        </span>
                                        <span className="font-bold text-blue-700 tabular-nums">
                                            {formatCurrency(data.activo.total)}
                                        </span>
                                    </div>
                                    <span className="text-slate-300 font-bold">=</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                            Total Pasivo
                                        </span>
                                        <span className="font-bold text-red-700 tabular-nums">
                                            {formatCurrency(data.pasivo.total)}
                                        </span>
                                    </div>
                                    <span className="text-slate-300 font-bold">+</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                            Patrimonio
                                        </span>
                                        <span className="font-bold text-green-700 tabular-nums">
                                            {formatCurrency(data.patrimonio.total)}
                                        </span>
                                    </div>
                                </div>
                                <Badge
                                    variant={data.cuadra ? "default" : "destructive"}
                                    className={`text-sm px-4 py-1.5 ${
                                        data.cuadra
                                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                                            : "bg-red-100 text-red-800 hover:bg-red-100"
                                    }`}
                                >
                                    <Scale className="w-3.5 h-3.5 mr-1.5" />
                                    {data.cuadra ? "Cuadra" : "No cuadra"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
