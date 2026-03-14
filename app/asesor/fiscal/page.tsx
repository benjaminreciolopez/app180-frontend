"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calculator, TrendingUp } from "lucide-react";

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

  if (loading) return <LoadingSpinner fullPage />;

  const modelos = data?.modelos || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modelos Fiscales</h1>
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

      {/* Modelos */}
      {modelos.length === 0 ? (
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
    </div>
  );
}
