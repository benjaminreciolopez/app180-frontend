"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { Save, Trash2, Plus, Info } from "lucide-react";

type ModuloLine = { nombre: string; unidades: number; importe_unidad: number };
type ModulosSimplificado = {
  actividad?: string;
  epigrafe_iae?: string;
  cuota_devengada_anual?: number;
  cuota_minima_anual?: number;
  modulos?: ModuloLine[];
};

interface EmisorFiscalConfig {
  regimen_iva?: "general" | "criterio_caja" | "agricultura" | "simplificado";
  prorrata_iva_pct?: number | null;
  prorrata_iva_definitivo?: number | null;
  compensacion_reagp_pct?: number | null;
  modulos_simplificado?: ModulosSimplificado | null;
}

const REGIMENES = [
  { value: "general",       label: "General",                desc: "Régimen ordinario IVA (devengo en factura)." },
  { value: "criterio_caja", label: "Criterio de caja",       desc: "Art. 163 decies LIVA. Devengo y deducción por cobro/pago." },
  { value: "agricultura",   label: "REAGP (agricultura, ganadería, pesca)", desc: "Arts. 124-134 LIVA. No presenta 303 ordinario; cobra compensación 12% / 10,5%." },
  { value: "simplificado",  label: "Simplificado (módulos)", desc: "Arts. 122-123 LIVA. Cuota fija anual prorrateada por trimestre." },
];

