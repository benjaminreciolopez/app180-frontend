"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, ReceiptEuro, ShieldAlert, Search, ExternalLink } from "lucide-react";
import FiscalAlertsPanel from "@/components/admin/fiscal/FiscalAlertsPanel";
import AeatConsultaPanel from "@/components/fiscal/AeatConsultaPanel";
import AeatQuickPanel from "@/components/fiscal/AeatQuickPanel";
import CalendarioFiscal from "@/components/fiscal/CalendarioFiscal";

interface ModeloFiscal {
  modelo: string;
  titulo: string;
  resultado: number;
  detalles: Record<string, any>;
}

interface FiscalData {
  modelos: ModeloFiscal[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

const trimestres = ["1T", "2T", "3T", "4T"];

export default function AsesorFiscalPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "alertas" ? "alertas" : tabParam === "aeat" ? "aeat" : tabParam === "consulta" ? "consulta" : "modelos";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FiscalData | null>(null);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );

  async function loadModelos() {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/admin/fiscal/models?year=${anio}&trimestre=${trimestre}`
      );
      setData(res.data);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar modelos fiscales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModelos();
  }, [anio, trimestre]);

  const modelos = data?.modelos || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fiscal y Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Gestion fiscal de tu asesoria
        </p>
      </div>

      {/* Selectores */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ejercicio:</span>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {[2024, 2025, 2026].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Trimestre:</span>
          <div className="flex gap-1">
            {trimestres.map((t, idx) => (
              <Button
                key={t}
                variant={trimestre === idx + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setTrimestre(idx + 1)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="modelos" className="gap-1.5">
            <ReceiptEuro className="w-4 h-4" /> Modelos Fiscales
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Inteligencia Fiscal
          </TabsTrigger>
          <TabsTrigger value="consulta" className="gap-1.5">
            <Search className="w-4 h-4" /> Consulta AEAT
          </TabsTrigger>
          <TabsTrigger value="aeat" className="gap-1.5">
            <ExternalLink className="w-4 h-4" /> AEAT
          </TabsTrigger>
        </TabsList>

        {/* Tab: Modelos Fiscales */}
        <TabsContent value="modelos" className="space-y-6 mt-4">
          {loading ? (
            <LoadingSpinner fullPage />
          ) : modelos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator
                  size={48}
                  className="mx-auto text-muted-foreground/30 mb-4"
                />
                <p className="text-muted-foreground">
                  No hay datos fiscales para este periodo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Los modelos se calculan automaticamente con los datos de facturacion y gastos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelos.map((m) => (
                <Card key={m.modelo}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Modelo {m.modelo}
                        </CardTitle>
                        <CardDescription>{m.titulo}</CardDescription>
                      </div>
                      <Badge
                        variant={m.resultado >= 0 ? "default" : "destructive"}
                        className="text-sm"
                      >
                        {formatCurrency(m.resultado)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(m.detalles || {}).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">
                            {typeof val === "number"
                              ? formatCurrency(val)
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Inteligencia Fiscal */}
        <TabsContent value="alertas" className="mt-4">
          <FiscalAlertsPanel year={anio.toString()} trimestre={trimestre.toString()} />
        </TabsContent>

        {/* Tab: Consulta AEAT */}
        <TabsContent value="consulta" className="mt-4">
          <AeatConsultaPanel year={anio.toString()} trimestre={trimestre.toString()} />
        </TabsContent>

        {/* Tab: AEAT */}
        <TabsContent value="aeat" className="space-y-6 mt-4">
          <AeatQuickPanel year={anio.toString()} collapsed={false} />
          <CalendarioFiscal year={anio.toString()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
