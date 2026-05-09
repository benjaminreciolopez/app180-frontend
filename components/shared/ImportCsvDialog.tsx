"use client";

// Dialog reusable para importación CSV en dos pasos:
//   1. Subir archivo → preview (no toca BD).
//   2. Revisar → confirmar (aplica).
// Pensado para clientes y facturas, pero genérico en el contrato.

import { useState } from "react";
import { Upload, Download, AlertTriangle, Check, FileSpreadsheet, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { showError, showSuccess } from "@/lib/toast";

export interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título mostrado en cabecera. Ej: "Importar clientes desde CSV". */
  titulo: string;
  /** Descripción opcional bajo el título. */
  descripcion?: string;
  /** URL relativa del endpoint preview. Ej: "/api/admin/import/clientes/preview". */
  previewUrl: string;
  /** URL relativa del endpoint confirm. Ej: "/api/admin/import/clientes/confirmar". */
  confirmUrl: string;
  /** URL de la plantilla CSV descargable. */
  plantillaUrl: string;
  /** Función para renderizar el resumen del preview (rows + totales). */
  renderResumen: (preview: any) => React.ReactNode;
  /** Función para renderizar el resumen tras confirmar. */
  renderResultado: (resultado: any) => React.ReactNode;
  /** Callback tras confirmación exitosa (refrescar listas, etc.) */
  onCompleted?: (resultado: any) => void;
}

