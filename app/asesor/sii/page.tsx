"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClienteSii {
  empresa_id: string;
  nombre: string;
  nif: string;
  sii_activo: boolean;
  sii_obligatorio: boolean;
  entorno: string;
  modo: string;
  pendientes: number;
  ultimo_envio_exitoso: string | null;
}

interface DashboardData {
  clientes: ClienteSii[];
  totales: {
    activos: number;
    obligatorios: number;
    pendientes_envio: number;
    errores_recientes: number;
  };
}

export default function AsesorSiiDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      // Get all asesor clients
      const clientesRes = await authenticatedFetch("/asesor/mis-clientes");
      const clientesJson = await clientesRes.json();

      if (!clientesRes.ok) {
        throw new Error(clientesJson.error || "Error al cargar clientes");
      }

      const clientes = Array.isArray(clientesJson) ? clientesJson : (clientesJson.data || []);

      // For each client, try to get SII config
      const clientesSii: ClienteSii[] = [];
      let totalActivos = 0;
      let totalObligatorios = 0;
      let totalPendientes = 0;
      let totalErrores = 0;

      for (const cliente of clientes.slice(0, 20)) {
        try {
          const configRes = await authenticatedFetch(
            `/asesor/clientes/${cliente.vinculado_empresa_id || cliente.id}/sii/config`
          );
          const configJson = await configRes.json();
          const config = configJson.data || {};

          let pendientes = 0;
          let erroresRecientes = 0;
          try {
            const statsRes = await authenticatedFetch(
              `/asesor/clientes/${cliente.vinculado_empresa_id || cliente.id}/sii/estadisticas`
            );
            const statsJson = await statsRes.json();
            if (statsJson.success && statsJson.data) {
              pendientes = statsJson.data.facturas_pendientes || 0;
              erroresRecientes = statsJson.data.envios?.rechazados || 0;
            }
          } catch {
            // Stats not available
          }

          if (config.sii_activo) totalActivos++;
          if (config.sii_obligatorio) totalObligatorios++;
          totalPendientes += pendientes;
          totalErrores += erroresRecientes;

          clientesSii.push({
            empresa_id: cliente.vinculado_empresa_id || cliente.id,
            nombre: cliente.nombre || cliente.razon_social || "Sin nombre",
            nif: cliente.nif_cif || "",
            sii_activo: config.sii_activo || false,
            sii_obligatorio: config.sii_obligatorio || false,
            entorno: config.entorno || "pruebas",
            modo: config.modo || "manual",
            pendientes,
            ultimo_envio_exitoso: config.ultimo_envio_exitoso || null,
          });
        } catch {
          // Client may not have SII access
        }
      }

      // Sort: active first, then by pending count
      clientesSii.sort((a, b) => {
        if (a.sii_activo !== b.sii_activo) return a.sii_activo ? -1 : 1;
        return b.pendientes - a.pendientes;
      });

      setData({
        clientes: clientesSii,
        totales: {
          activos: totalActivos,
          obligatorios: totalObligatorios,
          pendientes_envio: totalPendientes,
          errores_recientes: totalErrores,
        },
      });
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadDashboard}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totales = data?.totales;
  const clientes = data?.clientes || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          SII - Suministro Inmediato de Informacion
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion del envio de facturas en tiempo real a la AEAT
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totales?.activos || 0}</p>
                <p className="text-xs text-muted-foreground">Clientes con SII activo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totales?.obligatorios || 0}</p>
                <p className="text-xs text-muted-foreground">Obligados (&gt;6M)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totales?.pendientes_envio || 0}</p>
                <p className="text-xs text-muted-foreground">Facturas pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totales?.errores_recientes || 0}</p>
                <p className="text-xs text-muted-foreground">Envios rechazados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clientes</CardTitle>
          <CardDescription>Estado SII por cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay clientes con acceso SII configurado
            </p>
          ) : (
            <div className="divide-y">
              {clientes.map((c) => (
                <div
                  key={c.empresa_id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => router.push(`/asesor/clientes/${c.empresa_id}/sii`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.nombre}</p>
                      <p className="text-xs text-muted-foreground">{c.nif}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.sii_activo ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactivo
                      </Badge>
                    )}
                    {c.sii_obligatorio && (
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                        Obligatorio
                      </Badge>
                    )}
                    {c.pendientes > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {c.pendientes} pend.
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {c.entorno === "produccion" ? "PROD" : "TEST"}
                    </Badge>
                    <ChevronRight size={16} className="text-muted-foreground" />
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
