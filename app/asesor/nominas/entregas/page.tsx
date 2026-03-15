"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

interface Entrega {
  id: string;
  nomina_id: string;
  empresa_id: string;
  empleado_id: string;
  estado: string;
  fecha_envio: string;
  fecha_recepcion: string | null;
  fecha_firma: string | null;
  anio: number;
  mes: number;
  bruto: string | number;
  liquido: string | number;
  nombre_empleado: string;
  nombre_empresa: string;
}

interface Cliente {
  empresa_id: string;
  nombre: string;
  es_propia?: boolean;
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const num = (v: string | number) => parseFloat(String(v)) || 0;

const estadoEntregaColor: Record<string, string> = {
  enviada: "default",
  recibida: "secondary",
  firmada: "default",
};

export default function AsesorEntregasPage() {
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string; empresa_id: string; nombre_empresa: string }[]>([]);

  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [clienteId, setClienteId] = useState("todos");
  const [empleadoId, setEmpleadoId] = useState("todos");

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    loadEntregas();
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
    } catch {}
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

  async function loadEntregas() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ anio: String(anio), mes: String(mes) });
      if (clienteId !== "todos") params.set("empresa_id", clienteId);
      const res = await api.get(`/asesor/nominas/entregas?${params}`);
      setEntregas(res.data?.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar entregas");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return entregas.filter((e) => {
      if (empleadoId !== "todos" && e.empleado_id !== empleadoId) return false;
      return true;
    });
  }, [entregas, empleadoId]);

  if (loading && entregas.length === 0) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Entregas de Nóminas</h1>
        <p className="text-xs text-muted-foreground">
          {filtered.length} entregas — {meses[mes - 1]} {anio}
        </p>
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
              {c.es_propia ? `⭐ ${c.nombre}` : c.nombre}
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
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay entregas para este periodo</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-3">Empleado</th>
                    <th className="pb-2 pr-3">Empresa</th>
                    <th className="pb-2 pr-3">Periodo</th>
                    <th className="pb-2 pr-3 text-right">Neto</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 pr-3">Enviada</th>
                    <th className="pb-2">Firmada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-3 font-medium">{e.nombre_empleado}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{e.nombre_empresa}</td>
                      <td className="py-2.5 pr-3">{meses[e.mes - 1]} {e.anio}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold">
                        {formatCurrency(num(e.liquido))}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge
                          variant={estadoEntregaColor[e.estado] as any || "secondary"}
                          className="text-xs capitalize"
                        >
                          {e.estado}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                        {e.fecha_envio ? new Date(e.fecha_envio).toLocaleDateString("es-ES") : "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {e.fecha_firma ? new Date(e.fecha_firma).toLocaleDateString("es-ES") : "—"}
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
