"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Plus, UserCheck, UserX, ChevronRight, Search, Building2, Briefcase, Euro,
} from "lucide-react";

interface Cliente {
  empresa_id: string;
  nombre: string;
  num_empleados: number;
  es_propia?: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  empresa_id: string;
  nombre_empresa: string;
  salario_base: number | string;
  tipo_contrato: string;
  puesto: string;
  porcentaje_irpf: number | string;
  dni_nif: string;
  fecha_ingreso: string;
  foto_url: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export default function AsesorEmpleadosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  const [clienteId, setClienteId] = useState("todos");
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    loadEmpleados();
  }, [clienteId]);

  async function loadClientes() {
    try {
      const res = await api.get("/asesor/empleados/clientes");
      const data = res.data?.data;
      const list: Cliente[] = [];
      if (data?.propia) list.push(data.propia);
      if (data?.clientes) list.push(...data.clientes);
      setClientes(list);
    } catch {}
  }

  async function loadEmpleados() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (clienteId !== "todos") params.set("empresa_id", clienteId);
      const res = await api.get(`/asesor/empleados?${params}`);
      setEmpleados(res.data?.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(emp: Empleado) {
    try {
      await api.post(`/asesor/empleados/${emp.id}/toggle-status`);
      showSuccess(emp.activo ? "Empleado desactivado" : "Empleado activado");
      loadEmpleados();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cambiar estado");
    }
  }

  const filtered = useMemo(() => {
    return empleados.filter((e) => {
      if (filtroActivo === "activos" && !e.activo) return false;
      if (filtroActivo === "inactivos" && e.activo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          e.nombre.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.dni_nif?.toLowerCase().includes(q) ||
          e.nombre_empresa?.toLowerCase().includes(q) ||
          e.puesto?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [empleados, filtroActivo, busqueda]);

  const totalEmpleados = empleados.length;
  const activos = empleados.filter((e) => e.activo).length;
  const sinSalario = empleados.filter((e) => !parseFloat(String(e.salario_base))).length;

  if (loading && empleados.length === 0) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Empleados</h1>
          <p className="text-xs text-muted-foreground">
            Gestiona los empleados de tu asesoría y de tus clientes
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/asesor/empleados/nuevo")}>
          <Plus className="size-4 mr-1" /> Nuevo empleado
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Users size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{totalEmpleados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <UserCheck size={16} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Activos</p>
                <p className="text-lg font-bold">{activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Building2 size={16} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Empresas</p>
                <p className="text-lg font-bold">{clientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Euro size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Sin salario</p>
                <p className="text-lg font-bold text-amber-600">{sinSalario}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todas las empresas</option>
          {clientes.map((c) => (
            <option key={c.empresa_id} value={c.empresa_id}>
              {c.es_propia ? `Mi asesoría (${c.nombre})` : c.nombre} ({c.num_empleados})
            </option>
          ))}
        </select>

        <select
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, DNI, puesto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border rounded-md pl-8 pr-3 py-1.5 text-sm bg-background"
          />
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay empleados que mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-3">Empleado</th>
                    <th className="pb-2 pr-3">Empresa</th>
                    <th className="pb-2 pr-3">Puesto</th>
                    <th className="pb-2 pr-3">Contrato</th>
                    <th className="pb-2 pr-3 text-right">Salario base</th>
                    <th className="pb-2 pr-3 text-right">IRPF</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => {
                    const salario = parseFloat(String(emp.salario_base)) || 0;
                    const irpf = parseFloat(String(emp.porcentaje_irpf)) || 0;
                    return (
                      <tr
                        key={emp.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/asesor/empleados/${emp.id}`)}
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {emp.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{emp.nombre}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {emp.dni_nif || emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">
                          {emp.nombre_empresa}
                        </td>
                        <td className="py-2.5 pr-3 text-xs">
                          {emp.puesto || "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {emp.tipo_contrato || "indefinido"}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          {salario > 0 ? (
                            <span className="font-semibold text-sm">{formatCurrency(salario)}</span>
                          ) : (
                            <span className="text-amber-500 text-xs">Sin configurar</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-xs">
                          {irpf > 0 ? `${irpf}%` : "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant={emp.activo ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {emp.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(emp); }}
                            >
                              {emp.activo ? <UserX className="size-3" /> : <UserCheck className="size-3" />}
                            </Button>
                            <ChevronRight className="size-3 text-muted-foreground" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
