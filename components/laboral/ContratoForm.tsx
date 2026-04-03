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
import { Switch } from "@/components/ui/switch";

interface Empleado {
  id: string;
  nombre: string;
}

interface ContratoData {
  id?: string;
  employee_id: string;
  tipo_contrato: string;
  codigo_contrato: string | null;
  jornada: string;
  horas_semanales: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_fin_prevista: string | null;
  periodo_prueba_dias: number | null;
  salario_bruto_anual: number | null;
  salario_bruto_mensual: number | null;
  num_pagas: number;
  convenio_colectivo: string | null;
  categoria_profesional: string | null;
  grupo_cotizacion: number | null;
  epigrafes_at: string | null;
  coeficiente_parcialidad: number | null;
  es_bonificado: boolean;
  tipo_bonificacion: string | null;
  importe_bonificacion: number | null;
  notas: string | null;
  [key: string]: unknown;
}

interface Props {
  empresaId: string;
  empleados: Empleado[];
  contrato: ContratoData | null;
  onSaved: () => void;
  onCancel: () => void;
}

const tiposContrato = [
  { value: "indefinido", label: "Indefinido" },
  { value: "temporal", label: "Temporal" },
  { value: "formacion", label: "Formacion" },
  { value: "practicas", label: "Practicas" },
  { value: "obra_servicio", label: "Obra y Servicio" },
  { value: "interinidad", label: "Interinidad" },
  { value: "relevo", label: "Relevo" },
  { value: "discontinuo", label: "Fijo Discontinuo" },
];

const jornadaOptions = [
  { value: "completa", label: "Completa" },
  { value: "parcial", label: "Parcial" },
  { value: "reducida", label: "Reducida" },
];

const codigosContrato = [
  { value: "100", label: "100 - Indefinido a tiempo completo" },
  { value: "200", label: "200 - Indefinido a tiempo parcial" },
  { value: "401", label: "401 - Obra o servicio determinado TC" },
  { value: "402", label: "402 - Eventual circunstancias produccion TC" },
  { value: "410", label: "410 - Interinidad TC" },
  { value: "421", label: "421 - Formacion en alternancia" },
  { value: "420", label: "420 - Practicas profesionales" },
  { value: "502", label: "502 - Eventual circunstancias produccion TP" },
  { value: "510", label: "510 - Interinidad TP" },
  { value: "130", label: "130 - Indefinido fijos-discontinuos TC" },
];

