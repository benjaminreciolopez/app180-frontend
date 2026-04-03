"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RentaResumenCard } from "@/components/fiscal/RentaResumenCard";
import { EscalaIRPF } from "@/components/fiscal/EscalaIRPF";
import { toast } from "sonner";
import {
  Calculator, Loader2, CheckCircle2, Save, FileText,
  ChevronDown, ChevronRight, Briefcase, Home, PiggyBank,
  TrendingUp, Wallet, Heart,
} from "lucide-react";

interface RentaData {
  id: string;
  empresa_id: string;
  ejercicio: number;
  estado: string;
  empresa_nombre?: string;
  tipo_contribuyente?: string;
  // Actividad
  ingresos_actividad: number;
  gastos_deducibles_actividad: number;
  rendimiento_neto_actividad: number;
  gastos_dificil_justificacion: number;
  rendimiento_neto_reducido_actividad: number;
  reduccion_rendimiento_irregular: number;
  // Trabajo
  rendimientos_trabajo: number;
  retenciones_trabajo: number;
  // Inmobiliario
  ingresos_alquiler: number;
  gastos_alquiler: number;
  rendimiento_inmobiliario: number;
  reduccion_alquiler_vivienda: number;
  // Mobiliario
  intereses_cuentas: number;
  dividendos: number;
  otros_mobiliario: number;
  // Patrimoniales
  ganancias_patrimoniales: number;
  perdidas_patrimoniales: number;
  // Bases
  base_imponible_general: number;
  base_imponible_ahorro: number;
  base_liquidable_general: number;
  base_liquidable_ahorro: number;
  // Reducciones
  reduccion_tributacion_conjunta: number;
  aportaciones_planes_pensiones: number;
  otras_reducciones: number;
  // Cuotas
  cuota_integra_estatal: number;
  cuota_integra_autonomica: number;
  cuota_integra_total: number;
  // Deducciones
  deduccion_vivienda_habitual: number;
  deduccion_maternidad: number;
  deduccion_familia_numerosa: number;
  deducciones_autonomicas: number;
  otras_deducciones: number;
  total_deducciones: number;
  // Resultado
  cuota_liquida: number;
  retenciones_pagos_cuenta: number;
  pagos_fraccionados: number;
  cuota_diferencial: number;
  resultado: string;
  importe_resultado: number;
  // Presentacion
  fecha_presentacion: string | null;
  csv: string | null;
  numero_justificante: string | null;
  notas: string | null;
}

type Section = "actividad" | "trabajo" | "inmobiliario" | "mobiliario" | "patrimonial" | "reducciones" | "deducciones" | "presentacion";

