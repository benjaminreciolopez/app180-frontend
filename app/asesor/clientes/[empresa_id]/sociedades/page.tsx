"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RentaResumenCard } from "@/components/fiscal/RentaResumenCard";
import { toast } from "sonner";
import {
  Calculator, Loader2, CheckCircle2, Save, FileText,
  ChevronDown, ChevronRight, Building2, TrendingUp,
  PiggyBank, Scale, Percent,
} from "lucide-react";

interface ISData {
  id: string;
  empresa_id: string;
  ejercicio: number;
  estado: string;
  empresa_nombre?: string;
  tipo_contribuyente?: string;
  ingresos_explotacion: number;
  gastos_explotacion: number;
  resultado_explotacion: number;
  ingresos_financieros: number;
  gastos_financieros: number;
  resultado_financiero: number;
  resultado_antes_impuestos: number;
  ajustes_positivos: number;
  ajustes_negativos: number;
  detalle_ajustes: any;
  base_imponible_previa: number;
  compensacion_bin: number;
  base_imponible: number;
  tipo_gravamen: number;
  tipo_aplicado: string;
  cuota_integra: number;
  deduccion_doble_imposicion: number;
  deducciones_id: number;
  bonificaciones: number;
  otras_deducciones: number;
  total_deducciones: number;
  cuota_liquida: number;
  retenciones: number;
  pagos_fraccionados: number;
  cuota_diferencial: number;
  resultado: string;
  importe_resultado: number;
  fecha_limite: string | null;
  fecha_presentacion: string | null;
  csv: string | null;
  numero_justificante: string | null;
  notas: string | null;
}

type Section = "resultados" | "ajustes" | "base" | "cuota" | "deducciones" | "presentacion";

const tiposGravamen: Record<string, string> = {
  general: "General (25%)",
  reducido_pyme: "PYME (23%)",
  reducido_nueva_empresa: "Nueva empresa (15%)",
  microempresa: "Microempresa (23%)",
};

