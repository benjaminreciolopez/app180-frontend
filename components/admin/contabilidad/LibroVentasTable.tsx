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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
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
                            <TableCell className="font-medium">{row.numero}</TableCell>
                            <TableCell>{row.cliente_nombre}</TableCell>
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
                        <TableCell colSpan={3} className="text-right">TOTALES</TableCell>
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
