"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Cliente {
  empresa_id: string;
  nombre: string;
  num_empleados: number;
  es_propia?: boolean;
}

interface Empleado {
  id: string;
  nombre: string;
  empresa_id: string;
  nombre_empresa: string;
  salario_base: string | number;
  tipo_contrato: string;
  porcentaje_irpf: string | number;
  activo: boolean;
}

interface Resultado {
  generadas: { nomina_id: string; empleado_id: string; nombre: string; bruto: number; liquido: number }[];
  saltadas: { empleado_id: string; nombre: string; razon: string }[];
  errores: { empleado_id: string; nombre: string; error: string }[];
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export default function GenerarNominasPage() {
  const router = useRouter();
  const now = new Date();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Step 1: Cliente
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState("");

  // Step 2: Periodo
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  // Step 3: Empleados
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<Set<string>>(new Set());

  // Step 4: Resultado
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente) loadEmpleados();
  }, [selectedCliente]);

  async function loadClientes() {
    try {
      const res = await api.get("/asesor/nominas/clientes");
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

  async function loadEmpleados() {
    try {
      const res = await api.get(`/asesor/nominas/empleados?empresa_id=${selectedCliente}`);
      const emps = res.data?.data || [];
      setEmpleados(emps);
      setSelectedEmpleados(new Set(emps.map((e: Empleado) => e.id)));
    } catch {
      setEmpleados([]);
    }
  }

  async function handleGenerar() {
    try {
      setGenerating(true);
      const res = await api.post("/asesor/nominas/generar", {
        empresa_id: selectedCliente,
        anio,
        mes,
        empleado_ids: Array.from(selectedEmpleados),
      });
      setResultado(res.data);
      setStep(4);
      if (res.data.generadas?.length > 0) {
        showSuccess(`${res.data.generadas.length} nóminas generadas`);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al generar nóminas");
    } finally {
      setGenerating(false);
    }
  }

  function toggleEmpleado(id: string) {
    setSelectedEmpleados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedEmpleados.size === empleados.length) {
      setSelectedEmpleados(new Set());
    } else {
      setSelectedEmpleados(new Set(empleados.map((e) => e.id)));
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const clienteNombre = clientes.find((c) => c.empresa_id === selectedCliente)?.nombre || "";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/asesor/nominas")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Generar Nóminas</h1>
          <p className="text-xs text-muted-foreground">
            Paso {step} de 4
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2">
        {["Cliente", "Periodo", "Empleados", "Resultado"].map((label, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-xs py-1.5 rounded ${
              step === i + 1
                ? "bg-primary text-primary-foreground font-medium"
                : step > i + 1
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Step 1: Seleccionar Cliente */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Cliente</CardTitle>
            <CardDescription>Elige la empresa para la que deseas generar nóminas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientes.map((c) => (
              <button
                key={c.empresa_id}
                onClick={() => { setSelectedCliente(c.empresa_id); setStep(2); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                  selectedCliente === c.empresa_id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {c.es_propia && "⭐ "}{c.nombre}
                      {c.es_propia && <span className="text-xs text-muted-foreground ml-2">(Mi asesoría)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.num_empleados} empleados activos</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
            {clientes.length === 0 && (
              <p className="text-center text-muted-foreground py-6">No hay clientes disponibles</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Seleccionar Periodo */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Periodo</CardTitle>
            <CardDescription>
              Generando nóminas para: <strong>{clienteNombre}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mes</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  {meses.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Año</label>
                <select
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  {[2024, 2025, 2026].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4 mr-1" /> Atrás
              </Button>
              <Button onClick={() => setStep(3)}>
                Siguiente <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Seleccionar Empleados */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Empleados</CardTitle>
            <CardDescription>
              {clienteNombre} — {meses[mes - 1]} {anio} · {selectedEmpleados.size} de {empleados.length} seleccionados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {empleados.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedEmpleados.size === empleados.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            )}

            <div className="divide-y max-h-96 overflow-y-auto">
              {empleados.map((e) => (
                <label
                  key={e.id}
                  className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/50 px-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmpleados.has(e.id)}
                    onChange={() => toggleEmpleado(e.id)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{e.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.tipo_contrato || "indefinido"} · {formatCurrency(parseFloat(String(e.salario_base)) || 0)}/año
                      {parseFloat(String(e.porcentaje_irpf)) > 0 && ` · IRPF ${e.porcentaje_irpf}%`}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {empleados.length === 0 && (
              <p className="text-center text-muted-foreground py-6">
                No hay empleados activos para esta empresa
              </p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4 mr-1" /> Atrás
              </Button>
              <Button
                onClick={handleGenerar}
                disabled={selectedEmpleados.size === 0 || generating}
              >
                {generating ? (
                  <><Loader2 className="size-4 mr-1 animate-spin" /> Generando...</>
                ) : (
                  <>Generar {selectedEmpleados.size} nóminas</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && resultado && (
        <div className="space-y-4">
          {/* Generadas */}
          {resultado.generadas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-500" />
                  {resultado.generadas.length} nóminas generadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {resultado.generadas.map((g) => (
                    <div key={g.nomina_id} className="flex items-center justify-between py-2">
                      <span className="font-medium text-sm">{g.nombre}</span>
                      <div className="text-right text-sm">
                        <span className="text-muted-foreground mr-3">Bruto: {formatCurrency(g.bruto)}</span>
                        <span className="font-semibold text-green-600">Neto: {formatCurrency(g.liquido)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saltadas */}
          {resultado.saltadas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="size-5" />
                  {resultado.saltadas.length} omitidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {resultado.saltadas.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <span>{s.nombre}</span>
                      <span className="text-muted-foreground">{s.razon}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errores */}
          {resultado.errores.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  {resultado.errores.length} errores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {resultado.errores.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <span>{e.nombre}</span>
                      <span className="text-destructive">{e.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep(1); setResultado(null); }}>
              Generar más nóminas
            </Button>
            <Button onClick={() => router.push("/asesor/nominas")}>
              Ir al listado
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
