"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  centro_trabajo_nombre?: string;
}

export default function AsesorClienteEmpleadosPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [moduloDesactivado, setModuloDesactivado] = useState(false);

  useEffect(() => {
    loadEmpleados();
  }, [empresaId]);

  async function loadEmpleados() {
    try {
      setLoading(true);
      setModuloDesactivado(false);
      const res = await api.get("/employees");
      const arr = res.data?.data ?? res.data;
      setEmpleados(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      const msg = err.response?.data?.error || "";
      if (err.response?.status === 403 && (msg.includes("desactivado") || msg.includes("No autorizado"))) {
        setModuloDesactivado(true);
      }
      setEmpleados([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const activos = empleados.filter((e) => e.activo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Empleados del cliente</h1>
        <p className="text-xs text-muted-foreground">
          {activos.length} activos de {empleados.length} total
        </p>
      </div>

      {empleados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {moduloDesactivado
                ? "El módulo de empleados está desactivado para este cliente"
                : "El cliente no tiene empleados registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {empleados.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {emp.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{emp.nombre}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                  <Badge variant={emp.activo ? "default" : "secondary"} className="text-xs">
                    {emp.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
