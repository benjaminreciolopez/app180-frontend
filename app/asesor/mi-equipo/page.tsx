"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  UserCheck,
  UserX,
  ChevronRight,
  Search,
  Briefcase,
} from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  puesto: string;
  tipo_contrato: string;
  salario_base: number | string;
  dni_nif: string;
  fecha_ingreso: string;
  foto_url: string;
}

export default function MiEquipoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    loadEmpleados();
  }, []);

  async function loadEmpleados() {
    try {
      setLoading(true);
      setError(null);
      const res = await authenticatedFetch("/api/admin/empleados");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setEmpleados(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar los empleados del despacho");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(emp: Empleado) {
    try {
      const res = await authenticatedFetch(`/api/admin/empleados/${emp.id}/toggle-status`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Error al cambiar estado");
      }
      loadEmpleados();
    } catch (err: any) {
      setError(err.message || "Error al cambiar estado del empleado");
    }
  }

  const filtered = useMemo(() => {
    return empleados.filter((e) => {
      if (filtroActivo === "activos" && !e.activo) return false;
      if (filtroActivo === "inactivos" && e.activo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          e.nombre?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.dni_nif?.toLowerCase().includes(q) ||
          e.puesto?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [empleados, filtroActivo, busqueda]);

  const totalEmpleados = empleados.length;
  const activos = empleados.filter((e) => e.activo).length;
  const inactivos = totalEmpleados - activos;

  // ---------- Loading state ----------
  if (loading && empleados.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando equipo del despacho...</p>
        </div>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error && empleados.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
              <UserX size={24} className="text-destructive" />
            </div>
            <div>
              <p className="font-medium">Error al cargar los datos</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={loadEmpleados}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Equipo del Despacho</h1>
          <p className="text-xs text-muted-foreground">
            Gestiona los empleados de tu asesoria
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/asesor/mi-equipo/nuevo")}>
          <Plus className="size-4 mr-1" /> Nuevo empleado
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <UserX size={16} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Inactivos</p>
                <p className="text-lg font-bold">{inactivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Inline error banner (when we already have data) */}
      {error && empleados.length > 0 && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay empleados que mostrar</p>
            {empleados.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push("/asesor/mi-equipo/nuevo")}
              >
                <Plus className="size-4 mr-1" /> Crear primer empleado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 pr-3">Empleado</th>
                    <th className="pb-2 pr-3">Puesto</th>
                    <th className="pb-2 pr-3">Contrato</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/asesor/mi-equipo/${emp.id}`)}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {emp.nombre?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{emp.nombre}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {emp.email || emp.dni_nif || "Sin email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {emp.puesto ? (
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-muted-foreground shrink-0" />
                            <span>{emp.puesto}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {emp.tipo_contrato || "indefinido"}
                        </Badge>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(emp);
                            }}
                            title={emp.activo ? "Desactivar" : "Activar"}
                          >
                            {emp.activo ? (
                              <UserX className="size-3" />
                            ) : (
                              <UserCheck className="size-3" />
                            )}
                          </Button>
                          <ChevronRight className="size-3 text-muted-foreground" />
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
