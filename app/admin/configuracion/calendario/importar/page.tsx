"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { pdfToPngFiles } from "@/lib/pdfToImages";
import { ocrPreview, ocrReparse, ocrConfirm } from "@/services/calendarioOCR";

type Meta = {
  confidence?: number;
  reason?: string;
  source_line?: string;
};

type Item = {
  fecha: string;
  tipo: "festivo_local" | "convenio" | "laborable_extra" | "cierre_empresa";
  descripcion: string | null;
  es_laborable: boolean;
  activo: boolean;
  label?: string | null; // nacional/autonómico/local
  meta?: Meta;
};

function pct(n?: number) {
  if (typeof n !== "number") return "—";
  return `${Math.round(n * 100)}%`;
}

export default function ImportarCalendarioLaboralPage() {
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");

  const [rawText, setRawText] = useState<string>("");
  const [preview, setPreview] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview"); // en móvil

  const stats = useMemo(() => {
    const total = preview.length;
    const festivos = preview.filter((x) => x.tipo === "festivo_local").length;
    const convenios = preview.filter((x) => x.tipo === "convenio").length;
    const cierres = preview.filter((x) => x.tipo === "cierre_empresa").length;
    const extras = preview.filter((x) => x.tipo === "laborable_extra").length;

    const lowConfidence = preview.filter(
      (x) => (x.meta?.confidence ?? 1) < 0.6,
    ).length;

    return { total, festivos, convenios, cierres, extras, lowConfidence };
  }, [preview]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setPreview((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function removeItem(idx: number) {
    setPreview((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBlankRow() {
    // añade una fila manual por si el OCR se saltó algo
    setPreview((prev) => [
      ...prev,
      {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: "festivo_local",
        descripcion: "",
        es_laborable: false,
        activo: true,
        label: "local",
        meta: { confidence: 1, reason: "manual" },
      },
    ]);
  }

  async function handleAnalyze() {
    if (!file) return;

    try {
      setLoading(true);
      setStage("Preparando documento…");

      let filesToSend: File[] = [];

      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setStage("Convirtiendo PDF a imágenes…");
        filesToSend = await pdfToPngFiles(file, 12);
      } else {
        filesToSend = [file];
      }

      setStage("Ejecutando OCR…");
      const res = await ocrPreview(filesToSend);

      setRawText(res.raw_text || "");
      setPreview(res.preview || []);
      setActiveTab("preview");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error OCR");
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  async function handleReparse() {
    try {
      setLoading(true);
      setStage("Re-analizando texto…");
      const res = await ocrReparse(rawText);
      setPreview(res.preview || []);
      setActiveTab("preview");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error reparse");
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  async function handleConfirm() {
    try {
      setLoading(true);
      setStage("Guardando en calendario…");

      // enviamos solo filas activas
      const activeItems = preview.filter((x) => x.activo !== false);

      await ocrConfirm(activeItems);
      alert("Importación completada. El calendario ha sido actualizado.");

      // reset
      setFile(null);
      setRawText("");
      setPreview([]);
      setActiveTab("preview");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Error al confirmar");
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header de venta: claridad + promesa */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Importar calendario laboral</h1>
        <p className="text-sm text-muted-foreground">
          Importa un calendario (PDF o imagen), revisa el resultado y confirma.
          APP180 guardará festivos y ajustes de forma consistente para Admin y
          Empleados.
        </p>
      </div>

      {/* Card: uploader */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="font-medium">1) Documento</div>
            <div className="text-sm text-muted-foreground">
              Recomendación: PDF nítido o foto sin sombras. Máximo 12 páginas
              por importación.
            </div>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={!file || loading}>
              {loading ? "Procesando…" : "Analizar"}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">
            {stage || "Procesando…"}
          </div>
        )}
      </div>

      {/* Si hay datos, mostramos el “workspace” */}
      {(rawText || preview.length > 0) && (
        <div className="bg-card border rounded-lg p-4 md:p-6">
          {/* Header workspace: indicadores de calidad (para vender confianza) */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="font-medium">2) Revisión asistida</div>
              <div className="text-sm text-muted-foreground">
                {stats.total} entradas detectadas · Festivos: {stats.festivos} ·
                Convenio: {stats.convenios} · Cierres: {stats.cierres} · Extras:{" "}
                {stats.extras}
                {stats.lowConfidence > 0
                  ? ` · Revisión sugerida: ${stats.lowConfidence}`
                  : ""}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={addBlankRow}
                disabled={loading}
              >
                Añadir fila
              </Button>
              <Button
                variant="secondary"
                onClick={handleReparse}
                disabled={loading || !rawText}
              >
                Reanalizar texto
              </Button>
            </div>
          </div>

          {/* Tabs móvil (UX premium sin saturar) */}
          <div className="mt-4 md:hidden flex gap-2">
            <button
              className={`flex-1 border rounded px-3 py-2 text-sm ${activeTab === "preview" ? "bg-muted" : ""}`}
              onClick={() => setActiveTab("preview")}
            >
              Vista previa
            </button>
            <button
              className={`flex-1 border rounded px-3 py-2 text-sm ${activeTab === "editor" ? "bg-muted" : ""}`}
              onClick={() => setActiveTab("editor")}
            >
              Editor OCR
            </button>
          </div>

          {/* Layout premium: 2 columnas en desktop */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Editor OCR */}
            <div
              className={`${activeTab === "editor" ? "" : "hidden"} md:block`}
            >
              <div className="text-sm font-medium mb-2">
                Editor de texto OCR
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full min-h-[380px] border rounded p-3 text-xs leading-5"
                placeholder="Aquí aparecerá el texto detectado por OCR…"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Consejo: corrige palabras clave (“convenio”, “festivo
                autonómico”, “fiesta nacional”) y pulsa <b>Reanalizar texto</b>.
              </p>
            </div>

            {/* Preview editable */}
            <div
              className={`${activeTab === "preview" ? "" : "hidden"} md:block`}
            >
              <div className="text-sm font-medium mb-2">
                Vista previa (editable)
              </div>

              <div className="overflow-x-auto border rounded">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 border-b">Fecha</th>
                      <th className="p-2 border-b">Tipo</th>
                      <th className="p-2 border-b">Ámbito</th>
                      <th className="p-2 border-b">Descripción</th>
                      <th className="p-2 border-b text-center">Laborable</th>
                      <th className="p-2 border-b text-center">Activo</th>
                      <th className="p-2 border-b text-center">Conf.</th>
                      <th className="p-2 border-b"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((it, idx) => (
                      <tr
                        key={idx}
                        className="odd:bg-background even:bg-muted/20"
                      >
                        <td className="p-2 align-top">
                          <input
                            type="date"
                            value={it.fecha}
                            onChange={(e) =>
                              updateItem(idx, { fecha: e.target.value })
                            }
                            className="border rounded px-2 py-1"
                          />
                        </td>

                        <td className="p-2 align-top">
                          <select
                            value={it.tipo}
                            onChange={(e) => {
                              const tipo = e.target.value as Item["tipo"];
                              // coherencia automática: si cambia a festivo/cierre, es_laborable false
                              const autoLaborable =
                                tipo === "festivo_local" ||
                                tipo === "cierre_empresa"
                                  ? false
                                  : true;
                              updateItem(idx, {
                                tipo,
                                es_laborable: autoLaborable,
                              });
                            }}
                            className="border rounded px-2 py-1"
                          >
                            <option value="festivo_local">Festivo</option>
                            <option value="convenio">Convenio / ajuste</option>
                            <option value="laborable_extra">
                              Laborable extra
                            </option>
                            <option value="cierre_empresa">
                              Cierre empresa
                            </option>
                          </select>
                        </td>

                        <td className="p-2 align-top">
                          <select
                            value={it.label || ""}
                            onChange={(e) =>
                              updateItem(idx, { label: e.target.value || null })
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="">—</option>
                            <option value="nacional">Nacional</option>
                            <option value="autonómico">Autonómico</option>
                            <option value="local">Local</option>
                            <option value="convenio">Convenio</option>
                            <option value="cierre">Cierre</option>
                            <option value="extra">Extra</option>
                          </select>
                        </td>

                        <td className="p-2 align-top">
                          <input
                            type="text"
                            value={it.descripcion || ""}
                            onChange={(e) =>
                              updateItem(idx, { descripcion: e.target.value })
                            }
                            className="border rounded px-2 py-1 w-full"
                          />
                          {it.meta?.source_line && (
                            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                              OCR: {it.meta.source_line}
                            </div>
                          )}
                        </td>

                        <td className="p-2 align-top text-center">
                          <input
                            type="checkbox"
                            checked={it.es_laborable}
                            onChange={(e) =>
                              updateItem(idx, {
                                es_laborable: e.target.checked,
                              })
                            }
                          />
                        </td>

                        <td className="p-2 align-top text-center">
                          <input
                            type="checkbox"
                            checked={it.activo !== false}
                            onChange={(e) =>
                              updateItem(idx, { activo: e.target.checked })
                            }
                          />
                        </td>

                        <td className="p-2 align-top text-center">
                          <span
                            className={`${(it.meta?.confidence ?? 1) < 0.6 ? "text-red-600" : ""}`}
                          >
                            {pct(it.meta?.confidence)}
                          </span>
                        </td>

                        <td className="p-2 align-top text-right">
                          <button
                            className="text-sm text-red-600 hover:underline"
                            onClick={() => removeItem(idx)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {preview.length === 0 && (
                      <tr>
                        <td
                          className="p-3 text-sm text-muted-foreground"
                          colSpan={8}
                        >
                          No hay entradas detectadas todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* CTA final (venta): claro, irreversible y con control */}
              <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-muted-foreground">
                  Al confirmar, se guardarán los días <b>activos</b>. Si una
                  fecha ya existe, se actualizará (empresa+fecha).
                </div>

                <Button
                  onClick={handleConfirm}
                  disabled={loading || preview.length === 0}
                >
                  Confirmar importación
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
