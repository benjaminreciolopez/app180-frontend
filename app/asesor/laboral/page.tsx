"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  AlertTriangle,
  Calendar,
  Users,
  HeartPulse,
  Clock,
} from "lucide-react";

interface DashboardData {
  contratos_vigentes: number;
  bajas_activas: number;
  finiquitos_pendientes: number;
  contratos_proximos_vencimiento: {
    id: string;
    fecha_fin: string;
    tipo_contrato: string;
    nombre_empleado: string;
    nombre_empresa: string;
  }[];
  bajas_revision_pendiente: {
    id: string;
    tipo_baja: string;
    fecha_inicio: string;
    siguiente_revision: string | null;
    nombre_empleado: string;
    nombre_empresa: string;
  }[];
}

const tipoBajaLabel: Record<string, string> = {
  enfermedad_comun: "Enfermedad Comun",
  accidente_laboral: "Acc. Laboral",
  accidente_no_laboral: "Acc. No Laboral",
  enfermedad_profesional: "Enf. Profesional",
  maternidad: "Maternidad",
  paternidad: "Paternidad",
  riesgo_embarazo: "Riesgo Embarazo",
};

export default function AsesorLaboralDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await authenticatedFetch("/asesor/laboral/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return <p className="p-6 text-muted-foreground">Error cargando datos</p>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Laboral</h1>
      <p className="text-muted-foreground">
        Vision global de contratos, bajas laborales y cotizaciones de todos tus clientes.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos Vigentes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.contratos_vigentes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bajas Activas
            </CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.bajas_activas}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finiquitos Pendientes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.finiquitos_pendientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts expiring soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contratos Proximos a Vencer (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.contratos_proximos_vencimiento.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay contratos proximos a vencer
            </p>
          ) : (
            <div className="space-y-3">
              {data.contratos_proximos_vencimiento.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{c.nombre_empleado}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.nombre_empresa}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{c.tipo_contrato}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vence: {new Date(c.fecha_fin).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sick leaves pending review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Bajas Pendientes de Revision
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.bajas_revision_pendiente.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay bajas pendientes de revision
            </p>
          ) : (
            <div className="space-y-3">
              {data.bajas_revision_pendiente.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{b.nombre_empleado}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.nombre_empresa}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {tipoBajaLabel[b.tipo_baja] || b.tipo_baja}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Desde: {new Date(b.fecha_inicio).toLocaleDateString("es-ES")}
                    </p>
                    {b.siguiente_revision && (
                      <p className="text-xs text-orange-600">
                        Revision: {new Date(b.siguiente_revision).toLocaleDateString("es-ES")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
