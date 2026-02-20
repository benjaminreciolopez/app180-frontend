"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { authenticatedFetch } from "@/utils/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Gasto {
    fecha: string;
    proveedor: string; // O descripcion si no hay proveedor estructurado
    descripcion: string;
    base: string;
    cuota: string;
    retencion: string; // New field
    tipo: string;
    total: string;
}

export default function LibroGastosTable({ year }: { year: string }) {
    const [data, setData] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await authenticatedFetch(`/api/admin/fiscal/libro-gastos?year=${year}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) setData(json.data);
                }
            } catch (error) {
                console.error("Error loading gastos:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [year]);

    if (loading) return <LoadingSpinner />;

    if (data.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No hay gastos registrados en este ejercicio.</div>;
    }

    const totalBase = data.reduce((acc, curr) => acc + parseFloat(curr.base), 0);
    const totalCuota = data.reduce((acc, curr) => acc + parseFloat(curr.cuota), 0);
    const totalRetencion = data.reduce((acc, curr) => acc + parseFloat(curr.retencion || "0"), 0);
    const totalTotal = data.reduce((acc, curr) => acc + parseFloat(curr.total), 0);

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor / Concepto</TableHead>
                        <TableHead className="text-right">Base Imp.</TableHead>
                        <TableHead className="text-center">% IVA</TableHead>
                        <TableHead className="text-right">Cuota IVA</TableHead>
                        <TableHead className="text-right font-medium text-red-600">Retención</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, idx) => (
                        <TableRow key={idx}>
                            <TableCell>{new Date(row.fecha).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <div className="font-medium">{row.descripcion}</div>
                                <div className="text-xs text-muted-foreground">{row.proveedor || '-'}</div>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(row.base))}</TableCell>
                            <TableCell className="text-center">{row.tipo}%</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(row.cuota))}</TableCell>
                            <TableCell className="text-right text-red-600">
                                {parseFloat(row.retencion) > 0 ? `-${formatCurrency(parseFloat(row.retencion))}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(parseFloat(row.total))}</TableCell>
                        </TableRow>
                    ))}
                    {/* Totales */}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2} className="text-right">TOTALES</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalBase)}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalBase)}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalCuota)}</TableCell>
                        <TableCell className="text-right text-red-600">
                            {totalRetencion > 0 ? `-${formatCurrency(totalRetencion)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(totalTotal)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}
