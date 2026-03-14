"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  TrendingUp,
  Euro,
  AlertTriangle,
} from "lucide-react";

interface DashboardData {
  kpis: {
    total_anual: number;
    num_facturas: number;
    total_anterior: number;
    variacion_percent: number;
  };
  alertas: Array<{ tipo: string; mensaje: string }>;
}

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  base_imponible: number;
  total: number;
  estado: string;
  verifactu_estado?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

export default function AsesorFacturacionPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [tab, setTab] = useState<"dashboard" | "listado">("dashboard");

  async function loadDashboard() {
    try {
      const res = await api.get("/admin/facturacion/dashboard");
      setDashboard(res.data);
    } catch (err: any) {
      // Dashboard may not be available yet
    }
  }

  async function loadFacturas() {
    try {
      const res = await api.get("/admin/facturacion/facturas");
      setFacturas(res.data?.facturas || res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar facturas");
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadDashboard(), loadFacturas()]);
      setLoading(false);
    }
    init();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturacion</h1>
          <p className="text-sm text-muted-foreground">
            Facturas de tu asesoria
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() =>
            (window.location.href = "/admin/facturacion/crear")
          }
        >
          <Plus size={16} />
          Nueva factura
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "dashboard"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("dashboard")}
        >
          Resumen
        </button>
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "listado"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("listado")}
        >
          Listado
        </button>
      </div>

      {tab === "dashboard" && dashboard && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Euro size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total anual
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(dashboard.kpis.total_anual)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Facturas</p>
                    <p className="text-xl font-bold">
                      {dashboard.kpis.num_facturas}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Euro size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Mes anterior
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(dashboard.kpis.total_anterior)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <TrendingUp size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Variacion</p>
                    <p className="text-xl font-bold">
                      {dashboard.kpis.variacion_percent > 0 ? "+" : ""}
                      {dashboard.kpis.variacion_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {dashboard.alertas?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.alertas.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20"
                    >
                      <AlertTriangle
                        size={14}
                        className="text-orange-500 mt-0.5 shrink-0"
                      />
                      <p className="text-sm">{a.mensaje}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {tab === "listado" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturas emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            {facturas.length === 0 ? (
              <div className="py-8 text-center">
                <FileText
                  size={48}
                  className="mx-auto text-muted-foreground/30 mb-4"
                />
                <p className="text-muted-foreground">
                  No hay facturas emitidas
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {facturas.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{f.numero}</p>
                        <Badge
                          variant={
                            f.estado === "pagada"
                              ? "default"
                              : f.estado === "pendiente"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {f.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {f.cliente_nombre} -{" "}
                        {new Date(f.fecha).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <p className="font-bold text-sm">
                      {formatCurrency(f.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
