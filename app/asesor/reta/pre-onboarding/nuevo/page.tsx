"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Calculator } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RetaRegularizacionGauge } from "@/components/reta/RetaRegularizacionGauge";

const SECTORES = [
  "servicios_profesionales", "comercio_minorista", "hosteleria",
  "construccion", "transporte", "tecnologia", "sanitario", "formacion",
];

export default function NuevoPreOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const [form, setForm] = useState({
    nombreProspecto: "",
    nif: "",
    actividadTipo: "profesional",
    sector: "",
    ingresosMensualesEstimados: 0,
    gastosFijosMensuales: 0,
    gastosPorcentajeVariable: 10,
    tieneEmpleados: false,
    costeEmpleadosMensual: 0,
    tieneLocal: false,
    alquilerMensual: 0,
    haSidoAutonomoAntes: false,
    fechaUltimoAlta: "",
  });

  const upd = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/asesor/reta/pre-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setResultado(data);
        setStep(4); // Ir a resultados
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    "Datos basicos",
    "Ingresos estimados",
    "Gastos estimados",
    "Situacion personal",
    "Resultados",
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/asesor/reta/pre-onboarding")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nueva estimacion pre-onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Estima la cuota RETA antes de que el cliente empiece a facturar
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">{steps[step]}</p>

      {/* Step 0: Datos basicos */}
      {step === 0 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Nombre del prospecto / cliente</Label>
              <Input value={form.nombreProspecto} onChange={(e) => upd("nombreProspecto", e.target.value)} />
            </div>
            <div>
              <Label>NIF (opcional)</Label>
              <Input value={form.nif} onChange={(e) => upd("nif", e.target.value)} />
            </div>
            <div>
              <Label>Tipo de actividad</Label>
              <Select value={form.actividadTipo} onValueChange={(v) => upd("actividadTipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="profesional">Profesional (retenciones IRPF 15%)</SelectItem>
                  <SelectItem value="empresarial">Empresarial (sin retenciones)</SelectItem>
                  <SelectItem value="empresarial_societario">Autonomo societario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={(v) => upd("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sector" /></SelectTrigger>
                <SelectContent>
                  {SECTORES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Ingresos */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos estimados</CardTitle>
            <CardDescription>
              Cuanto prevee facturar mensualmente el cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Facturacion mensual estimada (€)</Label>
              <Input
                type="number"
                value={form.ingresosMensualesEstimados || ""}
                onChange={(e) => upd("ingresosMensualesEstimados", parseFloat(e.target.value) || 0)}
                placeholder="Ej: 3000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Base imponible media mensual (sin IVA)
              </p>
            </div>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-sm font-medium">Proyeccion anual</p>
              <p className="text-2xl font-mono font-bold">
                {(form.ingresosMensualesEstimados * 12).toLocaleString("es-ES")} €
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Gastos */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos estimados</CardTitle>
            <CardDescription>
              Gastos mensuales previstos (deducibles del rendimiento neto)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gastos fijos mensuales (€)</Label>
              <Input
                type="number"
                value={form.gastosFijosMensuales || ""}
                onChange={(e) => upd("gastosFijosMensuales", parseFloat(e.target.value) || 0)}
                placeholder="Seguros, software, gestor..."
              />
            </div>
            <div>
              <Label>Gastos variables (% sobre ingresos)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={0} max={80} step={5}
                  value={form.gastosPorcentajeVariable}
                  onChange={(e) => upd("gastosPorcentajeVariable", parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono w-12 text-right">{form.gastosPorcentajeVariable}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                = {(form.ingresosMensualesEstimados * form.gastosPorcentajeVariable / 100).toFixed(0)} €/mes en gastos variables
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Tiene local / oficina</Label>
              <Switch checked={form.tieneLocal} onCheckedChange={(v) => upd("tieneLocal", v)} />
            </div>
            {form.tieneLocal && (
              <div>
                <Label>Alquiler mensual (€)</Label>
                <Input
                  type="number"
                  value={form.alquilerMensual || ""}
                  onChange={(e) => upd("alquilerMensual", parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Tiene empleados</Label>
              <Switch checked={form.tieneEmpleados} onCheckedChange={(v) => upd("tieneEmpleados", v)} />
            </div>
            {form.tieneEmpleados && (
              <div>
                <Label>Coste mensual empleados (€)</Label>
                <Input
                  type="number"
                  value={form.costeEmpleadosMensual || ""}
                  onChange={(e) => upd("costeEmpleadosMensual", parseFloat(e.target.value) || 0)}
                  placeholder="Bruto + SS empresa"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Situacion personal */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Situacion personal</CardTitle>
            <CardDescription>
              Datos para determinar elegibilidad de tarifa plana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ha sido autonomo antes</Label>
              <Switch checked={form.haSidoAutonomoAntes} onCheckedChange={(v) => upd("haSidoAutonomoAntes", v)} />
            </div>
            {form.haSidoAutonomoAntes && (
              <div>
                <Label>Fecha del ultimo alta como autonomo</Label>
                <Input
                  type="date"
                  value={form.fechaUltimoAlta}
                  onChange={(e) => upd("fechaUltimoAlta", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si han pasado mas de 2 anos, puede ser elegible para tarifa plana
                </p>
              </div>
            )}
            {!form.haSidoAutonomoAntes && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                  Elegible para tarifa plana: 80 €/mes durante 12 meses
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Extensible a 24 meses si el rendimiento neto anual es inferior al SMI
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Resultados */}
      {step === 4 && resultado && (
        <div className="space-y-4">
          {resultado.elegibleTarifaPlana && resultado.tarifaPlana && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                    Tarifa plana
                  </Badge>
                  <span className="text-sm">
                    {resultado.tarifaPlana.importe} €/mes durante {resultado.tarifaPlana.duracion} meses
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativa de escenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Pesimista", data: resultado.escenarios.pesimista, color: "text-red-600" },
                  { label: "Realista", data: resultado.escenarios.realista, color: "text-foreground" },
                  { label: "Optimista", data: resultado.escenarios.optimista, color: "text-green-600" },
                ].map((esc) => (
                  <div key={esc.label} className="space-y-2 p-3 rounded-lg bg-muted/30">
                    <p className={`font-semibold ${esc.color}`}>{esc.label}</p>
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">Ingresos: <span className="font-mono">{esc.data.ingresosAnual.toLocaleString("es-ES")} €/ano</span></p>
                      <p className="text-muted-foreground">Gastos: <span className="font-mono">{esc.data.gastosAnual.toLocaleString("es-ES")} €/ano</span></p>
                      <hr className="my-1" />
                      <p className="text-muted-foreground">Rend. neto: <span className="font-mono font-semibold">{esc.data.rendimientoMensual.toFixed(0)} €/mes</span></p>
                      <p className="text-muted-foreground">Tramo: <span className="font-semibold">{esc.data.tramo}</span></p>
                    </div>
                    <p className="font-mono text-lg font-bold">{esc.data.cuota.toFixed(2)} €/mes</p>
                    <p className="text-xs text-muted-foreground">{esc.data.cuotaAnual.toLocaleString("es-ES")} €/ano</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push("/asesor/reta/pre-onboarding")}>
              Volver a la lista
            </Button>
            <Button onClick={() => router.push(`/asesor/reta/pre-onboarding/${resultado.preOnboarding.id}`)}>
              Ver detalle
            </Button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : router.back()} disabled={loading}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.nombreProspecto}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Calculando..." : (
                <>
                  <Calculator className="w-4 h-4 mr-1" /> Calcular estimacion
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Estimacion orientativa basada en datos proporcionados. No constituye asesoramiento fiscal vinculante.
      </p>
    </div>
  );
}
