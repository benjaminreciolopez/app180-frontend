"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileUp, 
  Search, 
  Calendar, 
  Trash2, 
  Plus, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  FileText,
  Loader2,
  ChevronRight,
  Info,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pdfToPngFiles } from "@/lib/pdfToImages";
import { ocrPreview, ocrReparse, ocrConfirm } from "@/services/calendarioOCR";
import { showSuccess, showError } from "@/lib/toast";
import { es } from "date-fns/locale";
import { format } from "date-fns";

type Meta = {
  confidence?: number;
  reason?: string;
  source_line?: string;
};

type Tipo = "festivo_local" | "convenio" | "laborable_extra" | "cierre_empresa";

type Item = {
  fecha: string;
  tipo: Tipo;
  descripcion: string | null;
  es_laborable: boolean;
  activo: boolean;
  label?: string | null; // nacional/autonómico/local/convenio/etc.
  origen?: "ocr" | "manual";
  meta?: Meta;
};

function pct(n?: number) {
  if (typeof n !== "number") return "—";
  return `${Math.round(n * 100)}%`;
}

function ymdToday() {
  return new Date().toISOString().slice(0, 10);
}

function autoLaborableForTipo(tipo: Tipo) {
  return !(tipo === "festivo_local" || tipo === "cierre_empresa");
}

function confidenceClass(c?: number) {
  const v = typeof c === "number" ? c : 1;
  if (v < 0.6) return "text-red-600";
  if (v < 0.8) return "text-amber-600";
  return "text-foreground";
}

export default function ImportarCalendarioLaboralPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");

  const [rawText, setRawText] = useState<string>("");
  const [preview, setPreview] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview"); // móvil

  function resetWorkspace() {
    setRawText("");
    setPreview([]);
    setStage("");
    setActiveTab("preview");
  }

  function onPickFile(f: File | null) {
    setFile(f);
    // Reset total al cambiar archivo (evita mezclas y errores)
    resetWorkspace();
  }

  const stats = useMemo(() => {
    const total = preview.length;
    const activeCount = preview.filter((x) => x.activo !== false).length;
    const disabledCount = total - activeCount;

    const festivos = preview.filter((x) => x.tipo === "festivo_local").length;
    const convenios = preview.filter((x) => x.tipo === "convenio").length;
    const cierres = preview.filter((x) => x.tipo === "cierre_empresa").length;
    const extras = preview.filter((x) => x.tipo === "laborable_extra").length;

    const lowConfidence = preview.filter(
      (x) => (x.meta?.confidence ?? 1) < 0.6,
    ).length;
    const manualCount = preview.filter((x) => x.origen === "manual").length;

    return {
      total,
      activeCount,
      disabledCount,
      festivos,
      convenios,
      cierres,
      extras,
      lowConfidence,
      manualCount,
    };
  }, [preview]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setPreview((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };

        // coherencia automática: si cambia tipo a festivo/cierre → no laborable
        if (patch.tipo) {
          next.es_laborable = autoLaborableForTipo(patch.tipo);
          // si pasa a festivo y no hay label, pon local por defecto (editable)
          if (patch.tipo === "festivo_local" && !next.label)
            next.label = "local";
          // si pasa a convenio/cierre/extra, limpiamos label si era ámbito
          if (
            patch.tipo !== "festivo_local" &&
            (next.label === "nacional" ||
              next.label === "autonómico" ||
              next.label === "local")
          ) {
            next.label =
              patch.tipo === "convenio"
                ? "convenio"
                : patch.tipo === "cierre_empresa"
                  ? "cierre"
                  : "extra";
          }
        }

        // Si el usuario marca manualmente laborable en festivo, lo respetamos si viene explícito
        if (typeof patch.es_laborable === "boolean")
          next.es_laborable = patch.es_laborable;

        // Si editan la fila, mantenemos origen si ya estaba
        next.origen = next.origen || "ocr";

        return next;
      }),
    );
  }

  function removeItem(idx: number) {
    setPreview((prev) => prev.filter((_, i) => i !== idx));
  }

  function addManualRow() {
    setPreview((prev) => [
      ...prev,
      {
        fecha: ymdToday(),
        tipo: "festivo_local",
        descripcion: "",
        es_laborable: false,
        activo: true,
        label: "local",
        origen: "manual",
        meta: { confidence: 1, reason: "manual" },
      },
    ]);
    setActiveTab("preview");
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
      // Marcamos origen OCR en items por consistencia
      const items: Item[] = (res.preview || []).map((it: any) => ({
        ...it,
        origen: "ocr",
      }));
      setPreview(items);

      setActiveTab("preview");
    } catch (e: any) {
      showError(e?.response?.data?.error || e?.message || "Error OCR");
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  async function handleReparse() {
    try {
      if (!rawText || rawText.trim().length < 20) {
        showError("El texto OCR está vacío o demasiado corto.");
        return;
      }
      setLoading(true);
      setStage("Re-analizando texto…");
      const res = await ocrReparse(rawText);
      const items: Item[] = (res.preview || []).map((it: any) => ({
        ...it,
        origen: "ocr",
      }));
      setPreview(items);
      setActiveTab("preview");
    } catch (e: any) {
      showError(e?.response?.data?.error || e?.message || "Error reparse");
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  async function handleConfirm() {
    try {
      if (loading) return;
      if (preview.length === 0) {
        showError("No hay entradas para confirmar.");
        return;
      }

      const activeItems = preview.filter((x) => x.activo !== false);

      if (activeItems.length === 0) {
        showError(
          "Todas las entradas están desactivadas. Activa al menos una antes de confirmar.",
        );
        return;
      }

      setLoading(true);
      setStage("Guardando en calendario…");

      await ocrConfirm({
        items: activeItems.map((x) => ({
          ...x,
          origen: x.origen === "manual" ? "manual" : "ocr",
        })),
        raw_text: rawText,
      });

      showSuccess("Importación completada. El calendario ha sido actualizado.");
      setFile(null);
      resetWorkspace();

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      showError(e?.response?.data?.error || e?.message || "Error al confirmar");
    } finally {
      setLoading(false);
      setStage("");
    }
  }
  const canReparse = !loading && rawText.trim().length >= 20;
  const canConfirm = !loading && preview.length > 0 && stats.activeCount > 0;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Configuración</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Importar Calendario Laboral</h1>
          <p className="text-slate-500 max-w-2xl">
            Sube el calendario oficial en PDF o imagen. Nuestra IA detectará automáticamente festivos, 
            días de convenio y cierres para mantener sincronizada a toda la empresa.
          </p>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl border-slate-200">
             Volver
           </Button>
        </div>
      </motion.div>

      {/* Card: uploader */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">1. Subir Documento</CardTitle>
                  <CardDescription>PDF (máx. 12 págs.) o Imágenes nítidas</CardDescription>
                </div>
              </div>
              
              {file && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 py-1 px-3 rounded-full flex items-center gap-2">
                   <FileText className="w-3.5 h-3.5" />
                   {file.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <div 
                  className={`
                    border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer
                    ${file ? "border-blue-400 bg-blue-50/30" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"}
                  `}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 ${loading ? "animate-pulse" : "group-hover:scale-110"}`}>
                    {file ? (
                      <div className="relative">
                        <FileText className="w-12 h-12 text-blue-600" />
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <FileUp className="w-12 h-12 text-slate-300" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-700">{file ? file.name : "Selecciona o arrastra el archivo"}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Formatos soportados: PDF, JPG, PNG"}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!file || loading}
                  className="h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/20 w-full group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      {stage || "Procesando..."}
                    </>
                  ) : (
                    <>
                      COMENZAR ANÁLISIS IA
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                
                {file && !loading && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                        setFile(null);
                        resetWorkspace();
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Quitar archivo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {(rawText || preview.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">2. Revisión Asistida</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {stats.total} días detectados • 
                        <span className="text-green-600 font-medium">{stats.activeCount} activos</span> •
                        <span className="text-slate-400">{stats.disabledCount} ignorados</span>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={addManualRow} className="rounded-xl border-slate-200 bg-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Fila
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReparse} disabled={!canReparse} className="rounded-xl border-slate-200 bg-white">
                      <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                      Reanalizar OCR
                    </Button>
                    <Button onClick={handleConfirm} disabled={!canConfirm} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar e Importar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Tabs defaultValue="preview" className="w-full">
                  <div className="px-6 py-2 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <TabsList className="bg-slate-200/50 p-1 rounded-lg">
                      <TabsTrigger value="preview" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Vista Previa
                      </TabsTrigger>
                      <TabsTrigger value="editor" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Texto Original (OCR)
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="hidden md:flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1"><Badge variant="outline" className="h-2 w-2 p-0 rounded-full bg-blue-500 border-none" /> Festivos: {stats.festivos}</span>
                      <span className="flex items-center gap-1"><Badge variant="outline" className="h-2 w-2 p-0 rounded-full bg-amber-500 border-none" /> Convenio: {stats.convenios}</span>
                      <span className="flex items-center gap-1"><Badge variant="outline" className="h-2 w-2 p-0 rounded-full bg-red-500 border-none" /> Cierres: {stats.cierres}</span>
                    </div>
                  </div>

                  <TabsContent value="preview" className="m-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="w-[150px] font-bold text-slate-700">Fecha</TableHead>
                            <TableHead className="w-[180px] font-bold text-slate-700">Categoría</TableHead>
                            <TableHead className="w-[150px] font-bold text-slate-700">Ámbito</TableHead>
                            <TableHead className="font-bold text-slate-700">Descripción / Motivo</TableHead>
                            <TableHead className="w-[100px] text-center font-bold text-slate-700">Laborable</TableHead>
                            <TableHead className="w-[80px] text-center font-bold text-slate-700">Activo</TableHead>
                            <TableHead className="w-[100px] text-center font-bold text-slate-700">IA Conf.</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {preview.map((it, idx) => {
                              const conf = it.meta?.confidence ?? (it.origen === "manual" ? 1 : 0.9);
                              const isLow = conf < 0.6;
                              
                              return (
                                <motion.tr 
                                  key={idx}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`group transition-colors ${it.activo === false ? "opacity-50 grayscale bg-slate-50/30" : isLow ? "bg-amber-50/30" : "hover:bg-slate-50/50"}`}
                                >
                                  <TableCell className="py-3">
                                    <Input
                                      type="date"
                                      value={it.fecha}
                                      onChange={(e) => updateItem(idx, { fecha: e.target.value })}
                                      className="h-9 rounded-lg border-slate-200 focus:ring-blue-500"
                                    />
                                  </TableCell>
                                  
                                  <TableCell>
                                    <Select 
                                      value={it.tipo} 
                                      onValueChange={(val) => updateItem(idx, { tipo: val as Tipo })}
                                    >
                                      <SelectTrigger className="h-9 rounded-lg border-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="festivo_local">Festivo</SelectItem>
                                        <SelectItem value="convenio">Convenio / Ajuste</SelectItem>
                                        <SelectItem value="laborable_extra">Laborable Extra</SelectItem>
                                        <SelectItem value="cierre_empresa">Cierre Empresa</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  <TableCell>
                                    <Select 
                                      value={it.label || "none"} 
                                      onValueChange={(val) => updateItem(idx, { label: val === "none" ? null : val })}
                                    >
                                      <SelectTrigger className="h-9 rounded-lg border-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        <SelectItem value="nacional">Nacional</SelectItem>
                                        <SelectItem value="autonómico">Autonómico</SelectItem>
                                        <SelectItem value="local">Local</SelectItem>
                                        <SelectItem value="convenio">Convenio</SelectItem>
                                        <SelectItem value="cierre">Cierre</SelectItem>
                                        <SelectItem value="extra">Extra</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  <TableCell>
                                    <div className="space-y-1">
                                      <Input
                                        value={it.descripcion || ""}
                                        onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                                        className="h-9 rounded-lg border-slate-200 focus:ring-blue-500"
                                        placeholder="Descripción del día..."
                                      />
                                      {it.meta?.source_line && (
                                        <p className="text-[10px] text-slate-400 font-mono line-clamp-1 italic px-1">
                                          Original: "{it.meta.source_line}"
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={it.es_laborable}
                                      onCheckedChange={(val) => updateItem(idx, { es_laborable: !!val })}
                                      className="rounded-md border-slate-300"
                                    />
                                  </TableCell>

                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={it.activo !== false}
                                      onCheckedChange={(val) => updateItem(idx, { activo: !!val })}
                                      className="rounded-md border-slate-300"
                                    />
                                  </TableCell>

                                  <TableCell className="text-center">
                                    <Badge 
                                      variant="secondary" 
                                      className={`
                                        rounded-lg px-2 py-0.5 text-[10px] font-bold
                                        ${it.origen === "manual" ? "bg-slate-100 text-slate-600" : 
                                          isLow ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}
                                      `}
                                    >
                                      {it.origen === "manual" ? "MANUAL" : pct(conf)}
                                    </Badge>
                                  </TableCell>

                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeItem(idx)}
                                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                          
                          {preview.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="py-20 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                  <AlertCircle className="w-8 h-8 opacity-20" />
                                  <p>No hay entradas detectadas todavía.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="editor" className="m-0">
                    <div className="p-6 bg-slate-900 min-h-[400px]">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-4 border-b border-white/10 pb-2">
                        <FileText className="w-3.5 h-3.5" />
                        BUFFER_TEXT_DETECTION_RAW
                      </div>
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="w-full h-[500px] bg-transparent text-blue-200 font-mono text-sm leading-relaxed outline-none resize-none scrollbar-thin scrollbar-thumb-white/10"
                        placeholder="El texto detectado aparecerá aquí..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              
              <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Se guardarán solo las filas marcadas como <b>activas</b>. Las filas con baja confianza están resaltadas en ámbar.</span>
                </div>
                
                {stats.lowConfidence > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-lg px-3 py-1">
                    <AlertCircle className="w-3.5 h-3.5 mr-2" />
                    Requiere revisión: {stats.lowConfidence} días
                  </Badge>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}