export default function ClienteRentaPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState<RentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<Section>>(new Set(["actividad"]));
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
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/renta/${ejercicio}`);
      if (!res.ok) throw new Error("Error al cargar");
      const json = await res.json();
      setData(json.data);
      setEdits({});
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la renta");
    } finally {
      setLoading(false);
    }
  }, [empresaId, ejercicio]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCalc = async () => {
    try {
      setCalculating(true);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/renta/${ejercicio}/calcular`, { method: "POST" });
      if (!res.ok) throw new Error("Error al calcular");
      const json = await res.json();
      setData(json.data);
      setEdits({});
      toast.success("Renta IRPF calculada correctamente");
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
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/renta/${ejercicio}`, {
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
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/renta/${ejercicio}/presentar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentForm),
      });
      if (!res.ok) throw new Error("Error al marcar como presentada");
      const json = await res.json();
      setData(json.data);
      toast.success("Renta marcada como presentada");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setPresenting(false);
    }
  };

  const setEdit = (field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [field]: value }));
  };

  const getVal = (field: keyof RentaData) => {
    if (edits[field] !== undefined) return edits[field];
    return data ? (data[field] as number) || 0 : 0;
  };

  if (loading) return <LoadingSpinner fullPage />;

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: "actividad", label: "Rendimientos Actividad Economica", icon: Briefcase },
    { id: "trabajo", label: "Rendimientos del Trabajo", icon: Wallet },
    { id: "inmobiliario", label: "Rendimientos Capital Inmobiliario", icon: Home },
    { id: "mobiliario", label: "Rendimientos Capital Mobiliario", icon: PiggyBank },
    { id: "patrimonial", label: "Ganancias y Perdidas Patrimoniales", icon: TrendingUp },
    { id: "reducciones", label: "Reducciones", icon: Heart },
    { id: "deducciones", label: "Deducciones", icon: FileText },
    { id: "presentacion", label: "Presentacion", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Renta IRPF {ejercicio}</h1>
          <p className="text-sm text-muted-foreground">
            {data?.empresa_nombre || "Cliente"} - Declaracion de la renta
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
      {data && <RentaResumenCard data={data} tipo="irpf" />}

      {/* Escala visual */}
      {data && data.base_liquidable_general > 0 && (
        <EscalaIRPF baseLiquidable={data.base_liquidable_general} />
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
              {sec.id === "actividad" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldReadOnly label="Ingresos actividad (facturas)" value={data?.ingresos_actividad} />
                  <FieldReadOnly label="Gastos deducibles" value={data?.gastos_deducibles_actividad} />
                  <FieldReadOnly label="Rendimiento neto actividad" value={data?.rendimiento_neto_actividad} />
                  <FieldReadOnly label="Gastos dificil justificacion (5%)" value={data?.gastos_dificil_justificacion} />
                  <FieldReadOnly label="Rendimiento neto reducido" value={data?.rendimiento_neto_reducido_actividad} />
                  <FieldEditable label="Reduccion rend. irregular" field="reduccion_rendimiento_irregular" value={getVal("reduccion_rendimiento_irregular")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "trabajo" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Rendimientos del trabajo" field="rendimientos_trabajo" value={getVal("rendimientos_trabajo")} onChange={setEdit} />
                  <FieldEditable label="Retenciones trabajo" field="retenciones_trabajo" value={getVal("retenciones_trabajo")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "inmobiliario" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Ingresos alquiler" field="ingresos_alquiler" value={getVal("ingresos_alquiler")} onChange={setEdit} />
                  <FieldEditable label="Gastos alquiler" field="gastos_alquiler" value={getVal("gastos_alquiler")} onChange={setEdit} />
                  <FieldReadOnly label="Rendimiento inmobiliario" value={data?.rendimiento_inmobiliario} />
                  <FieldEditable label="Reduccion alquiler vivienda (60%)" field="reduccion_alquiler_vivienda" value={getVal("reduccion_alquiler_vivienda")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "mobiliario" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Intereses cuentas" field="intereses_cuentas" value={getVal("intereses_cuentas")} onChange={setEdit} />
                  <FieldEditable label="Dividendos" field="dividendos" value={getVal("dividendos")} onChange={setEdit} />
                  <FieldEditable label="Otros mobiliario" field="otros_mobiliario" value={getVal("otros_mobiliario")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "patrimonial" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Ganancias patrimoniales" field="ganancias_patrimoniales" value={getVal("ganancias_patrimoniales")} onChange={setEdit} />
                  <FieldEditable label="Perdidas patrimoniales" field="perdidas_patrimoniales" value={getVal("perdidas_patrimoniales")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "reducciones" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Tributacion conjunta" field="reduccion_tributacion_conjunta" value={getVal("reduccion_tributacion_conjunta")} onChange={setEdit} />
                  <FieldEditable label="Planes de pensiones (max 1.500)" field="aportaciones_planes_pensiones" value={getVal("aportaciones_planes_pensiones")} onChange={setEdit} />
                  <FieldEditable label="Otras reducciones" field="otras_reducciones" value={getVal("otras_reducciones")} onChange={setEdit} />
                </div>
              )}
              {sec.id === "deducciones" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldEditable label="Vivienda habitual" field="deduccion_vivienda_habitual" value={getVal("deduccion_vivienda_habitual")} onChange={setEdit} />
                  <FieldEditable label="Maternidad" field="deduccion_maternidad" value={getVal("deduccion_maternidad")} onChange={setEdit} />
                  <FieldEditable label="Familia numerosa" field="deduccion_familia_numerosa" value={getVal("deduccion_familia_numerosa")} onChange={setEdit} />
                  <FieldEditable label="Deducciones autonomicas" field="deducciones_autonomicas" value={getVal("deducciones_autonomicas")} onChange={setEdit} />
                  <FieldEditable label="Otras deducciones" field="otras_deducciones" value={getVal("otras_deducciones")} onChange={setEdit} />
                  <FieldReadOnly label="Total deducciones" value={data?.total_deducciones} />
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
                  <FieldEditable label="Notas" field="notas" value={edits.notas ?? data?.notas ?? ""} onChange={setEdit} isText />
                  <Button onClick={handlePresent} disabled={presenting || !data?.id} variant="default">
                    {presenting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Marcar como presentada
                  </Button>
                </div>
              )}
              {sec.id === "presentacion" && data?.estado === "presentado" && (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2"><span className="text-muted-foreground">Fecha:</span> <span>{data.fecha_presentacion}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground">CSV:</span> <span>{data.csv || "-"}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground">Justificante:</span> <span>{data.numero_justificante || "-"}</span></div>
                  <Badge variant="default" className="bg-green-600 text-white">Presentada</Badge>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function FieldReadOnly({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{formatCurrency(value || 0)}</p>
    </div>
  );
}

function FieldEditable({
  label, field, value, onChange, isText,
}: {
  label: string; field: string; value: any; onChange: (field: string, val: any) => void; isText?: boolean;
}) {
  if (isText) {
    return (
      <div className="md:col-span-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(field, e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
}
