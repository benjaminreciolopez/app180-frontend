"use client";

import { useState } from "react";
import { ocrPreview, ocrConfirm } from "@/services/calendarioOCR";
import { Button } from "@/components/ui/button";
import { pdfToPngFiles } from "@/lib/pdfToImages";

type Item = {
  fecha: string;
  tipo: string;
  descripcion: string | null;
  es_laborable: boolean;
  activo: boolean;
};

export default function ImportarCalendarioOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Item[]>([]);
  const [rawText, setRawText] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) return;

    try {
      setLoading(true);

      let filesToSend: File[] = [];

      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        filesToSend = await pdfToPngFiles(file, 12);
      } else {
        filesToSend = [file];
      }

      const res = await ocrPreview(filesToSend);
      setPreview(res.preview);
      setRawText(res.raw_text);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error OCR");
    } finally {
      setLoading(false);
    }
  }
  async function handleConfirm() {
    try {
      setLoading(true);
      await ocrConfirm(preview);
      alert("Calendario importado correctamente");
      setPreview([]);
      setFile(null);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Error al confirmar");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setPreview((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Importar calendario laboral</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube un PDF o imagen de tu calendario laboral y deja que el sistema
          detecte automáticamente los festivos, ajustes y días especiales.
        </p>
      </div>

      {/* Card: subida */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-medium">1. Subir documento</h2>

        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block"
        />

        <Button onClick={handleAnalyze} disabled={!file || loading}>
          {loading ? "Analizando…" : "Analizar documento"}
        </Button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="font-medium">2. Revisión y confirmación</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border rounded">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Tipo</th>
                  <th className="p-2 border">Descripción</th>
                  <th className="p-2 border text-center">Laborable</th>
                  <th className="p-2 border text-center">Activo</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((it, idx) => (
                  <tr key={idx} className="odd:bg-background even:bg-muted/30">
                    <td className="p-2 border">
                      <input
                        type="date"
                        value={it.fecha}
                        onChange={(e) =>
                          updateItem(idx, { fecha: e.target.value })
                        }
                        className="border rounded px-2 py-1"
                      />
                    </td>

                    <td className="p-2 border">
                      <select
                        value={it.tipo}
                        onChange={(e) =>
                          updateItem(idx, { tipo: e.target.value })
                        }
                        className="border rounded px-2 py-1"
                      >
                        <option value="festivo_local">Festivo</option>
                        <option value="convenio">Convenio</option>
                        <option value="laborable_extra">Laborable extra</option>
                        <option value="cierre_empresa">Cierre empresa</option>
                      </select>
                    </td>

                    <td className="p-2 border">
                      <input
                        type="text"
                        value={it.descripcion || ""}
                        onChange={(e) =>
                          updateItem(idx, { descripcion: e.target.value })
                        }
                        className="border rounded px-2 py-1 w-full"
                      />
                    </td>

                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={it.es_laborable}
                        onChange={(e) =>
                          updateItem(idx, { es_laborable: e.target.checked })
                        }
                      />
                    </td>

                    <td className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={it.activo}
                        onChange={(e) =>
                          updateItem(idx, { activo: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar importación
            </Button>
          </div>
        </div>
      )}

      {/* Debug OCR */}
      {rawText && (
        <details className="bg-muted/30 p-4 rounded">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Ver texto OCR detectado
          </summary>
          <pre className="text-xs mt-2 max-h-64 overflow-auto">{rawText}</pre>
        </details>
      )}
    </div>
  );
}
