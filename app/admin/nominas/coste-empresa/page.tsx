"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PieChart as PieIcon, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface EmpleadoResumen {
  empleado_id: string | null;
  nombre_empleado: string;
  num_nominas: number;
  total_bruto: number | string;
  total_liquido: number | string;
  total_irpf: number | string;
  total_ss_empleado: number | string;
  total_ss_empresa: number | string;
  tipo_irpf_medio: number | string;
}

interface ResumenAnual {
  year: number;
  empleados: EmpleadoResumen[];
  totals: {
    total_bruto: number;
    total_liquido: number;
    total_irpf: number;
    total_ss_empleado: number;
    total_ss_empresa: number;
    num_nominas: number;
  };
}

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

export default function CosteEmpresaPage() {
  const searchParams = useSearchParams();
  const initialYear = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<ResumenAnual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [year]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/nominas/resumen-anual", { params: { year } });
      if (res.data?.success) setData(res.data);
    } catch {
      showError("Error cargando resumen anual");
    } finally {
      setLoading(false);
    }
  }

  function descargarCSV() {
    if (!data) return;
    const header = ["Empleado", "Nóminas", "Bruto anual", "SS empresa", "Coste total", "Neto pagado", "IRPF", "% IRPF medio"];
    const rows = (data.empleados || []).map((e) => {
      const bruto = Number(e.total_bruto) || 0;
      const ssE = Number(e.total_ss_empresa) || 0;
      return [
        e.nombre_empleado,
        e.num_nominas,
        bruto.toFixed(2),
        ssE.toFixed(2),
        (bruto + ssE).toFixed(2),
        Number(e.total_liquido).toFixed(2),
        Number(e.total_irpf).toFixed(2),
        Number(e.tipo_irpf_medio).toFixed(2),
      ];
    });
    const totalBruto = data.totals.total_bruto || 0;
    const totalSsE = data.totals.total_ss_empresa || 0;
    rows.push([
      "TOTAL",
      data.totals.num_nominas,
      totalBruto.toFixed(2),
      totalSsE.toFixed(2),
      (totalBruto + totalSsE).toFixed(2),
      data.totals.total_liquido.toFixed(2),
      data.totals.total_irpf.toFixed(2),
      "—",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coste_empresa_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return <p className="text-sm text-muted-foreground">Sin datos.</p>;

  // Datos para gráficos
  const chartData = data.empleados.map((e) => ({
    nombre: (e.nombre_empleado || "Sin asignar").split(" ").slice(0, 2).join(" "),
    bruto: Number(e.total_bruto) || 0,
    ss_empresa: Number(e.total_ss_empresa) || 0,
    coste_total: (Number(e.total_bruto) || 0) + (Number(e.total_ss_empresa) || 0),
    irpf: Number(e.total_irpf) || 0,
    neto: Number(e.total_liquido) || 0,
  }));

  const totalBruto = data.totals.total_bruto || 0;
  const totalSsEmpresa = data.totals.total_ss_empresa || 0;
  const totalIrpf = data.totals.total_irpf || 0;
  const totalSsEmpleado = data.totals.total_ss_empleado || 0;
  const totalLiquido = data.totals.total_liquido || 0;
  const costeTotal = totalBruto + totalSsEmpresa;

  // Distribución del bruto
  const distribucion = [
    { name: "Neto a empleados", value: totalLiquido, color: "#10b981" },
    { name: "IRPF (a AEAT)", value: totalIrpf, color: "#ef4444" },
    { name: "SS empleado (a TGSS)", value: totalSsEmpleado, color: "#f59e0b" },
    { name: "SS empresa (extra)", value: totalSsEmpresa, color: "#8b5cf6" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6 p-4 md:p-0 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/nominas" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PieIcon className="w-6 h-6" />
              Coste empresa
            </h1>
            <p className="text-sm text-muted-foreground">Año {year} — coste real de la plantilla (bruto + SS empresa)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
          >
            {[0, 1, 2, 3, 4].map((d) => {
              const y = new Date().getFullYear() - d;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <Button onClick={descargarCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Bruto total</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalBruto)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.totals.num_nominas} nóminas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">SS empresa</p>
            <p className="text-2xl font-bold mt-1 text-violet-700">{fmt(totalSsEmpresa)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBruto > 0 ? `${((totalSsEmpresa / totalBruto) * 100).toFixed(1)}% sobre bruto` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700">Coste total</p>
            <p className="text-2xl font-bold mt-1 text-emerald-900">{fmt(costeTotal)}</p>
            <p className="text-xs text-emerald-700 mt-1">bruto + SS empresa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Neto pagado</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">{fmt(totalLiquido)}</p>
            <p className="text-xs text-muted-foreground mt-1">a transferir/pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Coste por empleado (bar chart) */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coste anual por empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="nombre" angle={-30} textAnchor="end" height={60} fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="bruto" name="Bruto" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="ss_empresa" name="SS empresa" stackId="a" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución del bruto (pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución del bruto total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribucion}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    dataKey="value"
                    label={(entry: any) => `${entry.name}: ${((entry.value / totalBruto) * 100).toFixed(1)}%`}
                    fontSize={11}
                  >
                    {distribucion.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tabla detalle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Empleado</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Bruto</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">SS empr.</th>
                    <th className="text-right py-2 px-2 font-medium text-emerald-700">Coste total</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 px-2 truncate">{e.nombre}</td>
                      <td className="text-right py-1.5 px-2">{fmt(e.bruto)}</td>
                      <td className="text-right py-1.5 px-2 text-violet-700">{fmt(e.ss_empresa)}</td>
                      <td className="text-right py-1.5 px-2 font-semibold text-emerald-700">{fmt(e.coste_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 font-semibold">
                  <tr>
                    <td className="py-2 px-2">TOTAL</td>
                    <td className="text-right py-2 px-2">{fmt(totalBruto)}</td>
                    <td className="text-right py-2 px-2 text-violet-700">{fmt(totalSsEmpresa)}</td>
                    <td className="text-right py-2 px-2 text-emerald-700">{fmt(costeTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
