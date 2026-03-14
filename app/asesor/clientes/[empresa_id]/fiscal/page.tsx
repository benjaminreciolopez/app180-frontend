"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator } from "lucide-react";

interface ModeloFiscal {
  modelo: string;
  titulo: string;
  resultado: number;
  detalles: Record<string, any>;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const trimestres = ["1T", "2T", "3T", "4T"];

export default function AsesorClienteFiscalPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<ModeloFiscal[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  useEffect(() => {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
  }, [empresaId]);

  useEffect(() => {
    loadModelos();
  }, [anio, trimestre, empresaId]);

  async function loadModelos() {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/fiscal/models?year=${anio}&trimestre=${trimestre}`);
      setModelos(res.data?.modelos || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar modelos fiscales");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

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
          <h1 className="text-xl font-bold tracking-tight">Modelos Fiscales del cliente</h1>
          <p className="text-xs text-muted-foreground">
            Ejercicio {anio} - {trimestres[trimestre - 1]}
          </p>
        </div>
      </div>

      {/* Selectores */}
      <div className="flex items-center gap-4">
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
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

      {modelos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay datos fiscales para este periodo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelos.map((m) => (
            <Card key={m.modelo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Modelo {m.modelo}</CardTitle>
                    <CardDescription>{m.titulo}</CardDescription>
                  </div>
                  <Badge variant={m.resultado >= 0 ? "default" : "destructive"} className="text-sm">
                    {formatCurrency(m.resultado)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(m.detalles || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium">
                        {typeof val === "number" ? formatCurrency(val) : String(val)}
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
