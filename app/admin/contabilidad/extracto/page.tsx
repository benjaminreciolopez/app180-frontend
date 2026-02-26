"use client";

import { useState, useCallback } from "react";
import { authenticatedFetch } from "@/utils/api";
import { showSuccess, showError } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type Movimiento = {
  fecha: string;
  concepto: string;
  importe: number;
  match_tipo?: string | null;
  match_id?: string | null;
  match_desc?: string | null;
  confianza?: string;
  selected?: boolean;
};

type Stats = {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  sin_match: number;
};

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("es-ES");
  } catch {
    return d;
  }
};

const CONFIANZA_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  alto: {
    label: "Alto",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  medio: {
    label: "Medio",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  bajo: {
    label: "Bajo",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  sin_match: {
    label: "Sin match",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export default function ExtractoBancarioPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filename, setFilename] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Step 1: Upload & Parse
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await authenticatedFetch(
        "/api/admin/contabilidad/importar-extracto",
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Error procesando extracto");
      }

      const data = await res.json();
      setMovimientos(
        data.movimientos.map((m: Movimiento) => ({ ...m, selected: false }))
      );
      setFilename(data.filename || file.name);
      setStep(2);
      showSuccess(
        `${data.total} movimientos extraídos (${data.ingresos} ingresos, ${data.gastos} gastos)`
      );
    } catch (e: any) {
      showError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  // Step 2: IA Matching
  async function handleMatch() {
    setMatching(true);
    try {
      const res = await authenticatedFetch(
        "/api/admin/contabilidad/extracto/matchear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movimientos }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Error matcheando");
      }

      const data = await res.json();
      setMovimientos(
        data.movimientos.map((m: Movimiento) => ({
          ...m,
          selected: m.confianza === "alto" || m.confianza === "medio",
        }))
      );
      setStats(data.stats);
      setStep(3);
      showSuccess("Matching IA completado");
    } catch (e: any) {
      showError(e.message);
    } finally {
      setMatching(false);
    }
  }

  // Step 3: Confirm & Generate
  async function handleConfirm() {
    const confirmados = movimientos.filter((m) => m.selected && m.match_tipo);
    if (confirmados.length === 0) {
      showError("Selecciona al menos un movimiento con match");
      return;
    }

    setConfirming(true);
    try {
      const res = await authenticatedFetch(
        "/api/admin/contabilidad/extracto/confirmar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmados }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Error confirmando");
      }

      const data = await res.json();
      showSuccess(
        `${data.generados} asientos generados${data.errores.length > 0 ? ` (${data.errores.length} errores)` : ""}`
      );

      // Reset
      setStep(1);
      setMovimientos([]);
      setStats(null);
      setFilename("");
    } catch (e: any) {
      showError(e.message);
    } finally {
      setConfirming(false);
    }
  }

  function toggleMovimiento(idx: number) {
    setMovimientos((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, selected: !m.selected } : m))
    );
  }

  function toggleAll(selected: boolean) {
    setMovimientos((prev) =>
      prev.map((m) => ({
        ...m,
        selected: m.match_tipo ? selected : false,
      }))
    );
  }

  const selectedCount = movimientos.filter((m) => m.selected && m.match_tipo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          Extracto Bancario
        </h1>
        <p className="text-muted-foreground mt-1">
          Importa tu extracto bancario y la IA reconciliará los movimientos
          automáticamente.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-3 text-sm">
        {[
          { n: 1, label: "Subir extracto" },
          { n: 2, label: "Matchear con IA" },
          { n: 3, label: "Confirmar y generar" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= n
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {n}
            </div>
            <span
              className={step >= n ? "font-semibold text-slate-700" : "text-slate-400"}
            >
              {label}
            </span>
            {n < 3 && (
              <ArrowRight className="w-4 h-4 text-slate-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              ) : (
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {uploading
                  ? "Procesando extracto..."
                  : "Arrastra tu extracto bancario aquí"}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Formatos soportados: CSV, Excel (.xlsx), OFX
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                Seleccionar archivo
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.ofx,.qfx"
                  onChange={handleFileInput}
                  disabled={uploading}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Match */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {movimientos.length} movimientos extraídos
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">{filename}</p>
            </div>
            <Button
              onClick={handleMatch}
              disabled={matching}
              className="rounded-xl gap-2"
            >
              {matching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {matching ? "Analizando..." : "Matchear con IA"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right w-32">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.slice(0, 100).map((m, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs font-mono">
                        {fmtDate(m.fecha)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {m.concepto}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold text-sm ${
                          m.importe > 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {fmt.format(m.importe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movimientos.length > 100 && (
                <p className="text-center text-sm text-slate-500 py-2">
                  Mostrando 100 de {movimientos.length} movimientos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results & Confirm */}
      {step === 3 && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: stats.total, color: "bg-slate-50" },
                {
                  label: "Confianza Alta",
                  value: stats.alto,
                  color: "bg-green-50 text-green-700",
                },
                {
                  label: "Confianza Media",
                  value: stats.medio,
                  color: "bg-yellow-50 text-yellow-700",
                },
                {
                  label: "Confianza Baja",
                  value: stats.bajo,
                  color: "bg-orange-50 text-orange-700",
                },
                {
                  label: "Sin Match",
                  value: stats.sin_match,
                  color: "bg-red-50 text-red-700",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl p-3 text-center ${s.color}`}
                >
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Resultados del Matching IA
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedCount} movimientos seleccionados para generar
                  asientos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  className="rounded-xl text-xs"
                >
                  Seleccionar todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  className="rounded-xl text-xs"
                >
                  Deseleccionar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={confirming || selectedCount === 0}
                  className="rounded-xl gap-2"
                >
                  {confirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {confirming
                    ? "Generando..."
                    : `Generar ${selectedCount} asientos`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-24">Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right w-28">
                        Importe
                      </TableHead>
                      <TableHead className="w-52">Match IA</TableHead>
                      <TableHead className="w-28">Confianza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m, idx) => {
                      const conf =
                        CONFIANZA_CONFIG[m.confianza || "sin_match"];
                      return (
                        <TableRow
                          key={idx}
                          className={m.selected ? "bg-blue-50/50" : ""}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={!!m.selected}
                              onChange={() => toggleMovimiento(idx)}
                              disabled={!m.match_tipo}
                              className="w-4 h-4 rounded"
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {fmtDate(m.fecha)}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {m.concepto}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold text-sm ${
                              m.importe > 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {fmt.format(m.importe)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.match_desc || (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs gap-1 ${conf.color}`}
                            >
                              {conf.icon}
                              {conf.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
