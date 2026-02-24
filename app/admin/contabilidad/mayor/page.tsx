"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, BookOpen, ArrowUpDown } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

interface Cuenta {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    grupo: number;
}

interface Movimiento {
    asiento_numero: number;
    fecha: string;
    asiento_concepto: string;
    debe: number;
    haber: number;
    linea_concepto: string;
    saldo_acumulado: number;
}

interface MayorResponse {
    cuenta_codigo: string;
    periodo: { desde: string; hasta: string };
    movimientos: Movimiento[];
    total_debe: number;
    total_haber: number;
    saldo_final: number;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function LibroMayorPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [selectedCuenta, setSelectedCuenta] = useState<Cuenta | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-01-01`;
    });
    const [fechaHasta, setFechaHasta] = useState(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    });
    const [mayorData, setMayorData] = useState<MayorResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [sortAsc, setSortAsc] = useState(true);

    // Search cuentas
    const searchCuentas = useCallback(async (term: string) => {
        if (term.length < 1) {
            setCuentas([]);
            setShowDropdown(false);
            return;
        }
        setSearching(true);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/cuentas?search=${encodeURIComponent(term)}`
            );
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.cuentas || [];
                setCuentas(list);
                setShowDropdown(list.length > 0);
            }
        } catch (err) {
            console.error("Error buscando cuentas:", err);
        } finally {
            setSearching(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchCuentas(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, searchCuentas]);

    // Fetch mayor data
    const fetchMayor = useCallback(async () => {
        if (!selectedCuenta) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fechaDesde) params.set("fecha_desde", fechaDesde);
            if (fechaHasta) params.set("fecha_hasta", fechaHasta);
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/mayor/${selectedCuenta.codigo}?${params.toString()}`
            );
            if (res.ok) {
                const data: MayorResponse = await res.json();
                setMayorData(data);
            }
        } catch (err) {
            console.error("Error cargando libro mayor:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedCuenta, fechaDesde, fechaHasta]);

    // Fetch when cuenta selected or dates change
    useEffect(() => {
        if (selectedCuenta) {
            fetchMayor();
        }
    }, [selectedCuenta, fetchMayor]);

    const handleSelectCuenta = (cuenta: Cuenta) => {
        setSelectedCuenta(cuenta);
        setSearchTerm(`${cuenta.codigo} - ${cuenta.nombre}`);
        setShowDropdown(false);
    };

    const sortedMovimientos = mayorData?.movimientos
        ? [...mayorData.movimientos].sort((a, b) => {
              const dateA = new Date(a.fecha).getTime();
              const dateB = new Date(b.fecha).getTime();
              return sortAsc ? dateA - dateB : dateB - dateA;
          })
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    Libro Mayor
                </h1>
                <p className="text-muted-foreground mt-1">
                    Movimientos por cuenta contable
                </p>
            </div>

            {/* Search and filters */}
            <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search cuenta */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar cuenta por codigo o nombre..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (selectedCuenta) setSelectedCuenta(null);
                                }}
                                className="pl-10 rounded-xl border-slate-200"
                            />
                            {showDropdown && (
                                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {cuentas.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelectCuenta(c)}
                                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                        >
                                            <span className="font-mono text-sm font-semibold text-blue-700">
                                                {c.codigo}
                                            </span>
                                            <span className="text-sm text-slate-700">{c.nombre}</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                {c.tipo}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-500 whitespace-nowrap">
                                Desde
                            </label>
                            <Input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-40 rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-500 whitespace-nowrap">
                                Hasta
                            </label>
                            <Input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-40 rounded-xl border-slate-200"
                            />
                        </div>

                        <Button
                            onClick={fetchMayor}
                            disabled={!selectedCuenta || loading}
                            className="rounded-xl"
                        >
                            {loading ? "Cargando..." : "Consultar"}
                        </Button>
                    </div>

                    {selectedCuenta && (
                        <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {selectedCuenta.codigo}
                            </Badge>
                            <span className="text-sm font-medium text-slate-700">
                                {selectedCuenta.nombre}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mayor table */}
            {mayorData && (
                <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>
                                Cuenta {mayorData.cuenta_codigo} &mdash; Movimientos
                            </span>
                            <span className="text-sm font-normal text-slate-500">
                                {sortedMovimientos.length} movimiento{sortedMovimientos.length !== 1 ? "s" : ""}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sortedMovimientos.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">No hay movimientos en el periodo seleccionado</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="font-semibold text-slate-600">
                                                N Asiento
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-600">
                                                <button
                                                    onClick={() => setSortAsc(!sortAsc)}
                                                    className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                                >
                                                    Fecha
                                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                                </button>
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-600">
                                                Concepto
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-right">
                                                Debe
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-right">
                                                Haber
                                            </TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-right">
                                                Saldo Acumulado
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedMovimientos.map((mov, idx) => (
                                            <TableRow key={`${mov.asiento_numero}-${idx}`} className="hover:bg-slate-50/50">
                                                <TableCell className="font-mono text-sm font-medium text-slate-700">
                                                    {mov.asiento_numero}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {formatDate(mov.fecha)}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-700 max-w-xs truncate">
                                                    {mov.linea_concepto || mov.asiento_concepto}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {mov.debe > 0 ? (
                                                        <span className="text-blue-700 font-medium">
                                                            {formatCurrency(mov.debe)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {mov.haber > 0 ? (
                                                        <span className="text-red-600 font-medium">
                                                            {formatCurrency(mov.haber)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm font-semibold">
                                                    <span
                                                        className={
                                                            mov.saldo_acumulado >= 0
                                                                ? "text-emerald-700"
                                                                : "text-red-600"
                                                        }
                                                    >
                                                        {formatCurrency(mov.saldo_acumulado)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Totals row */}
                                        <TableRow className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                                            <TableCell colSpan={3} className="text-sm text-slate-700">
                                                Totales
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-blue-800">
                                                {formatCurrency(mayorData.total_debe)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-red-700">
                                                {formatCurrency(mayorData.total_haber)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                <span
                                                    className={
                                                        mayorData.saldo_final >= 0
                                                            ? "text-emerald-700"
                                                            : "text-red-600"
                                                    }
                                                >
                                                    {formatCurrency(mayorData.saldo_final)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Empty state when no cuenta selected */}
            {!selectedCuenta && !mayorData && (
                <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                    <CardContent className="py-16">
                        <div className="text-center text-slate-400">
                            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">Selecciona una cuenta contable</p>
                            <p className="text-sm mt-1">
                                Busca por codigo o nombre para ver los movimientos del libro mayor
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
