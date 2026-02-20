"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils"; // Asumiendo utils existente
import { authenticatedFetch } from "@/utils/api"; // Asumiendo utilidad api
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface FacturaVenta {
    fecha: string;
    numero: string;
    cliente_nombre: string;
    base: string; // numeric from PG comes as string often, parse if needed
    cuota: string;
    retencion: string; // New field
    tipo: string;
    total: string;
}

export default function LibroVentasTable({ year }: { year: string }) {
    const [data, setData] = useState<FacturaVenta[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await authenticatedFetch(`/api/admin/fiscal/libro-ventas?year=${year}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) setData(json.data);
                }
            } catch (error) {
                console.error("Error loading ventas:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [year]);

    if (loading) return <LoadingSpinner />;

    if (data.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No hay facturas registradas en este ejercicio.</div>;
    }

    const totalBase = data.reduce((acc, curr) => acc + parseFloat(curr.base), 0);
    const totalCuota = data.reduce((acc, curr) => acc + parseFloat(curr.cuota), 0);
    const totalRetencion = data.reduce((acc, curr) => acc + parseFloat(curr.retencion || "0"), 0);
    const totalTotal = data.reduce((acc, curr) => acc + parseFloat(curr.total), 0);

    return (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="min-w-[800px]">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead className="w-[120px]">Número</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right w-[110px]">Base Imp.</TableHead>
                            <TableHead className="text-center w-[80px]">% IVA</TableHead>
                            <TableHead className="text-right w-[110px]">Cuota IVA</TableHead>
                            <TableHead className="text-right w-[110px] font-medium text-red-600">Retención</TableHead>
                            <TableHead className="text-right w-[120px]">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="whitespace-nowrap text-xs">{new Date(row.fecha).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium text-xs">{row.numero}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs" title={row.cliente_nombre}>
                                    {row.cliente_nombre}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatCurrency(parseFloat(row.base))}</TableCell>
                                <TableCell className="text-center text-xs">{row.tipo}%</TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatCurrency(parseFloat(row.cuota))}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-red-600">
                                    {parseFloat(row.retencion) > 0 ? `-${formatCurrency(parseFloat(row.retencion))}` : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold font-mono text-xs">{formatCurrency(parseFloat(row.total))}</TableCell>
                            </TableRow>
                        ))}
                        {/* Totales */}
                        <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-100">
                            <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-slate-500">Total Ejercicio</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatCurrency(totalBase)}</TableCell>
                            <TableCell className="text-center">-</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatCurrency(totalCuota)}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-red-600">
                                {totalRetencion > 0 ? `-${formatCurrency(totalRetencion)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-700 bg-blue-50/30">{formatCurrency(totalTotal)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
