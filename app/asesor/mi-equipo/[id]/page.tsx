"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, UserCheck, UserX } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface EmpleadoForm {
  nombre: string;
  email: string;
  telefono: string;
  dni_nif: string;
  // Contrato
  tipo_contrato: string;
  puesto: string;
  categoria_profesional: string;
  fecha_ingreso: string;
  fecha_fin_contrato: string;
  jornada_tipo: string;
  horas_semanales: number;
  convenio: string;
  // Nómina / Salario
  salario_base: number;
  porcentaje_irpf: number;
  grupo_cotizacion: number;
  numero_afiliacion_ss: string;
  iban: string;
}

const emptyForm: EmpleadoForm = {
  nombre: "",
  email: "",
  telefono: "",
  dni_nif: "",
  tipo_contrato: "indefinido",
  puesto: "",
  categoria_profesional: "",
  fecha_ingreso: "",
  fecha_fin_contrato: "",
  jornada_tipo: "completa",
  horas_semanales: 40,
  convenio: "",
  salario_base: 0,
  porcentaje_irpf: 0,
  grupo_cotizacion: 7,
  numero_afiliacion_ss: "",
  iban: "",
};

const tiposContrato = [
  { value: "indefinido", label: "Indefinido" },
  { value: "temporal", label: "Temporal" },
  { value: "practicas", label: "Prácticas" },
  { value: "formacion", label: "Formación" },
  { value: "obra_servicio", label: "Obra y servicio" },
  { value: "interinidad", label: "Interinidad" },
];

const tiposJornada = [
  { value: "completa", label: "Completa" },
  { value: "parcial", label: "Parcial" },
];

const gruposCotizacion = [
  { value: 1, label: "1 - Ingenieros y Licenciados" },
  { value: 2, label: "2 - Ingenieros Técnicos, Peritos" },
  { value: 3, label: "3 - Jefes Administrativos y de Taller" },
  { value: 4, label: "4 - Ayudantes no Titulados" },
  { value: 5, label: "5 - Oficiales Administrativos" },
  { value: 6, label: "6 - Subalternos" },
  { value: 7, label: "7 - Auxiliares Administrativos" },
  { value: 8, label: "8 - Oficiales primera y segunda" },
  { value: 9, label: "9 - Oficiales tercera y especialistas" },
  { value: 10, label: "10 - Peones" },
  { value: 11, label: "11 - Trabajadores menores de 18 años" },
];

