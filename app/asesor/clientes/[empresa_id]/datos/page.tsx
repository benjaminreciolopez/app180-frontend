"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Save, Loader2 } from "lucide-react";

interface DatosCliente {
  empresa_id: string;
  nombre: string;
  tipo_contribuyente: string | null;
  gestionada: boolean;
  nombre_fiscal: string | null;
  nif: string | null;
  direccion: string | null;
  poblacion: string | null;
  provincia: string | null;
  cp: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  iban: string | null;
  regimen_iva: string | null;
  registro_mercantil: string | null;
  nombre_comercial: string | null;
}

const REGIMEN_OPTIONS = [
  { value: "", label: "— sin definir —" },
  { value: "general", label: "General" },
  { value: "criterio_caja", label: "Criterio de caja" },
  { value: "agricultura", label: "Agricultura (REAGP)" },
  { value: "simplificado", label: "Simplificado" },
];

const TIPO_OPTIONS = [
  { value: "", label: "— sin definir —" },
  { value: "autonomo", label: "Autónomo" },
  { value: "sociedad", label: "Sociedad" },
];

export default function AsesorClienteDatosPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datos, setDatos] = useState<DatosCliente | null>(null);

  useEffect(() => {
    load();
  }, [empresaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/asesor/clientes/${empresaId}/datos`);
      setDatos(res.data?.data || null);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!datos) return;
    setSaving(true);
    try {
      await api.put(`/asesor/clientes/${empresaId}/datos`, {
        nombre: datos.nombre,
        tipo_contribuyente: datos.tipo_contribuyente,
        nombre_fiscal: datos.nombre_fiscal,
        nif: datos.nif,
        direccion: datos.direccion,
        poblacion: datos.poblacion,
        provincia: datos.provincia,
        cp: datos.cp,
        pais: datos.pais,
        telefono: datos.telefono,
        email: datos.email,
        web: datos.web,
        iban: datos.iban,
        regimen_iva: datos.regimen_iva,
        registro_mercantil: datos.registro_mercantil,
        nombre_comercial: datos.nombre_comercial,
      });
      showSuccess("Datos actualizados");
    } catch (err: any) {
      showError(err.response?.data?.error || "Error guardando datos");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof DatosCliente>(key: K, value: DatosCliente[K]) {
    setDatos((d) => (d ? { ...d, [key]: value } : d));
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!datos) return <p className="text-sm text-muted-foreground">Sin datos.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Datos del cliente</h1>
          <p className="text-sm text-muted-foreground">
            Identidad fiscal, contacto y configuración del IVA. Estos datos se usan en facturación y modelos.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidad</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre / Razón social *</label>
            <Input value={datos.nombre || ""} onChange={(e) => update("nombre", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre comercial</label>
            <Input value={datos.nombre_comercial || ""} onChange={(e) => update("nombre_comercial", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">NIF / CIF</label>
            <Input
              value={datos.nif || ""}
              onChange={(e) => update("nif", e.target.value.toUpperCase())}
              placeholder="12345678A / B12345678"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tipo contribuyente</label>
            <select
              value={datos.tipo_contribuyente || ""}
              onChange={(e) => update("tipo_contribuyente", e.target.value || null)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Registro mercantil</label>
            <Input value={datos.registro_mercantil || ""} onChange={(e) => update("registro_mercantil", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dirección</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Dirección</label>
            <Input value={datos.direccion || ""} onChange={(e) => update("direccion", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Población</label>
            <Input value={datos.poblacion || ""} onChange={(e) => update("poblacion", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Provincia</label>
            <Input value={datos.provincia || ""} onChange={(e) => update("provincia", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Código postal</label>
            <Input value={datos.cp || ""} onChange={(e) => update("cp", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">País</label>
            <Input value={datos.pais || ""} onChange={(e) => update("pais", e.target.value.toUpperCase())} maxLength={2} placeholder="ES" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
            <Input value={datos.telefono || ""} onChange={(e) => update("telefono", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input type="email" value={datos.email || ""} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Web</label>
            <Input value={datos.web || ""} onChange={(e) => update("web", e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Banco y régimen IVA</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">IBAN</label>
            <Input value={datos.iban || ""} onChange={(e) => update("iban", e.target.value.toUpperCase())} placeholder="ES00 0000 0000 0000 0000 0000" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Régimen IVA</label>
            <select
              value={datos.regimen_iva || ""}
              onChange={(e) => update("regimen_iva", e.target.value || null)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {REGIMEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
