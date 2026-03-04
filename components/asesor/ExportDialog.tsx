"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Calendar } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface ExportDialogProps {
  empresaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const trimestres = [
  { value: "1", label: "1T - Enero a Marzo" },
  { value: "2", label: "2T - Abril a Junio" },
  { value: "3", label: "3T - Julio a Septiembre" },
  { value: "4", label: "4T - Octubre a Diciembre" },
];

const meses = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
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

function getFileExtension(formato: string): string {
  return formato === "csv" ? "csv" : "xlsx";
}

export function ExportDialog({
  empresaId,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [tab, setTab] = useState("trimestral");
  const [anio, setAnio] = useState(String(currentYear));
  const [trimestre, setTrimestre] = useState("1");
  const [mes, setMes] = useState("1");
  const [formato, setFormato] = useState("excel");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      let url = "";
      let filename = "";
      const ext = getFileExtension(formato);

      if (tab === "trimestral") {
        url = `/asesor/clientes/${empresaId}/export/trimestral?anio=${anio}&trimestre=${trimestre}&formato=${formato}`;
        filename = `trimestral_${anio}_T${trimestre}_${empresaId}.${ext}`;
      } else if (tab === "mensual") {
        url = `/asesor/clientes/${empresaId}/export/mensual?anio=${anio}&mes=${mes}&formato=${formato}`;
        const mesLabel = meses.find((m) => m.value === mes)?.label || mes;
        filename = `mensual_${anio}_${mesLabel}_${empresaId}.${ext}`;
      } else {
        // resumen-fiscal
        url = `/asesor/clientes/${empresaId}/export/resumen-fiscal?anio=${anio}`;
        filename = `resumen_fiscal_${anio}_${empresaId}.xlsx`;
      }

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

      await downloadBlob(res, filename);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al descargar el archivo");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            Exportar datos del cliente
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="trimestral" className="flex-1">
              Trimestral
            </TabsTrigger>
            <TabsTrigger value="mensual" className="flex-1">
              Mensual
            </TabsTrigger>
            <TabsTrigger value="resumen" className="flex-1">
              Resumen Fiscal
            </TabsTrigger>
          </TabsList>

          {/* Trimestral tab */}
          <TabsContent value="trimestral" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
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
          </TabsContent>

          {/* Mensual tab */}
          <TabsContent value="mensual" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
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
                  Mes
                </label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Resumen Fiscal tab */}
          <TabsContent value="resumen" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Anio fiscal
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
            <p className="text-xs text-muted-foreground">
              Genera un resumen completo de todos los modelos fiscales
              presentados durante el anio seleccionado.
            </p>
          </TabsContent>
        </Tabs>

        {/* Format selector (not shown for resumen fiscal which is always Excel) */}
        {tab !== "resumen" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Formato de archivo
            </label>
            <Select value={formato} onValueChange={setFormato}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={14} />
                    Excel (.xlsx)
                  </span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} />
                    CSV (.csv)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={downloading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <LoadingSpinner size="sm" showText={false} />
            ) : (
              <Download size={16} />
            )}
            {downloading ? "Descargando..." : "Descargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
