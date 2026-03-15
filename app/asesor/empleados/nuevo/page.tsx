"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";

interface Cliente {
  empresa_id: string;
  nombre: string;
  num_empleados: number;
  es_propia?: boolean;
}

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

export default function NuevoEmpleadoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [passwordInicial, setPasswordInicial] = useState<string | null>(null);

  const [form, setForm] = useState({
    empresa_id: "",
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
  });

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    try {
      const res = await api.get("/asesor/empleados/clientes");
      const data = res.data?.data;
      const list: Cliente[] = [];
      if (data?.propia) list.push(data.propia);
      if (data?.clientes) list.push(...data.clientes);
      setClientes(list);
    } catch {
      showError("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.empresa_id) { showError("Selecciona una empresa"); return; }
    if (!form.nombre.trim()) { showError("El nombre es obligatorio"); return; }
    if (!form.email.trim()) { showError("El email es obligatorio"); return; }

    try {
      setSaving(true);
      const res = await api.post("/asesor/empleados", {
        ...form,
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_fin_contrato: form.fecha_fin_contrato || null,
      });
      showSuccess("Empleado creado correctamente");
      setPasswordInicial(res.data?.password_inicial || "123456");
      // Redirigir al detalle del nuevo empleado
      const newId = res.data?.data?.id;
      if (newId) {
        setTimeout(() => router.push(`/asesor/empleados/${newId}`), 2000);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al crear empleado");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  if (passwordInicial) {
    return (
      <div className="max-w-md mx-auto space-y-6 mt-12">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <UserPlus className="size-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold">Empleado creado</h2>
            <p className="text-sm text-muted-foreground">
              Se ha creado el empleado <strong>{form.nombre}</strong> con email <strong>{form.email}</strong>
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 mb-1">Contraseña inicial</p>
              <p className="text-2xl font-mono font-bold text-amber-700">{passwordInicial}</p>
              <p className="text-[10px] text-amber-600 mt-1">
                El empleado deberá cambiarla en su primer inicio de sesión
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Redirigiendo al detalle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/asesor/empleados")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Nuevo empleado</h1>
          <p className="text-xs text-muted-foreground">
            Rellena los datos del empleado. Los campos de nómina son necesarios para generar nóminas automáticas.
          </p>
        </div>
      </div>

      {/* Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Empresa</CardTitle>
          <CardDescription>Selecciona la empresa a la que pertenecerá este empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={form.empresa_id}
            onChange={(e) => updateField("empresa_id", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            required
          >
            <option value="">Seleccionar empresa...</option>
            {clientes.map((c) => (
              <option key={c.empresa_id} value={c.empresa_id}>
                {c.es_propia ? `Mi asesoría (${c.nombre})` : c.nombre}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre completo *</label>
              <input type="text" value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)}
                placeholder="Nombre y apellidos" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
                placeholder="email@ejemplo.com" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
              <input type="text" value={form.telefono} onChange={(e) => updateField("telefono", e.target.value)}
                placeholder="600 000 000" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">DNI / NIF / NIE</label>
              <input type="text" value={form.dni_nif} onChange={(e) => updateField("dni_nif", e.target.value)}
                placeholder="12345678A" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nº Afiliación SS</label>
              <input type="text" value={form.numero_afiliacion_ss} onChange={(e) => updateField("numero_afiliacion_ss", e.target.value)}
                placeholder="08/12345678/90" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">IBAN</label>
              <input type="text" value={form.iban} onChange={(e) => updateField("iban", e.target.value)}
                placeholder="ES00 0000 0000 0000 0000" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contrato y jornada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contrato y jornada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo de contrato</label>
              <select value={form.tipo_contrato} onChange={(e) => updateField("tipo_contrato", e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background">
                {tiposContrato.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Puesto</label>
              <input type="text" value={form.puesto} onChange={(e) => updateField("puesto", e.target.value)}
                placeholder="Administrativo, Técnico..." className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoría profesional</label>
              <input type="text" value={form.categoria_profesional} onChange={(e) => updateField("categoria_profesional", e.target.value)}
                placeholder="Oficial 1ª, Auxiliar..." className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fecha de ingreso</label>
              <input type="date" value={form.fecha_ingreso} onChange={(e) => updateField("fecha_ingreso", e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fecha fin contrato</label>
              <input type="date" value={form.fecha_fin_contrato} onChange={(e) => updateField("fecha_fin_contrato", e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo de jornada</label>
              <select value={form.jornada_tipo} onChange={(e) => updateField("jornada_tipo", e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background">
                {tiposJornada.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Horas semanales</label>
              <input type="number" value={form.horas_semanales} onChange={(e) => updateField("horas_semanales", parseFloat(e.target.value) || 0)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" step="0.5" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Convenio colectivo</label>
              <input type="text" value={form.convenio} onChange={(e) => updateField("convenio", e.target.value)}
                placeholder="Convenio aplicable" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos de nómina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datos de nómina</CardTitle>
          <CardDescription>
            Estos datos son necesarios para la generación automática de nóminas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Salario base anual</label>
              <div className="flex items-center gap-1">
                <input type="number" value={form.salario_base} onChange={(e) => updateField("salario_base", parseFloat(e.target.value) || 0)}
                  placeholder="0.00" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" step="0.01" />
                <span className="text-xs text-muted-foreground shrink-0">€/año</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Retención IRPF</label>
              <div className="flex items-center gap-1">
                <input type="number" value={form.porcentaje_irpf} onChange={(e) => updateField("porcentaje_irpf", parseFloat(e.target.value) || 0)}
                  placeholder="0" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" step="0.01" />
                <span className="text-xs text-muted-foreground shrink-0">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Grupo de cotización</label>
              <select value={form.grupo_cotizacion} onChange={(e) => updateField("grupo_cotizacion", Number(e.target.value))}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background">
                {gruposCotizacion.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <><Loader2 className="size-4 mr-1 animate-spin" /> Creando...</>
          ) : (
            <><UserPlus className="size-4 mr-1" /> Crear empleado</>
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/asesor/empleados")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
