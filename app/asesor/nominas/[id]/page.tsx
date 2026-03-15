"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Check, FileText } from "lucide-react";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const num = (v: any) => parseFloat(String(v)) || 0;

interface Incidencia {
  id: string;
  tipo: string;
  concepto: string;
  importe: number;
  horas: number;
  dias: number;
  automatica: boolean;
  estado: string;
}

export default function NominaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const nominaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nomina, setNomina] = useState<any>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Campos editables
  const [form, setForm] = useState({
    bruto: 0,
    seguridad_social_empleado: 0,
    seguridad_social_empresa: 0,
    irpf_retencion: 0,
    liquido: 0,
    base_cotizacion: 0,
    tipo_contingencias_comunes: 0,
    tipo_desempleo: 0,
    tipo_formacion: 0,
    tipo_fogasa: 0,
    horas_extra: 0,
    complementos: 0,
    notas: "",
  });

  useEffect(() => {
    loadNomina();
  }, [nominaId]);

  async function loadNomina() {
    try {
      setLoading(true);
      const res = await api.get(`/asesor/nominas/${nominaId}`);
      const data = res.data?.data;
      if (data) {
        setNomina(data);
        setIncidencias(data.incidencias || []);
        setForm({
          bruto: num(data.bruto),
          seguridad_social_empleado: num(data.seguridad_social_empleado),
          seguridad_social_empresa: num(data.seguridad_social_empresa),
          irpf_retencion: num(data.irpf_retencion),
          liquido: num(data.liquido),
          base_cotizacion: num(data.base_cotizacion),
          tipo_contingencias_comunes: num(data.tipo_contingencias_comunes),
          tipo_desempleo: num(data.tipo_desempleo),
          tipo_formacion: num(data.tipo_formacion),
          tipo_fogasa: num(data.tipo_fogasa),
          horas_extra: num(data.horas_extra),
          complementos: num(data.complementos),
          notas: data.notas || "",
        });
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar nómina");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.put(`/asesor/nominas/${nominaId}`, form);
      showSuccess("Nómina actualizada");
      setEditMode(false);
      loadNomina();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleAprobar() {
    try {
      await api.post(`/asesor/nominas/${nominaId}/aprobar`);
      showSuccess("Nómina aprobada");
      loadNomina();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al aprobar");
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!nomina) return <p className="text-center text-muted-foreground py-12">Nómina no encontrada</p>;

  const canEdit = nomina.estado !== "aprobada";
  const canApprove = nomina.estado !== "aprobada";

  function Field({ label, field, suffix }: { label: string; field: keyof typeof form; suffix?: string }) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {editMode && canEdit ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: parseFloat(e.target.value) || 0 })}
              className="w-28 border rounded px-2 py-1 text-sm text-right bg-background"
            />
            {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
          </div>
        ) : (
          <span className="font-medium text-sm">
            {suffix === "%" ? `${form[field]}%` : formatCurrency(form[field] as number)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/asesor/nominas")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {nomina.nombre_empleado || "Empleado"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {nomina.nombre_empresa} — {meses[nomina.mes - 1]} {nomina.anio}
            </p>
          </div>
        </div>
        <Badge
          variant={nomina.estado === "aprobada" ? "default" : "secondary"}
          className="text-xs capitalize"
        >
          {nomina.estado || "borrador"}
        </Badge>
      </div>

      {/* Datos del empleado */}
      {(nomina.salario_base || nomina.tipo_contrato) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Datos del empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {nomina.salario_base && (
                <div>
                  <p className="text-xs text-muted-foreground">Salario base anual</p>
                  <p className="font-medium">{formatCurrency(num(nomina.salario_base))}</p>
                </div>
              )}
              {nomina.tipo_contrato && (
                <div>
                  <p className="text-xs text-muted-foreground">Contrato</p>
                  <p className="font-medium capitalize">{nomina.tipo_contrato}</p>
                </div>
              )}
              {nomina.porcentaje_irpf > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">IRPF</p>
                  <p className="font-medium">{nomina.porcentaje_irpf}%</p>
                </div>
              )}
              {nomina.dni_nif && (
                <div>
                  <p className="text-xs text-muted-foreground">DNI/NIF</p>
                  <p className="font-medium">{nomina.dni_nif}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desglose nómina */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Desglose de la nómina</CardTitle>
            {canEdit && (
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                disabled={saving}
              >
                {editMode ? (
                  saving ? "Guardando..." : <><Save className="size-3 mr-1" /> Guardar</>
                ) : (
                  "Editar"
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Devengos */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Devengos
            </h3>
            <div className="divide-y">
              <Field label="Salario base mensual" field="bruto" />
              <Field label="Horas extra" field="horas_extra" />
              <Field label="Complementos" field="complementos" />
            </div>
            <div className="flex items-center justify-between py-2 border-t-2 mt-1">
              <span className="font-semibold text-sm">Total Bruto</span>
              <span className="font-bold">{formatCurrency(form.bruto)}</span>
            </div>
          </div>

          {/* Deducciones SS */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Seguridad Social (Empleado)
            </h3>
            <div className="divide-y">
              <Field label="Contingencias comunes (4.70%)" field="tipo_contingencias_comunes" />
              <Field label="Desempleo" field="tipo_desempleo" />
              <Field label="Formación profesional" field="tipo_formacion" />
            </div>
            <div className="flex items-center justify-between py-2 border-t-2 mt-1">
              <span className="font-semibold text-sm">Total SS Empleado</span>
              <span className="font-bold text-red-600">
                -{formatCurrency(form.seguridad_social_empleado)}
              </span>
            </div>
          </div>

          {/* IRPF */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              IRPF
            </h3>
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-sm">Retención IRPF</span>
              <span className="font-bold text-red-600">
                -{formatCurrency(form.irpf_retencion)}
              </span>
            </div>
          </div>

          {/* Líquido */}
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base">Líquido a percibir</span>
              <span className="font-bold text-xl text-green-600">
                {formatCurrency(form.liquido)}
              </span>
            </div>
          </div>

          {/* SS Empresa (informativo) */}
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Coste empresa (informativo)
            </h3>
            <Field label="SS Empresa" field="seguridad_social_empresa" />
            <Field label="FOGASA" field="tipo_fogasa" />
          </div>

          {/* Notas */}
          {editMode ? (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[60px]"
                placeholder="Observaciones..."
              />
            </div>
          ) : form.notas ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{form.notas}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Incidencias */}
      {incidencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidencias del periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {incidencias.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{inc.concepto}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{inc.tipo}</Badge>
                      {inc.automatica && (
                        <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {num(inc.importe) !== 0 && (
                      <p className="text-sm font-medium">
                        {formatCurrency(num(inc.importe))}
                      </p>
                    )}
                    {inc.dias > 0 && (
                      <p className="text-xs text-muted-foreground">{inc.dias} días</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        {canApprove && (
          <Button onClick={handleAprobar}>
            <Check className="size-4 mr-1" /> Aprobar nómina
          </Button>
        )}
        {nomina.pdf_path && (
          <Button variant="outline">
            <FileText className="size-4 mr-1" /> Descargar PDF
          </Button>
        )}
      </div>
    </div>
  );
}
