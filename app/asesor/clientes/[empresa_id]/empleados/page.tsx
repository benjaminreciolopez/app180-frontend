"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  centro_trabajo_nombre?: string;
}

export default function AsesorClienteEmpleadosPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
    loadEmpleados();
  }, [empresaId]);

  async function loadEmpleados() {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      const arr = res.data?.data ?? res.data;
      setEmpleados(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const activos = empleados.filter((e) => e.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/asesor/clientes/${empresaId}`)}
          className="gap-1"
        >
          <ArrowLeft size={16} />
          Volver al cliente
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Empleados del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {activos.length} activos de {empleados.length} total
          </p>
        </div>
      </div>

      {empleados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">El cliente no tiene empleados registrados</p>
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