export default function EmpleadoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const empleadoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleado, setEmpleado] = useState<any>(null);
  const [form, setForm] = useState<EmpleadoForm>(emptyForm);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadEmpleado();
  }, [empleadoId]);

  async function loadEmpleado() {
    try {
      setLoading(true);
      const res = await api.get(`/asesor/empleados/${empleadoId}`);
      const data = res.data?.data;
      if (data) {
        setEmpleado(data);
        setForm({
          nombre: data.nombre || "",
          email: data.user_email || "",
          telefono: data.telefono || "",
          dni_nif: data.dni_nif || "",
          tipo_contrato: data.tipo_contrato || "indefinido",
          puesto: data.puesto || "",
          categoria_profesional: data.categoria_profesional || "",
          fecha_ingreso: data.fecha_ingreso ? data.fecha_ingreso.split("T")[0] : "",
          fecha_fin_contrato: data.fecha_fin_contrato ? data.fecha_fin_contrato.split("T")[0] : "",
          jornada_tipo: data.jornada_tipo || "completa",
          horas_semanales: parseFloat(data.horas_semanales) || 40,
          convenio: data.convenio || "",
          salario_base: parseFloat(data.salario_base) || 0,
          porcentaje_irpf: parseFloat(data.porcentaje_irpf) || 0,
          grupo_cotizacion: data.grupo_cotizacion || 7,
          numero_afiliacion_ss: data.numero_afiliacion_ss || "",
          iban: data.iban || "",
        });
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar empleado");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.put(`/asesor/empleados/${empleadoId}`, {
        ...form,
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_fin_contrato: form.fecha_fin_contrato || null,
      });
      showSuccess("Empleado actualizado");
      setEditMode(false);
      loadEmpleado();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    try {
      await api.post(`/asesor/empleados/${empleadoId}/toggle-status`);
      showSuccess(empleado.activo ? "Empleado desactivado" : "Empleado activado");
      loadEmpleado();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error");
    }
  }

  function updateField(field: keyof EmpleadoForm, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!empleado) return <p className="text-center text-muted-foreground py-12">Empleado no encontrado</p>;

  const salarioMensual = form.salario_base / 12;
  const ssEmpleado = salarioMensual * 0.0637;
  const irpfMensual = salarioMensual * (form.porcentaje_irpf / 100);
  const netoEstimado = salarioMensual - ssEmpleado - irpfMensual;

  function Field({ label, field, type = "text", suffix, placeholder }: {
    label: string; field: keyof EmpleadoForm; type?: string; suffix?: string; placeholder?: string;
  }) {
    const val = form[field];
    return (
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
        {editMode ? (
          <div className="flex items-center gap-1">
            <input
              type={type}
              value={val}
              onChange={(e) => updateField(field, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
              placeholder={placeholder}
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              step={type === "number" ? "0.01" : undefined}
            />
            {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
          </div>
        ) : (
          <p className="text-sm font-medium">
            {type === "number" && suffix === "€/año"
              ? formatCurrency(val as number)
              : suffix === "%"
              ? `${val}%`
              : (val || "—")}
          </p>
        )}
      </div>
    );
  }

  function SelectField({ label, field, options }: {
    label: string; field: keyof EmpleadoForm; options: { value: any; label: string }[];
  }) {
    const val = form[field];
    const selectedLabel = options.find((o) => String(o.value) === String(val))?.label || String(val);
    return (
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
        {editMode ? (
          <select
            value={val as any}
            onChange={(e) => updateField(field, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
            className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-medium capitalize">{selectedLabel}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/asesor/mi-equipo")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-base font-bold text-primary">
                {empleado.nombre?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{empleado.nombre}</h1>
              <p className="text-xs text-muted-foreground">
                {empleado.nombre_empresa}
                {empleado.puesto ? ` · ${empleado.puesto}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={empleado.activo ? "default" : "secondary"}
            className="text-xs"
          >
            {empleado.activo ? "Activo" : "Inactivo"}
          </Badge>
          {editMode ? (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
              {saving ? "Guardando..." : "Guardar todo"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Estimación nómina (resumen rápido) */}
      {form.salario_base > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-[10px] text-muted-foreground">Bruto mensual</p>
              <p className="font-bold text-sm">{formatCurrency(salarioMensual)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-[10px] text-muted-foreground">SS Empleado (6.37%)</p>
              <p className="font-bold text-sm text-red-600">-{formatCurrency(ssEmpleado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-[10px] text-muted-foreground">IRPF ({form.porcentaje_irpf}%)</p>
              <p className="font-bold text-sm text-red-600">-{formatCurrency(irpfMensual)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-[10px] text-muted-foreground">Neto estimado</p>
              <p className="font-bold text-sm text-green-600">{formatCurrency(netoEstimado)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Nombre completo" field="nombre" placeholder="Nombre y apellidos" />
            <Field label="Email" field="email" type="email" placeholder="email@ejemplo.com" />
            <Field label="Teléfono" field="telefono" placeholder="600 000 000" />
            <Field label="DNI / NIF / NIE" field="dni_nif" placeholder="12345678A" />
            <Field label="Nº Afiliación SS" field="numero_afiliacion_ss" placeholder="08/12345678/90" />
            <Field label="IBAN" field="iban" placeholder="ES00 0000 0000 0000 0000" />
          </div>
        </CardContent>
      </Card>

      {/* Datos de contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contrato y jornada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <SelectField label="Tipo de contrato" field="tipo_contrato" options={tiposContrato} />
            <Field label="Puesto" field="puesto" placeholder="Administrativo, Técnico..." />
            <Field label="Categoría profesional" field="categoria_profesional" placeholder="Oficial 1ª, Auxiliar..." />
            <Field label="Fecha de ingreso" field="fecha_ingreso" type="date" />
            <Field label="Fecha fin contrato" field="fecha_fin_contrato" type="date" />
            <SelectField label="Tipo de jornada" field="jornada_tipo" options={tiposJornada} />
            <Field label="Horas semanales" field="horas_semanales" type="number" suffix="h/sem" />
            <Field label="Convenio colectivo" field="convenio" placeholder="Convenio aplicable" />
          </div>
        </CardContent>
      </Card>

      {/* Datos de nómina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos de nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Salario base anual" field="salario_base" type="number" suffix="€/año" />
            <Field label="Retención IRPF" field="porcentaje_irpf" type="number" suffix="%" />
            <SelectField label="Grupo de cotización" field="grupo_cotizacion" options={gruposCotizacion} />
          </div>
          {form.salario_base > 0 && !editMode && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Desglose estimado mensual (12 pagas)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Bruto</p>
                  <p className="font-semibold">{formatCurrency(salarioMensual)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SS Empleado</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(ssEmpleado)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IRPF</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(irpfMensual)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Neto</p>
                  <p className="font-semibold text-green-600">{formatCurrency(netoEstimado)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleToggleStatus}
        >
          {empleado.activo ? (
            <><UserX className="size-4 mr-1" /> Desactivar empleado</>
          ) : (
            <><UserCheck className="size-4 mr-1" /> Activar empleado</>
          )}
        </Button>
        {editMode && (
          <Button variant="ghost" onClick={() => { setEditMode(false); loadEmpleado(); }}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
