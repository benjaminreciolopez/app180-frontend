"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Check, ChevronRight } from "lucide-react";

interface Nomina {
  id: string;
  empresa_id: string;
  empleado_id: string;
  anio: number;
  mes: number;
  bruto: string | number;
  seguridad_social_empleado: string | number;
  irpf_retencion: string | number;
  liquido: string | number;
  estado: string;
  nombre_empleado?: string;
  nombre_empresa?: string;
}

interface Cliente {
  empresa_id: string;
  nombre: string;
  num_empleados: number;
  es_propia?: boolean;
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const estadoColor: Record<string, string> = {
  borrador: "secondary",
  calculada: "outline",
  revisada: "default",
  aprobada: "default",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const num = (v: string | number) => parseFloat(String(v)) || 0;

export default function AsesorNominasPage() {
  const router = useRouter();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string; empresa_id: string; nombre_empresa: string }[]>([]);

  // Filtros
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [clienteId, setClienteId] = useState("todos");
  const [empleadoId, setEmpleadoId] = useState("todos");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  // Cargar clientes al inicio
  useEffect(() => {
    loadClientes();
  }, []);

  // Cargar nóminas y empleados cuando cambian filtros
  useEffect(() => {
    loadNominas();
    loadEmpleados();
  }, [anio, mes, clienteId]);

  async function loadClientes() {
    try {
      const res = await api.get("/asesor/nominas/clientes");
      const data = res.data?.data;
      const list: Cliente[] = [];
      if (data?.propia) list.push(data.propia);
      if (data?.clientes) list.push(...data.clientes);
      setClientes(list);
    } catch {
      // silencioso
    }
  }

  async function loadEmpleados() {
    try {
      const params = new URLSearchParams();
      if (clienteId !== "todos") params.set("empresa_id", clienteId);
      const res = await api.get(`/asesor/nominas/empleados?${params}`);
      setEmpleados(res.data?.data || []);
    } catch {
      setEmpleados([]);
    }
  }

  async function loadNominas() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ anio: String(anio), mes: String(mes) });
      if (clienteId !== "todos") params.set("empresa_id", clienteId);
      const res = await api.get(`/asesor/nominas?${params}`);
      setNominas(res.data?.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar nóminas");
    } finally {
      setLoading(false);
    }
  }

  async function handleAprobar(id: string) {
    try {
      await api.post(`/asesor/nominas/${id}/aprobar`);
      showSuccess("Nómina aprobada");
      loadNominas();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al aprobar");
    }
  }

  const filtered = useMemo(() => {
    return nominas.filter((n) => {
      if (empleadoId !== "todos" && n.empleado_id !== empleadoId) return false;
      if (estadoFilter !== "todos" && n.estado !== estadoFilter) return false;
      return true;
    });
  }, [nominas, empleadoId, estadoFilter]);

  // KPIs
  const totalBruto = filtered.reduce((s, n) => s + num(n.bruto), 0);
  const totalNeto = filtered.reduce((s, n) => s + num(n.liquido), 0);
  const totalSS = filtered.reduce((s, n) => s + num(n.seguridad_social_empleado), 0);
  const totalIRPF = filtered.reduce((s, n) => s + num(n.irpf_retencion), 0);

  if (loading && nominas.length === 0) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Gestión de Nóminas</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} nóminas — {meses[mes - 1]} {anio}
          </p>
        </div>
        <Button onClick={() => router.push("/asesor/nominas/generar")} size="sm">
          <Plus className="size-4 mr-1" /> Generar Nóminas
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={clienteId}
          onChange={(e) => { setClienteId(e.target.value); setEmpleadoId("todos"); }}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.empresa_id} value={c.empresa_id}>
              {c.es_propia ? `⭐ ${c.nombre} (Mi asesoría)` : c.nombre}
              {` (${c.num_empleados} emp.)`}
            </option>
          ))}
        </select>

        <select
          value={empleadoId}
          onChange={(e) => setEmpleadoId(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos los empleados</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}{clienteId === "todos" ? ` (${e.nombre_empresa})` : ""}
            </option>
          ))}
        </select>

        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {meses.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="calculada">Calculada</option>
          <option value="revisada">Revisada</option>
          <option value="aprobada">Aprobada</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Bruto</p>
            <p className="text-lg font-bold">{formatCurrency(totalBruto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">SS Empleado</p>
            <p className="text-lg font-bold">{formatCurrency(totalSS)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">IRPF</p>
            <p className="text-lg font-bold">{formatCurrency(totalIRPF)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Neto</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalNeto)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de nóminas */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay nóminas para este periodo</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/asesor/nominas/generar")}
            >
              <Plus className="size-4 mr-1" /> Generar nóminas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Nóminas — {meses[mes - 1]} {anio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-3">Empleado</th>
                    <th className="pb-2 pr-3">Empresa</th>
                    <th className="pb-2 pr-3 text-right">Bruto</th>
                    <th className="pb-2 pr-3 text-right">SS</th>
                    <th className="pb-2 pr-3 text-right">IRPF</th>
                    <th className="pb-2 pr-3 text-right">Neto</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr key={n.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-3 font-medium">{n.nombre_empleado || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{n.nombre_empresa || "—"}</td>
                      <td className="py-2.5 pr-3 text-right">{formatCurrency(num(n.bruto))}</td>
                      <td className="py-2.5 pr-3 text-right">{formatCurrency(num(n.seguridad_social_empleado))}</td>
                      <td className="py-2.5 pr-3 text-right">{formatCurrency(num(n.irpf_retencion))}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold">{formatCurrency(num(n.liquido))}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={estadoColor[n.estado] as any || "secondary"} className="text-xs capitalize">
                          {n.estado || "borrador"}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {n.estado !== "aprobada" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleAprobar(n.id)}
                            >
                              <Check className="size-3 mr-1" /> Aprobar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => router.push(`/asesor/nominas/${n.id}`)}
                          >
                            <ChevronRight className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