export default function ImportCsvDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  previewUrl,
  confirmUrl,
  plantillaUrl,
  renderResumen,
  renderResultado,
  onCompleted,
}: ImportCsvDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultado(null);
  };

  const onClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const descargarPlantilla = async () => {
    try {
      const res = await authenticatedFetch(plantillaUrl);
      if (!res.ok) throw new Error("Error descargando plantilla");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^";]+)"?/);
      a.download = m?.[1] || "plantilla.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err?.message || "No se pudo descargar la plantilla");
    }
  };

  const lanzarPreview = async () => {
    if (!file) {
      showError("Selecciona un archivo CSV");
      return;
    }
    setPreviewing(true);
    setPreview(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authenticatedFetch(previewUrl, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Error en preview");
      setPreview(j);
    } catch (err: any) {
      showError(err?.message || "Error en preview");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmar = async () => {
    if (!file) return;
    setConfirming(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authenticatedFetch(confirmUrl, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Error confirmando importación");
      setResultado(j);
      showSuccess("Importación completada");
      onCompleted?.(j);
    } catch (err: any) {
      showError(err?.message || "Error confirmando");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {titulo}
          </DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>

        {!resultado && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={descargarPlantilla}
                >
                  <Download size={14} />
                  Descargar plantilla
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formato CSV con cabecera. Separadores soportados: ; , tab. Números
                con , o . decimal. Fechas DD/MM/YYYY o YYYY-MM-DD.
              </p>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }}
                className="block w-full text-sm"
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            {!preview && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onClose(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={lanzarPreview}
                  disabled={!file || previewing}
                  className="gap-1.5"
                >
                  <Upload size={14} />
                  {previewing ? "Analizando…" : "Previsualizar"}
                </Button>
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-muted/30 rounded-lg p-4 border">
                  {renderResumen(preview)}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setPreview(null); setFile(null); }}>
                    <X size={14} className="mr-1" />
                    Empezar de nuevo
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmar}
                    disabled={confirming}
                    className="gap-1.5"
                  >
                    <Check size={14} />
                    {confirming ? "Importando…" : "Confirmar importación"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 mb-2">
                <Check size={18} />
                <span className="font-semibold">Importación completada</span>
              </div>
              {renderResultado(resultado)}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => onClose(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helpers de renderizado predefinidos para clientes y facturas.
 */
export function ResumenClientes({ preview }: { preview: any }) {
  const t = preview?.totales || {};
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total filas" value={t.total} />
        <Stat label="Nuevos" value={t.nuevos} color="text-emerald-700" />
        <Stat label="A actualizar" value={t.actualizar} color="text-blue-700" />
        <Stat label="Con error" value={t.conError} color="text-rose-700" />
      </div>
      {preview.rows?.slice(0, 10).map((r: any, i: number) => (
        <div key={i} className="text-xs flex items-center gap-2 border-b last:border-0 py-1">
          <Badge variant="outline" className={
            r.op === "crear" ? "border-emerald-400 text-emerald-700" :
            r.op === "actualizar" ? "border-blue-400 text-blue-700" :
            "border-rose-400 text-rose-700"
          }>
            {r.op}
          </Badge>
          <span className="font-medium">{r.cliente?.nombre}</span>
          <span className="text-muted-foreground">{r.cliente?.nif}</span>
          {r.errores?.length > 0 && (
            <span className="text-rose-600 flex items-center gap-1">
              <AlertTriangle size={11} /> {r.errores.join(", ")}
            </span>
          )}
        </div>
      ))}
      {preview.rows?.length > 10 && (
        <p className="text-xs text-muted-foreground">
          … y {preview.rows.length - 10} filas más.
        </p>
      )}
    </div>
  );
}

export function ResultadoClientes({ resultado }: { resultado: any }) {
  return (
    <div className="space-y-1 text-sm">
      <div>✅ Creados: <strong>{resultado.creados}</strong></div>
      <div>🔄 Actualizados: <strong>{resultado.actualizados}</strong></div>
      {resultado.errores?.length > 0 && (
        <div className="text-rose-700">
          ⚠️ Errores: <strong>{resultado.errores.length}</strong>
          <ul className="text-xs list-disc ml-5 mt-1">
            {resultado.errores.slice(0, 5).map((e: any, i: number) => (
              <li key={i}>Línea {e.line}: {e.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ResumenFacturas({ preview }: { preview: any }) {
  const t = preview?.totales || {};
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total" value={t.total} />
        <Stat label="Nuevas" value={t.nuevas} color="text-emerald-700" />
        <Stat label="Duplicadas" value={t.duplicadas} color="text-amber-700" />
        <Stat label="Con error" value={t.conError} color="text-rose-700" />
      </div>
      <div className="text-xs text-muted-foreground">
        Clientes a crear: <strong>{t.clientes_nuevos || 0}</strong> · Series detectadas:{" "}
        <strong>{(t.series_detectadas || []).join(", ") || "—"}</strong>
      </div>
      {preview.rows?.slice(0, 10).map((r: any, i: number) => (
        <div key={i} className="text-xs flex items-center gap-2 border-b last:border-0 py-1 flex-wrap">
          <Badge variant="outline" className={
            r.op === "crear" ? "border-emerald-400 text-emerald-700" :
            r.op === "duplicada" ? "border-amber-400 text-amber-700" :
            "border-rose-400 text-rose-700"
          }>
            {r.op}
          </Badge>
          <span className="font-medium">{r.factura?.numero}</span>
          <span className="text-muted-foreground">{r.factura?.fecha}</span>
          <span className="text-muted-foreground">{r.factura?.cliente_nombre || r.factura?.cliente_nif}</span>
          <span className="font-mono">{r.factura?.total} €</span>
          {r.cliente_creara && <Badge variant="outline" className="border-blue-300 text-blue-700">+ cliente nuevo</Badge>}
          {r.asiento_match && <Badge variant="outline" className="border-purple-300 text-purple-700">✓ asiento</Badge>}
          {r.errores?.length > 0 && (
            <span className="text-rose-600 flex items-center gap-1">
              <AlertTriangle size={11} /> {r.errores.join(", ")}
            </span>
          )}
        </div>
      ))}
      {preview.rows?.length > 10 && (
        <p className="text-xs text-muted-foreground">
          … y {preview.rows.length - 10} filas más.
        </p>
      )}
    </div>
  );
}

export function ResultadoFacturas({ resultado }: { resultado: any }) {
  return (
    <div className="space-y-1 text-sm">
      <div>✅ Creadas: <strong>{resultado.creadas}</strong></div>
      <div>👥 Clientes auto-creados: <strong>{resultado.clientes_creados}</strong></div>
      <div>📒 Vinculadas a asientos existentes: <strong>{resultado.asientos_vinculados}</strong></div>
      {resultado.omitidas_duplicadas > 0 && (
        <div>↩️ Omitidas (duplicadas): <strong>{resultado.omitidas_duplicadas}</strong></div>
      )}
      {resultado.errores?.length > 0 && (
        <div className="text-rose-700">
          ⚠️ Errores: <strong>{resultado.errores.length}</strong>
          <ul className="text-xs list-disc ml-5 mt-1">
            {resultado.errores.slice(0, 5).map((e: any, i: number) => (
              <li key={i}>Línea {e.line}: {e.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white dark:bg-card rounded-md border px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color || ""}`}>{value ?? 0}</div>
    </div>
  );
}
