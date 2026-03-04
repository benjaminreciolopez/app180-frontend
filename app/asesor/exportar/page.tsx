"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Archive,
  Calendar,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const trimestres = [
  { value: "1", label: "1T - Enero a Marzo" },
  { value: "2", label: "2T - Abril a Junio" },
  { value: "3", label: "3T - Julio a Septiembre" },
  { value: "4", label: "4T - Octubre a Diciembre" },
];

async function downloadBlob(res: Response, filename: string) {
  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

export default function AsesorExportarPage() {
  const [anio, setAnio] = useState(String(currentYear));
  const [trimestre, setTrimestre] = useState("1");
  const [formato, setFormato] = useState<"excel" | "zip">("excel");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleExportAll() {
    setDownloading(true);
    setError(null);
    setProgress("Preparando exportacion de todos los clientes...");

    try {
      const url = `/asesor/export/multi-cliente?anio=${anio}&trimestre=${trimestre}&formato=${formato}`;
      setProgress("Generando archivo, esto puede tardar unos momentos...");

      const res = await authenticatedFetch(url);

      if (!res.ok) {
        let errorMsg = "Error al exportar";
        try {
          const json = await res.json();
          errorMsg = json.error || errorMsg;
        } catch {
          // response was not JSON
        }
        throw new Error(errorMsg);
      }

      const ext = formato === "zip" ? "zip" : "xlsx";
      const filename = `exportacion_clientes_${anio}_T${trimestre}.${ext}`;

      setProgress("Descargando archivo...");
      await downloadBlob(res, filename);
      setProgress(null);
    } catch (err: any) {
      setError(err.message || "Error al exportar datos");
      setProgress(null);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Exportacion multi-cliente
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exporta los datos de todos tus clientes en un solo archivo
        </p>
      </div>

      {/* Configuration card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Configuracion de exportacion
          </CardTitle>
          <CardDescription>
            Selecciona el periodo y formato para la exportacion masiva
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Anio
              </label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar anio" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Trimestre
              </label>
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {trimestres.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Formato de exportacion
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormato("excel")}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                  formato === "excel"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formato === "excel"
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}
                >
                  <FileSpreadsheet
                    size={20}
                    className={
                      formato === "excel"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Excel (todo en 1)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Un archivo .xlsx con una hoja por cliente
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormato("zip")}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                  formato === "zip"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formato === "zip"
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}
                >
                  <Archive
                    size={20}
                    className={
                      formato === "zip"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    ZIP (1 por cliente)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Un archivo .zip con un Excel por cada cliente
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Progress indicator */}
          {downloading && progress && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <LoadingSpinner size="sm" showText={false} />
              <p className="text-sm text-primary font-medium">{progress}</p>
            </div>
          )}

          {/* Export button */}
          <Button
            onClick={handleExportAll}
            disabled={downloading}
            size="lg"
            className="w-full gap-2"
          >
            {downloading ? (
              <LoadingSpinner size="sm" showText={false} />
            ) : (
              <Download size={18} />
            )}
            {downloading
              ? "Exportando..."
              : "Exportar todos los clientes"}
          </Button>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <FileSpreadsheet size={18} className="text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Sobre la exportacion multi-cliente
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  Se exportan los datos de todos los clientes a los que tienes
                  acceso.
                </li>
                <li>
                  Incluye facturas emitidas, gastos y resumen fiscal del periodo
                  seleccionado.
                </li>
                <li>
                  El tiempo de generacion depende del numero de clientes y
                  volumen de datos.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
