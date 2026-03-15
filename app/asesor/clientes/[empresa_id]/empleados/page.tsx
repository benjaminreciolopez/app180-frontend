"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, ChevronRight } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  puesto: string;
  tipo_contrato: string;
  salario_base: number | string;
  porcentaje_irpf: number | string;
  dni_nif: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export default function AsesorClienteEmpleadosPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  useEffect(() => {
    loadEmpleados();
  }, [empresaId]);

  async function loadEmpleados() {
    try {
      setLoading(true);
      const res = await api.get(`/asesor/empleados?empresa_id=${empresaId}`);
      setEmpleados(res.data?.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar empleados");
      setEmpleados([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const activos = empleados.filter((e) => e.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Empleados del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {activos.length} activos de {empleados.length} total
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/asesor/empleados/nuevo")}>
          <Plus className="size-4 mr-1" /> Nuevo
        </Button>
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
              {empleados.map((emp) => {
                const salario = parseFloat(String(emp.salario_base)) || 0;
                const irpf = parseFloat(String(emp.porcentaje_irpf)) || 0;
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => router.push(`/asesor/empleados/${emp.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {emp.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{emp.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.puesto || emp.email}
                          {emp.dni_nif ? ` · ${emp.dni_nif}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {salario > 0 ? (
                          <p className="text-xs font-semibold">{formatCurrency(salario)}/año</p>
                        ) : (
                          <p className="text-[10px] text-amber-500">Sin salario</p>
                        )}
                        {irpf > 0 && (
                          <p className="text-[10px] text-muted-foreground">IRPF {irpf}%</p>
                        )}
                      </div>
                      <Badge variant={emp.activo ? "default" : "secondary"} className="text-xs">
                        {emp.activo ? "Activo" : "Inactivo"}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