export default function ContratoForm({ empresaId, empleados, contrato, onSaved, onCancel }: Props) {
  const isEdit = !!contrato?.id;

  const [form, setForm] = useState({
    employee_id: contrato?.employee_id || "",
    tipo_contrato: contrato?.tipo_contrato || "indefinido",
    codigo_contrato: contrato?.codigo_contrato || "",
    jornada: contrato?.jornada || "completa",
    horas_semanales: contrato?.horas_semanales || 40,
    fecha_inicio: contrato?.fecha_inicio ? String(contrato.fecha_inicio).substring(0, 10) : "",
    fecha_fin: contrato?.fecha_fin ? String(contrato.fecha_fin).substring(0, 10) : "",
    fecha_fin_prevista: contrato?.fecha_fin_prevista ? String(contrato.fecha_fin_prevista).substring(0, 10) : "",
    periodo_prueba_dias: contrato?.periodo_prueba_dias || "",
    salario_bruto_anual: contrato?.salario_bruto_anual || "",
    salario_bruto_mensual: contrato?.salario_bruto_mensual || "",
    num_pagas: contrato?.num_pagas || 14,
    convenio_colectivo: contrato?.convenio_colectivo || "",
    categoria_profesional: contrato?.categoria_profesional || "",
    grupo_cotizacion: contrato?.grupo_cotizacion || "",
    epigrafes_at: contrato?.epigrafes_at || "",
    coeficiente_parcialidad: contrato?.coeficiente_parcialidad || "",
    es_bonificado: contrato?.es_bonificado || false,
    tipo_bonificacion: contrato?.tipo_bonificacion || "",
    importe_bonificacion: contrato?.importe_bonificacion || "",
    notas: contrato?.notas || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-calculate monthly from annual
  function handleSalarioAnualChange(val: string) {
    const anual = parseFloat(val) || 0;
    const mensual = form.num_pagas ? anual / form.num_pagas : 0;
    setForm((prev) => ({
      ...prev,
      salario_bruto_anual: val as unknown as string,
      salario_bruto_mensual: Math.round(mensual * 100) / 100,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.employee_id) {
      setError("Selecciona un empleado");
      return;
    }
    if (!form.fecha_inicio) {
      setError("Fecha de inicio requerida");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/asesor/clientes/${empresaId}/contratos/${contrato!.id}`
        : `/asesor/clientes/${empresaId}/contratos`;

      const res = await authenticatedFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fecha_fin: form.fecha_fin || null,
          fecha_fin_prevista: form.fecha_fin_prevista || null,
          periodo_prueba_dias: form.periodo_prueba_dias || null,
          salario_bruto_anual: form.salario_bruto_anual || null,
          salario_bruto_mensual: form.salario_bruto_mensual || null,
          grupo_cotizacion: form.grupo_cotizacion || null,
          coeficiente_parcialidad: form.coeficiente_parcialidad || null,
          importe_bonificacion: form.importe_bonificacion || null,
        }),
      });

      if (res.ok) {
        onSaved();
      } else {
        const json = await res.json();
        setError(json.error || "Error guardando contrato");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded text-sm">
          {error}
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

      {/* Tipo y codigo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Tipo de Contrato *</Label>
          <Select
            value={form.tipo_contrato}
            onValueChange={(v) => updateField("tipo_contrato", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposContrato.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Codigo SEPE</Label>
          <Select
            value={form.codigo_contrato}
            onValueChange={(v) => updateField("codigo_contrato", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {codigosContrato.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jornada */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Jornada</Label>
          <Select
            value={form.jornada}
            onValueChange={(v) => updateField("jornada", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jornadaOptions.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Horas Semanales</Label>
          <Input
            type="number"
            value={form.horas_semanales}
            onChange={(e) => updateField("horas_semanales", parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Fecha Inicio *</Label>
          <Input
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => updateField("fecha_inicio", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Fecha Fin</Label>
          <Input
            type="date"
            value={form.fecha_fin}
            onChange={(e) => updateField("fecha_fin", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Periodo Prueba (dias)</Label>
          <Input
            type="number"
            value={form.periodo_prueba_dias}
            onChange={(e) => updateField("periodo_prueba_dias", e.target.value)}
          />
        </div>
      </div>

      {/* Salario */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Salario Bruto Anual</Label>
          <Input
            type="number"
            step="0.01"
            value={form.salario_bruto_anual}
            onChange={(e) => handleSalarioAnualChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Salario Bruto Mensual</Label>
          <Input
            type="number"
            step="0.01"
            value={form.salario_bruto_mensual}
            onChange={(e) => updateField("salario_bruto_mensual", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Num. Pagas</Label>
          <Input
            type="number"
            value={form.num_pagas}
            onChange={(e) => updateField("num_pagas", parseInt(e.target.value) || 14)}
          />
        </div>
      </div>

      {/* Convenio y categoria */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Convenio Colectivo</Label>
          <Input
            value={form.convenio_colectivo}
            onChange={(e) => updateField("convenio_colectivo", e.target.value)}
            placeholder="Ej: Hosteleria Madrid"
          />
        </div>
        <div className="space-y-1">
          <Label>Categoria Profesional</Label>
          <Input
            value={form.categoria_profesional}
            onChange={(e) => updateField("categoria_profesional", e.target.value)}
            placeholder="Ej: Oficial 1a"
          />
        </div>
      </div>

      {/* Cotizacion */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Grupo Cotizacion (1-11)</Label>
          <Input
            type="number"
            min={1}
            max={11}
            value={form.grupo_cotizacion}
            onChange={(e) => updateField("grupo_cotizacion", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Epigrafe AT</Label>
          <Input
            value={form.epigrafes_at}
            onChange={(e) => updateField("epigrafes_at", e.target.value)}
          />
        </div>
        {form.jornada === "parcial" && (
          <div className="space-y-1">
            <Label>Coeficiente Parcialidad (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.coeficiente_parcialidad}
              onChange={(e) => updateField("coeficiente_parcialidad", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Bonificacion */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.es_bonificado}
            onCheckedChange={(v) => updateField("es_bonificado", v)}
          />
          <Label>Contrato Bonificado</Label>
        </div>
      </div>
      {form.es_bonificado && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Tipo Bonificacion</Label>
            <Input
              value={form.tipo_bonificacion}
              onChange={(e) => updateField("tipo_bonificacion", e.target.value)}
              placeholder="Ej: Jovenes menores 30"
            />
          </div>
          <div className="space-y-1">
            <Label>Importe Bonificacion</Label>
            <Input
              type="number"
              step="0.01"
              value={form.importe_bonificacion}
              onChange={(e) => updateField("importe_bonificacion", e.target.value)}
            />
          </div>
        </div>
      )}

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
          {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Contrato"}
        </Button>
      </div>
    </form>
  );
}