export default function FiscalConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    loadEmisor();
  }, []);

  const loadEmisor = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/admin/facturacion/configuracion/emisor");
      const json = await res.json();
      if (json.success) {
        const emisor = json.data || {};
        setData({
          ...emisor,
          regimen_iva: emisor.regimen_iva || "general",
          prorrata_iva_pct: emisor.prorrata_iva_pct ?? "",
          prorrata_iva_definitivo: emisor.prorrata_iva_definitivo ?? "",
          compensacion_reagp_pct: emisor.compensacion_reagp_pct ?? "",
          modulos_simplificado: emisor.modulos_simplificado || { actividad: "", epigrafe_iae: "", cuota_devengada_anual: 0, cuota_minima_anual: 0, modulos: [] },
        });
      } else {
        toast.error(json.error || "Error cargando emisor");
      }
    } catch (e) {
      toast.error("Error de conexión cargando configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        prorrata_iva_pct: data.prorrata_iva_pct === "" ? null : parseFloat(data.prorrata_iva_pct),
        prorrata_iva_definitivo: data.prorrata_iva_definitivo === "" ? null : parseFloat(data.prorrata_iva_definitivo),
        compensacion_reagp_pct: data.compensacion_reagp_pct === "" ? null : parseFloat(data.compensacion_reagp_pct),
        modulos_simplificado: data.regimen_iva === "simplificado" ? data.modulos_simplificado : null,
      };
      const res = await authenticatedFetch("/api/admin/facturacion/configuracion/emisor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Configuración fiscal guardada");
        loadEmisor();
      } else {
        toast.error(json.error || "Error guardando");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const updateModulo = (idx: number, field: keyof ModuloLine, value: any) => {
    const mods = [...(data.modulos_simplificado?.modulos || [])];
    mods[idx] = { ...mods[idx], [field]: field === "nombre" ? value : parseFloat(value) || 0 };
    setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, modulos: mods } });
  };

  const addModulo = () => {
    const mods = [...(data.modulos_simplificado?.modulos || []), { nombre: "", unidades: 0, importe_unidad: 0 }];
    setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, modulos: mods } });
  };

  const removeModulo = (idx: number) => {
    const mods = [...(data.modulos_simplificado?.modulos || [])];
    mods.splice(idx, 1);
    setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, modulos: mods } });
  };

  if (loading) return <LoadingSpinner />;

  const regimen = data.regimen_iva || "general";
  const regimenInfo = REGIMENES.find((r) => r.value === regimen);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configuración fiscal</h1>
        <p className="text-muted-foreground text-sm">Régimen de IVA, pro-rata, módulos simplificado y compensación REAGP del emisor.</p>
      </div>

      {/* Régimen IVA */}
      <Card>
        <CardHeader>
          <CardTitle>Régimen de IVA</CardTitle>
          <CardDescription>Determina cómo se calculan los modelos 303/390 y el devengo de las facturas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Régimen aplicable</Label>
            <Select value={regimen} onValueChange={(v) => setData({ ...data, regimen_iva: v })}>
              <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIMENES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {regimenInfo && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {regimenInfo.desc}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pro-rata: solo si general o criterio_caja */}
      {(regimen === "general" || regimen === "criterio_caja") && (
        <Card>
          <CardHeader>
            <CardTitle>Pro-rata IVA (Art. 102 LIVA)</CardTitle>
            <CardDescription>Si la actividad combina operaciones con y sin derecho a deducción. Dejar vacío si no aplica.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>% pro-rata provisional</Label>
              <Input type="number" min="0" max="100" step="0.01"
                value={data.prorrata_iva_pct ?? ""}
                placeholder="100"
                onChange={(e) => setData({ ...data, prorrata_iva_pct: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Aplicado durante 1T-3T y como provisional en 4T.</p>
            </div>
            <div className="space-y-2">
              <Label>% pro-rata definitivo (4T)</Label>
              <Input type="number" min="0" max="100" step="0.01"
                value={data.prorrata_iva_definitivo ?? ""}
                placeholder="(opcional)"
                onChange={(e) => setData({ ...data, prorrata_iva_definitivo: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Genera regularización casilla 44 en 4T si difiere del provisional.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REAGP */}
      {regimen === "agricultura" && (
        <Card>
          <CardHeader>
            <CardTitle>Compensación REAGP</CardTitle>
            <CardDescription>El cliente abona la compensación a tanto alzado al titular del régimen agrícola.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-md">
              <Label>% Compensación</Label>
              <Select
                value={data.compensacion_reagp_pct?.toString() || ""}
                onValueChange={(v) => setData({ ...data, compensacion_reagp_pct: parseFloat(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12% — Agricultura y forestal</SelectItem>
                  <SelectItem value="10.5">10,5% — Ganadería y pesca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
              REAGP no presenta modelo 303 de actividad ordinaria (Art. 47.4 RGAT). El modelo 303 mostrará "Sin actividad" para este régimen.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simplificado */}
      {regimen === "simplificado" && (
        <Card>
          <CardHeader>
            <CardTitle>Régimen simplificado IVA — Módulos</CardTitle>
            <CardDescription>Cuotas calculadas según Anexo II Orden HFP del ejercicio. La cuota fija se prorratea por trimestre y se regulariza en 4T (1% por gastos de difícil justificación).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Actividad</Label>
                <Input
                  value={data.modulos_simplificado?.actividad || ""}
                  onChange={(e) => setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, actividad: e.target.value } })}
                  placeholder="Comercio menor de calzado"
                />
              </div>
              <div className="space-y-2">
                <Label>Epígrafe IAE</Label>
                <Input
                  value={data.modulos_simplificado?.epigrafe_iae || ""}
                  onChange={(e) => setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, epigrafe_iae: e.target.value } })}
                  placeholder="651.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Cuota devengada anual (€)</Label>
                <Input type="number" min="0" step="0.01"
                  value={data.modulos_simplificado?.cuota_devengada_anual ?? 0}
                  onChange={(e) => setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, cuota_devengada_anual: parseFloat(e.target.value) || 0 } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cuota mínima anual (€)</Label>
                <Input type="number" min="0" step="0.01"
                  value={data.modulos_simplificado?.cuota_minima_anual ?? 0}
                  onChange={(e) => setData({ ...data, modulos_simplificado: { ...data.modulos_simplificado, cuota_minima_anual: parseFloat(e.target.value) || 0 } })}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Líneas de módulos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addModulo}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir módulo
                </Button>
              </div>
              {(data.modulos_simplificado?.modulos || []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No hay módulos definidos.</p>
              )}
              {(data.modulos_simplificado?.modulos || []).map((m: ModuloLine, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Input value={m.nombre} placeholder="Personal asalariado" onChange={(e) => updateModulo(idx, "nombre", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="0" step="0.01" value={m.unidades} placeholder="Uds" onChange={(e) => updateModulo(idx, "unidades", e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" value={m.importe_unidad} placeholder="€/Ud" onChange={(e) => updateModulo(idx, "importe_unidad", e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeModulo(idx)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}
