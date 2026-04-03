"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, AlertTriangle, TrendingUp, TrendingDown,
  Users, Calculator, Bell, ArrowRight, RefreshCw,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RetaTramoVisualizer } from "@/components/reta/RetaTramoVisualizer";
import { RetaRegularizacionGauge } from "@/components/reta/RetaRegularizacionGauge";

type ClienteReta = {
  empresaId: string;
  nombre: string;
  nifCif: string | null;
  tipoContribuyente: "autonomo" | "sociedad" | null;
  baseActual: number | null;
  cuotaActual: number | null;
  tramoActual: number | null;
  tarifaPlana: boolean;
  tramoRecomendado: number | null;
  baseRecomendada: number | null;
  cuotaRecomendada: number | null;
  riesgoRegularizacion: number | null;
  confianza: number | null;
  rendimientoMensual: number | null;
  ultimaEstimacion: string | null;
  alertasPendientes: number;
  sector: string | null;
  estacionalidad: string | null;
};

type ResumenReta = {
  totalClientes: number;
  conRiesgoAlto: number;
  conAlertasPendientes: number;
  sinEstimacion: number;
  sinConfigurar: number;
  totalEmpresas: number;
};

type EmpresaSinConfigurar = {
  empresaId: string;
  nombre: string;
  nifCif: string | null;
};

export default function RetaDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenReta | null>(null);
  const [clientes, setClientes] = useState<ClienteReta[]>([]);
  const [sinConfigurar, setSinConfigurar] = useState<EmpresaSinConfigurar[]>([]);
  const [recalculando, setRecalculando] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await authenticatedFetch("/asesor/reta/dashboard");
      if (!res.ok) throw new Error("Error cargando dashboard RETA");
      const data = await res.json();
      setResumen(data.resumen);
      setClientes(data.clientes);
      setSinConfigurar(data.sinConfigurar || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const getSemaforoColor = (riesgo: number | null) => {
    if (riesgo === null) return "bg-muted text-muted-foreground";
    const abs = Math.abs(riesgo);
    if (abs > 1000) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (abs > 500) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  async function marcarComoAutonomo(empresaId: string) {
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/tipo-contribuyente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_contribuyente: "autonomo" }),
      });
      if (res.ok) fetchDashboard();
    } catch { /* silent */ }
  }

  async function marcarComoSociedad(empresaId: string) {
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/tipo-contribuyente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_contribuyente: "sociedad" }),
      });
      if (res.ok) fetchDashboard();
    } catch { /* silent */ }
  }

  if (loading) return <div className="flex items-center justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            RETA - Base de Cotizacion Autonomos
          </h1>
          <p className="text-muted-foreground mt-1">
            Estimacion y control de la base de cotizacion para prevenir regularizaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/asesor/reta/pre-onboarding")}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Pre-onboarding
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{resumen.totalClientes}</p>
                  <p className="text-xs text-muted-foreground">Autonomos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{resumen.conRiesgoAlto}</p>
                  <p className="text-xs text-muted-foreground">Riesgo alto</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{resumen.conAlertasPendientes}</p>
                  <p className="text-xs text-muted-foreground">Con alertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{resumen.sinEstimacion}</p>
                  <p className="text-xs text-muted-foreground">Sin estimacion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Banner: clientes sin configurar */}
      {sinConfigurar.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5" />
              {sinConfigurar.length} cliente{sinConfigurar.length !== 1 ? "s" : ""} sin tipo definido
            </CardTitle>
            <CardDescription className="text-amber-700/80 dark:text-amber-400/80">
              Indica si cada cliente es autonomo o sociedad para activar el modulo RETA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sinConfigurar.map((e) => (
                <div key={e.empresaId} className="flex items-center justify-between gap-3 bg-white dark:bg-background rounded-lg px-3 py-2 border">
                  <div>
                    <p className="text-sm font-medium">{e.nombre}</p>
                    {e.nifCif && <p className="text-xs text-muted-foreground">{e.nifCif}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => marcarComoAutonomo(e.empresaId)} className="text-xs h-7">
                      Autonomo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => marcarComoSociedad(e.empresaId)} className="text-xs h-7 text-muted-foreground">
                      Sociedad
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Autonomos</CardTitle>
          <CardDescription>
            {clientes.length > 0
              ? "Ordenados por riesgo de regularizacion (mayor primero)"
              : resumen && resumen.totalEmpresas > 0
                ? `Tienes ${resumen.totalEmpresas} clientes vinculados. Marca los que sean autonomos para ver sus estimaciones RETA.`
                : "Vincula clientes desde la seccion de Clientes para empezar"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {sinConfigurar.length > 0
                  ? "Configura el tipo de tus clientes arriba para empezar"
                  : "No hay clientes autonomos vinculados"}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/asesor/clientes")}>
                Ir a Clientes
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Cliente</th>
                    <th className="text-center py-2 px-3 font-medium">Tramo</th>
                    <th className="text-right py-2 px-3 font-medium">Cuota actual</th>
                    <th className="text-right py-2 px-3 font-medium">Cuota recom.</th>
                    <th className="text-right py-2 px-3 font-medium">Regularizacion</th>
                    <th className="text-center py-2 px-3 font-medium">Confianza</th>
                    <th className="text-center py-2 px-3 font-medium">Alertas</th>
                    <th className="text-center py-2 px-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr
                      key={c.empresaId}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/asesor/reta/clientes/${c.empresaId}`)}
                    >
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.tarifaPlana && <Badge variant="secondary" className="mr-1 text-[10px]">Tarifa plana</Badge>}
                            {c.sector && <span>{c.sector}</span>}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.tramoActual && c.tramoRecomendado ? (
                          <span className={c.tramoActual !== c.tramoRecomendado ? "text-amber-600 font-semibold" : ""}>
                            {c.tramoActual} {c.tramoActual !== c.tramoRecomendado && `→ ${c.tramoRecomendado}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {c.cuotaActual !== null ? `${c.cuotaActual.toFixed(2)} €` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {c.cuotaRecomendada !== null ? `${c.cuotaRecomendada.toFixed(2)} €` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {c.riesgoRegularizacion !== null ? (
                          <Badge className={getSemaforoColor(c.riesgoRegularizacion)}>
                            {c.riesgoRegularizacion > 0 ? "+" : ""}{c.riesgoRegularizacion.toFixed(0)} €
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.confianza !== null ? (
                          <span className={c.confianza < 50 ? "text-amber-600" : "text-green-600"}>
                            {c.confianza}%
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.alertasPendientes > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {c.alertasPendientes}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Estimacion orientativa. El rendimiento neto real depende de datos que pueden cambiar.
        No constituye asesoramiento fiscal vinculante.
      </p>
    </div>
  );
}