export default function ClienteSociedadesPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState<ISData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<Section>>(new Set(["resultados"]));
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [presenting, setPresenting] = useState(false);
  const [presentForm, setPresentForm] = useState({ csv: "", numero_justificante: "" });

  const toggleSection = (s: Section) => {
    const next = new Set(expanded);
    next.has(s) ? next.delete(s) : next.add(s);
    setExpanded(next);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sociedades/${ejercicio}`);
      if (!res.ok) throw new Error("Error al cargar");
      const json = await res.json();
      setData(json.data);
      setEdits({});
    } catch (err: any) {
      toast.error(err.message || "Error al cargar IS");
    } finally {
      setLoading(false);
    }
  }, [empresaId, ejercicio]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCalc = async () => {
    try {
      setCalculating(true);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sociedades/${ejercicio}/calcular`, { method: "POST" });
      if (!res.ok) throw new Error("Error al calcular");
      const json = await res.json();
      setData(json.data);
      setEdits({});
      toast.success("Impuesto de Sociedades calculado");
    } catch (err: any) {
      toast.error(err.message || "Error al calcular");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (Object.keys(edits).length === 0) return;
    try {
      setSaving(true);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sociedades/${ejercicio}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const json = await res.json();
      setData(json.data);
      setEdits({});
      toast.success("Cambios guardados");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handlePresent = async () => {
    try {
      setPresenting(true);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sociedades/${ejercicio}/presentar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentForm),
      });
      if (!res.ok) throw new Error("Error al marcar como presentado");
      const json = await res.json();
      setData(json.data);
      toast.success("IS marcado como presentado");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setPresenting(false);
    }
  };

  const setEdit = (field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [field]: value }));
  };

  const getVal = (field: keyof ISData) => {
    if (edits[field] !== undefined) return edits[field];
    return data ? (data[field] as number) || 0 : 0;
  };

  if (loading) return <LoadingSpinner fullPage />;

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: "resultados", label: "Cuenta de Resultados", icon: Building2 },
    { id: "ajustes", label: "Ajustes Extracontables", icon: Scale },
    { id: "base", label: "Base Imponible", icon: TrendingUp },
    { id: "cuota", label: "Tipo de Gravamen y Cuota", icon: Percent },
    { id: "deducciones", label: "Deducciones y Bonificaciones", icon: PiggyBank },
    { id: "presentacion", label: "Presentacion (Modelo 200)", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Impuesto de Sociedades {ejercicio}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.empresa_nombre || "Cliente"} - Modelo 200
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ejercicio.toString()} onValueChange={(v) => setEjercicio(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {Object.keys(edits).length > 0 && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          )}
          <Button onClick={handleCalc} disabled={calculating} size="sm" variant="default">
            {calculating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}
            Calcular
          </Button>
        </div>
      </div>

      {/* Resumen card */}
      {data && <RentaResumenCard data={data} tipo="sociedades" />}

      {/* Fecha limite */}
      {data?.fecha_limite && (
        <div className="text-sm text-muted-foreground">
          Fecha limite de presentacion: <span className="font-medium text-foreground">{data.fecha_limite}</span>
        </div>
      )}

      {/* Sections */}
      {sections.map((sec) => (
        <Card key={sec.id}>
          <CardHeader
            className="cursor-pointer select-none py-3"
            onClick={() => toggleSection(sec.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <sec.icon className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">{sec.label}</CardTitle>
              </div>
              {expanded.has(sec.id)
                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />
              }
            </div>
          </CardHeader>
          {expanded.has(sec.id) && (
            <CardContent className="pt-0 pb-4">
              {sec.id === "resultados" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRO label="Ingresos explotacion (facturas)" value={data?.ingresos_explotacion} />
                  <FieldRO label="Gastos explotacion" value={data?.gastos_explotacion} />
                  <FieldRO label="Resultado explotacion" value={data?.resultado_explotacion} highlight />
                  <div />
                  <FieldEdit label="Ingresos financieros" field="ingresos_financieros" value={getVal("ingresos_financieros")} onChange={setEdit} />
                  <FieldEdit label="Gastos financieros" field="gastos_financieros" value={getVal("gastos_financieros")} onChange={setEdit} />
                  <FieldRO label="Resultado financiero" value={data?.resultado_financiero} />
                  <FieldRO label="Resultado antes de impuestos" value={data?.resultado_antes_impuestos} highlight />
                </div>
              )}
              {sec.id === "ajustes" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEdit label="Ajustes positivos" field="ajustes_positivos" value={getVal("ajustes_positivos")} onChange={setEdit} />
                  <FieldEdit label="Ajustes negativos" field="ajustes_negativos" value={getVal("ajustes_negativos")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "base" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRO label="Base imponible previa" value={data?.base_imponible_previa} />
                  <FieldEdit label="Compensacion BINs anteriores" field="compensacion_bin" value={getVal("compensacion_bin")} onChange={setEdit} />
                  <FieldRO label="Base imponible" value={data?.base_imponible} highlight />
                </div>
              )}
              {sec.id === "cuota" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo aplicado</Label>
                    <Select
                      value={edits.tipo_aplicado ?? data?.tipo_aplicado ?? "general"}
                      onValueChange={(v) => setEdit("tipo_aplicado", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tiposGravamen).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldRO label="Tipo gravamen (%)" value={data?.tipo_gravamen} isPct />
                  <FieldRO label="Cuota integra" value={data?.cuota_integra} highlight />
                </div>
              )}
              {sec.id === "deducciones" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEdit label="Doble imposicion" field="deduccion_doble_imposicion" value={getVal("deduccion_doble_imposicion")} onChange={setEdit} />
                  <FieldEdit label="I+D+i" field="deducciones_id" value={getVal("deducciones_id")} onChange={setEdit} />
                  <FieldEdit label="Bonificaciones" field="bonificaciones" value={getVal("bonificaciones")} onChange={setEdit} />
                  <FieldEdit label="Otras deducciones" field="otras_deducciones" value={getVal("otras_deducciones")} onChange={setEdit} />
                  <FieldRO label="Total deducciones" value={data?.total_deducciones} />
                  <FieldRO label="Cuota liquida" value={data?.cuota_liquida} highlight />
                  <FieldRO label="Retenciones soportadas" value={data?.retenciones} />
                  <FieldRO label="Pagos fraccionados (mod 202)" value={data?.pagos_fraccionados} />
                </div>
              )}
              {sec.id === "presentacion" && data?.estado !== "presentado" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">CSV</Label>
                      <Input
                        value={presentForm.csv}
                        onChange={(e) => setPresentForm((p) => ({ ...p, csv: e.target.value }))}
                        placeholder="CSV de la declaracion"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Numero justificante</Label>
                      <Input
                        value={presentForm.numero_justificante}
                        onChange={(e) => setPresentForm((p) => ({ ...p, numero_justificante: e.target.value }))}
                        placeholder="Justificante AEAT"
                      />
                    </div>
                  </div>
                  <FieldEdit label="Notas" field="notas" value={edits.notas ?? data?.notas ?? ""} onChange={setEdit} isText />
                  <Button onClick={handlePresent} disabled={presenting || !data?.id} variant="default">
                    {presenting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Marcar como presentado
                  </Button>
                </div>
              )}
              {sec.id === "presentacion" && data?.estado === "presentado" && (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2"><span className="text-muted-foreground">Fecha:</span> <span>{data.fecha_presentacion}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground">CSV:</span> <span>{data.csv || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground">Justificante:</span> <span>{data.numero_justificante || "-"}</span></div>
                  <Badge variant="default" className="bg-green-600 text-white">Presentado</Badge>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function FieldRO({ label, value, highlight, isPct }: { label: string; value: number | null | undefined; highlight?: boolean; isPct?: boolean }) {
  const formatted = isPct ? `${value || 0}%` : formatCurrency(value || 0);
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={`text-sm ${highlight ? "font-bold text-foreground" : "font-medium"}`}>{formatted}</p>
    </div>
  );
}

function FieldEdit({
  label, field, value, onChange, isText,
}: {
  label: string; field: string; value: any; onChange: (f: string, v: any) => void; isText?: boolean;
}) {
  if (isText) {
    return (
      <div className="md:col-span-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea value={value || ""} onChange={(e) => onChange(field, e.target.value)} rows={2} className="mt-1" />
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)} className="mt-1" />
    </div>
  );
}
