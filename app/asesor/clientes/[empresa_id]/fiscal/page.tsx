"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const trimestres = ["1T", "2T", "3T", "4T"];

const modeloTitulos: Record<string, string> = {
  modelo303: "Modelo 303 - IVA",
  modelo130: "Modelo 130 - IRPF Estimaci\u00f3n Directa",
  modelo111: "Modelo 111 - Retenciones IRPF",
  modelo115: "Modelo 115 - Retenciones Alquileres",
  modelo349: "Modelo 349 - Operaciones Intracomunitarias",
};

interface ModeloData {
  key: string;
  titulo: string;
  resultado: number;
  detalles: Record<string, any>;
}

function extractModelo303Detalles(m: any): Record<string, any> {
  const detalles: Record<string, any> = {};
  if (m.devengado) {
    detalles["IVA Repercutido (base)"] = m.devengado.base;
    detalles["IVA Repercutido (cuota)"] = m.devengado.cuota;
  }
  if (m.deducible) {
    detalles["IVA Soportado (base)"] = m.deducible.base;
    detalles["IVA Soportado (cuota)"] = m.deducible.cuota;
  }
  detalles["Resultado"] = m.resultado;
  return detalles;
}

function extractModelos(data: any): ModeloData[] {
  const modelos: ModeloData[] = [];
  const modeloKeys = ["modelo303", "modelo130", "modelo111", "modelo115", "modelo349"];

  for (const key of modeloKeys) {
    const m = data?.[key];
    if (!m) continue;

    // Extraer resultado principal
    const resultado = m.resultado ?? m.a_ingresar ?? m.pago_fraccionado ?? 0;

    // Extraer detalles según el modelo
    let detalles: Record<string, any> = {};
    if (key === "modelo303") {
      detalles = extractModelo303Detalles(m);
    } else {
      for (const [k, v] of Object.entries(m)) {
        if (typeof v === "number") {
          detalles[k] = v;
        }
      }
    }

    modelos.push({
      key,
      titulo: modeloTitulos[key] || key,
      resultado: typeof resultado === "number" ? resultado : 0,
      detalles,
    });
  }

  return modelos;
}

export default function AsesorClienteFiscalPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<ModeloData[]>([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [trimestre, setTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [selectedModelo, setSelectedModelo] = useState<string>("todos");

  useEffect(() => {
    loadModelos();
  }, [anio, trimestre, empresaId]);

  async function loadModelos() {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/fiscal/models?year=${anio}&trimestre=${trimestre}`);
      const data = res.data?.data ?? res.data;
      setModelos(extractModelos(data));
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar modelos fiscales");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Modelos Fiscales del cliente</h1>
        <p className="text-xs text-muted-foreground">
          Ejercicio {anio} - {trimestres[trimestre - 1]}
        </p>
      </div>

      {/* Selectores */}
      <div className="flex flex-wrap items-center gap-4">
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
        <select
          value={selectedModelo}
          onChange={(e) => setSelectedModelo(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos los modelos</option>
          {modelos.map((m) => (
            <option key={m.key} value={m.key}>{m.titulo}</option>
          ))}
        </select>
      </div>

      {modelos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay datos fiscales para este periodo</p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${selectedModelo === "todos" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
          {modelos.filter((m) => selectedModelo === "todos" || m.key === selectedModelo).map((m) => (
            <Card key={m.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.titulo}</CardTitle>
                  <Badge variant={m.resultado >= 0 ? "default" : "destructive"} className="text-sm">
                    {formatCurrency(m.resultado)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(m.detalles).map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}</span>
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
