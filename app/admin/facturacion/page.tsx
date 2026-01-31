"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, Wallet, FileText } from "lucide-react";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Helpers
function fmt(num: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(num);
}

export default function FacturacionPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [clientsData, setClientsData] = useState<any[]>([]);

  async function load() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/billing/clients?desde=${from}&hasta=${to}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) {
          const data = await res.json();
          setClientsData(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [year]);

  // Aggregates
  const totalTrabajo = clientsData.reduce((acc, c) => acc + Number(c.total_valor || 0), 0);
  const totalPagado = clientsData.reduce((acc, c) => acc + Number(c.total_pagado || 0), 0);
  const totalDeuda = clientsData.reduce((acc, c) => acc + Number(c.saldo || 0), 0);

  return (
    <div className="p-6 space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Control de Cobros {year}</h1>
        <div className="flex gap-2">
            <UniversalExportButton 
                module="cobros"
                queryParams={{ 
                    desde: `${year}-01-01`,
                    hasta: `${year}-12-31`
                }}
                label="Exportar"
            />
            <Button variant="outline" size="sm" onClick={async () => {
                try {
                    setLoading(true);
                    const token = localStorage.getItem("token");
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/empleado/fix-values`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if(res.ok) {
                        toast.success(`Valores recalculados: ${data.fixed} trabajos actualizados`);
                        load();
                    } else {
                        toast.error("Error recalculando");
                    }
                } catch(e) {
                    toast.error("Error de conexión");
                } finally {
                    setLoading(false);
                }
            }}>
                Recalcular Valores
            </Button>
            <select 
                value={year} 
                onChange={e => setYear(Number(e.target.value))}
                className="border rounded p-2 text-sm bg-white"
            >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
      </div>

       {/* Resumen Global */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trabajo Valorado Global</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{fmt(totalTrabajo)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">{fmt(totalPagado)}</div>
            </CardContent>
        </Card>
        <Card className={totalDeuda > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deuda Total Clientes</CardTitle>
                <span className="text-muted-foreground font-bold">€</span>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${totalDeuda > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {fmt(totalDeuda)}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Tabla Clientes */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-right">Trabajo (Est.)</th>
                        <th className="px-4 py-3 text-right">Pagado</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {clientsData.map(c => {
                        const saldo = Number(c.saldo);
                        const isDebt = saldo > 0.01;
                        return (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">
                                    <div className="flex flex-col">
                                        <span>{c.nombre}</span>
                                        {c.codigo && <span className="text-xs text-gray-400">{c.codigo}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{fmt(c.total_valor)}</td>
                                <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(c.total_pagado)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${isDebt ? 'text-red-600' : 'text-gray-400'}`}>
                                    {fmt(saldo)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/clientes/${c.id}/pagos`)}>
                                        Ver Pagos
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                     {!loading && clientsData.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">No hay datos en este periodo</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
}
