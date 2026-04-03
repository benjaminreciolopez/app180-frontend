"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Empleado {
  id: string;
  nombre: string;
}

interface Contrato {
  id: string;
  employee_id: string;
  tipo_contrato: string;
  nombre_empleado: string;
  estado: string;
}

interface BajaData {
  id?: string;
  employee_id: string;
  contrato_id: string | null;
  tipo_baja: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  diagnostico: string | null;
  codigo_diagnostico: string | null;
  base_reguladora: number | null;
  porcentaje_prestacion: number | null;
  importe_diario: number | null;
  pagador: string;
  mutua: string | null;
  siguiente_revision: string | null;
  notas: string | null;
  [key: string]: unknown;
}

interface Props {
  empresaId: string;
  empleados: Empleado[];
  contratos: Contrato[];
  baja: BajaData | null;
  onSaved: () => void;
  onCancel: () => void;
}

const tiposBaja = [
  { value: "enfermedad_comun", label: "Enfermedad Comun" },
  { value: "accidente_laboral", label: "Accidente Laboral" },
  { value: "accidente_no_laboral", label: "Accidente No Laboral" },
  { value: "enfermedad_profesional", label: "Enfermedad Profesional" },
  { value: "maternidad", label: "Maternidad" },
  { value: "paternidad", label: "Paternidad" },
  { value: "riesgo_embarazo", label: "Riesgo durante el Embarazo" },
];

const pagadorOptions = [
  { value: "empresa", label: "Empresa" },
  { value: "inss", label: "INSS" },
  { value: "mutua", label: "Mutua" },
];

