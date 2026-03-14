"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  UserCheck,
  UserX,
  Mail,
  MoreVertical,
} from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  dispositivo_activo: boolean | null;
  centro_trabajo_nombre: string | null;
}

export default function AsesorEmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  async function loadEmpleados() {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      setEmpleados(res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  async function toggleActivo(emp: Empleado) {
    try {
      await api.put(`/employees/${emp.id}/status`, {
        activo: !emp.activo,
      });
      showSuccess(
        emp.activo ? "Empleado desactivado" : "Empleado activado"
      );
      loadEmpleados();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cambiar estado");
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const activos = empleados.filter((e) => e.activo);
  const inactivos = empleados.filter((e) => !e.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los empleados de tu asesoria
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() =>
            (window.location.href = "/admin/empleados/nuevo")
          }
        >
          <Plus size={16} />
          Nuevo empleado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{empleados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{activos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <UserX size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold">{inactivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empleados list */}
      {empleados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
            />
            <p className="text-muted-foreground font-medium">
              No hay empleados registrados
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer empleado para empezar
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Listado de empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {empleados.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {emp.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{emp.nombre}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {emp.email}
                        </span>
                        {emp.centro_trabajo_nombre && (
                          <Badge variant="outline" className="text-[10px]">
                            {emp.centro_trabajo_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={emp.activo ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {emp.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActivo(emp)}
                    >
                      {emp.activo ? (
                        <UserX size={14} />
                      ) : (
                        <UserCheck size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