export default function BajaTracker({ empresaId, empleados, contratos, baja, onSaved, onCancel }: Props) {
  const isEdit = !!baja?.id;

  const [form, setForm] = useState({
    employee_id: baja?.employee_id || "",
    contrato_id: baja?.contrato_id || "",
    tipo_baja: baja?.tipo_baja || "enfermedad_comun",
    fecha_inicio: baja?.fecha_inicio ? String(baja.fecha_inicio).substring(0, 10) : "",
    fecha_fin: baja?.fecha_fin ? String(baja.fecha_fin).substring(0, 10) : "",
    diagnostico: baja?.diagnostico || "",
    codigo_diagnostico: baja?.codigo_diagnostico || "",
    base_reguladora: baja?.base_reguladora || "",
    porcentaje_prestacion: baja?.porcentaje_prestacion || "",
    importe_diario: baja?.importe_diario || "",
    pagador: baja?.pagador || "empresa",
    mutua: baja?.mutua || "",
    siguiente_revision: baja?.siguiente_revision ? String(baja.siguiente_revision).substring(0, 10) : "",
    notas: baja?.notas || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filter contratos for selected employee
  const contratosEmpleado = contratos.filter(
    (c) => c.employee_id === form.employee_id && c.estado === "vigente"
  );

  // Auto-calculate prestacion % based on tipo_baja
  function handleTipoBajaChange(tipo: string) {
    let porcentaje = "";
    if (tipo === "enfermedad_comun") porcentaje = "60"; // starts at 60%, 75% after day 21
    if (tipo === "accidente_laboral" || tipo === "enfermedad_profesional") porcentaje = "75";
    if (tipo === "maternidad" || tipo === "paternidad") porcentaje = "100";
    if (tipo === "riesgo_embarazo") porcentaje = "100";
    setForm((prev) => ({ ...prev, tipo_baja: tipo, porcentaje_prestacion: porcentaje }));
  }

  // Auto-calculate importe_diario from base_reguladora and porcentaje
  function handleBaseReguladoraChange(val: string) {
    const base = parseFloat(val) || 0;
    const pct = parseFloat(String(form.porcentaje_prestacion)) || 0;
    const diario = base > 0 && pct > 0 ? Math.round((base / 30) * (pct / 100) * 100) / 100 : "";
    setForm((prev) => ({
      ...prev,
      base_reguladora: val as unknown as string,
      importe_diario: diario,
    }));
  }

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.employee_id) {
      setError("Selecciona un empleado");
      return;
    }
    if (!form.tipo_baja || !form.fecha_inicio) {
      setError("Tipo de baja y fecha de inicio son requeridos");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/asesor/clientes/${empresaId}/bajas/${baja!.id}`
        : `/asesor/clientes/${empresaId}/bajas`;

      const res = await authenticatedFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contrato_id: form.contrato_id || null,
          fecha_fin: form.fecha_fin || null,
          diagnostico: form.diagnostico || null,
          codigo_diagnostico: form.codigo_diagnostico || null,
          base_reguladora: form.base_reguladora || null,
          porcentaje_prestacion: form.porcentaje_prestacion || null,
          importe_diario: form.importe_diario || null,
          mutua: form.mutua || null,
          siguiente_revision: form.siguiente_revision || null,
          notas: form.notas || null,
        }),
      });

      if (res.ok) {
        onSaved();
      } else {
        const json = await res.json();
        setError(json.error || "Error guardando baja");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  // Timeline info
  const showTimeline = form.tipo_baja === "enfermedad_comun" && form.fecha_inicio;
  const diasTranscurridos = form.fecha_inicio
    ? Math.ceil(
        (new Date().getTime() - new Date(form.fecha_inicio).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {/* Timeline for enfermedad comun */}
      {showTimeline && diasTranscurridos > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
          <p className="text-sm font-medium">Cronologia IT (Enfermedad Comun)</p>
          <div className="grid grid-cols-4 gap-1 text-xs">
            <div className={`p-2 rounded text-center ${diasTranscurridos <= 3 ? "bg-blue-200 dark:bg-blue-800 font-bold" : "bg-muted"}`}>
              <p>Dias 1-3</p>
              <p className="text-muted-foreground">Sin prestacion</p>
              <p>Empresa paga</p>
            </div>
            <div className={`p-2 rounded text-center ${diasTranscurridos > 3 && diasTranscurridos <= 15 ? "bg-blue-200 dark:bg-blue-800 font-bold" : "bg-muted"}`}>
              <p>Dias 4-15</p>
              <p className="text-muted-foreground">60% BR</p>
              <p>Empresa paga</p>
            </div>
            <div className={`p-2 rounded text-center ${diasTranscurridos > 15 && diasTranscurridos <= 20 ? "bg-orange-200 dark:bg-orange-800 font-bold" : "bg-muted"}`}>
              <p>Dias 16-20</p>
              <p className="text-muted-foreground">60% BR</p>
              <p>INSS paga</p>
            </div>
            <div className={`p-2 rounded text-center ${diasTranscurridos > 20 ? "bg-green-200 dark:bg-green-800 font-bold" : "bg-muted"}`}>
              <p>Dia 21+</p>
              <p className="text-muted-foreground">75% BR</p>
              <p>INSS paga</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Dia actual: {diasTranscurridos} | Duracion maxima IT: 365 dias (prorrogable 180 mas)
          </p>
        </div>
      )}

      {/* Empleado */}
      <div className="space-y-1">
        <Label>Empleado *</Label>
        <Select
          value={form.employee_id}
          onValueChange={(v) => updateField("employee_id", v)}
          disabled={isEdit}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar empleado" />
          </SelectTrigger>
          <SelectContent>
            {empleados.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contrato vinculado */}
      {contratosEmpleado.length > 0 && (
        <div className="space-y-1">
          <Label>Contrato Vinculado</Label>
          <Select
            value={form.contrato_id}
            onValueChange={(v) => updateField("contrato_id", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar contrato" />
            </SelectTrigger>
            <SelectContent>
              {contratosEmpleado.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.tipo_contrato} - {c.nombre_empleado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tipo baja y fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Tipo de Baja *</Label>
          <Select
            value={form.tipo_baja}
            onValueChange={handleTipoBajaChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposBaja.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Fecha Inicio *</Label>
          <Input
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => updateField("fecha_inicio", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Proxima Revision</Label>
          <Input
            type="date"
            value={form.siguiente_revision}
            onChange={(e) => updateField("siguiente_revision", e.target.value)}
          />
        </div>
      </div>

      {/* Diagnostico */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Diagnostico</Label>
          <Input
            value={form.diagnostico}
            onChange={(e) => updateField("diagnostico", e.target.value)}
            placeholder="Ej: Lumbalgia aguda"
          />
        </div>
        <div className="space-y-1">
          <Label>Codigo Diagnostico (CIE)</Label>
          <Input
            value={form.codigo_diagnostico}
            onChange={(e) => updateField("codigo_diagnostico", e.target.value)}
            placeholder="Ej: M54.5"
          />
        </div>
      </div>

      {/* Prestacion */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Base Reguladora (mensual)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.base_reguladora}
            onChange={(e) => handleBaseReguladoraChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>% Prestacion</Label>
          <Input
            type="number"
            step="0.01"
            value={form.porcentaje_prestacion}
            onChange={(e) => updateField("porcentaje_prestacion", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Importe Diario</Label>
          <Input
            type="number"
            step="0.01"
            value={form.importe_diario}
            onChange={(e) => updateField("importe_diario", e.target.value)}
          />
        </div>
      </div>

      {/* Pagador */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Pagador</Label>
          <Select
            value={form.pagador}
            onValueChange={(v) => updateField("pagador", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pagadorOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.pagador === "mutua" && (
          <div className="space-y-1">
            <Label>Mutua</Label>
            <Input
              value={form.mutua}
              onChange={(e) => updateField("mutua", e.target.value)}
              placeholder="Nombre de la mutua"
            />
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <Label>Notas</Label>
        <Textarea
          value={form.notas}
          onChange={(e) => updateField("notas", e.target.value)}
          rows={3}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : isEdit ? "Actualizar" : "Registrar Baja"}
        </Button>
      </div>
    </form>
  );
}
