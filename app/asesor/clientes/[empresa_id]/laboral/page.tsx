"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, HeartPulse, Calculator, Plus, RefreshCw } from "lucide-react";
import ContratoForm from "@/components/laboral/ContratoForm";
import FiniquitoCalculator from "@/components/laboral/FiniquitoCalculator";
import BajaTracker from "@/components/laboral/BajaTracker";

// Types
interface Contrato {
  id: string;
  employee_id: string;
  tipo_contrato: string;
  codigo_contrato: string | null;
  jornada: string;
  horas_semanales: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_fin_prevista: string | null;
  salario_bruto_anual: number | null;
  salario_bruto_mensual: number | null;
  num_pagas: number;
  convenio_colectivo: string | null;
  categoria_profesional: string | null;
  grupo_cotizacion: number | null;
  epigrafes_at: string | null;
  coeficiente_parcialidad: number | null;
  estado: string;
  motivo_extincion: string | null;
  fecha_extincion: string | null;
  nombre_empleado: string;
  dni: string | null;
  notas: string | null;
  es_bonificado: boolean;
  tipo_bonificacion: string | null;
  importe_bonificacion: number | null;
  periodo_prueba_dias: number | null;
  periodo_prueba_fin: string | null;
  [key: string]: unknown;
}

interface Baja {
  id: string;
  employee_id: string;
  contrato_id: string | null;
  tipo_baja: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_alta_medica: string | null;
  diagnostico: string | null;
  codigo_diagnostico: string | null;
  base_reguladora: number | null;
  porcentaje_prestacion: number | null;
  importe_diario: number | null;
  pagador: string;
  mutua: string | null;
  siguiente_revision: string | null;
  dias_totales: number | null;
  estado: string;
  nombre_empleado: string;
  notas: string | null;
  [key: string]: unknown;
}

interface CotizacionRow {
  id: string;
  employee_id: string;
  periodo_mes: number;
  periodo_anio: number;
  base_contingencias_comunes: number;
  total_cuota_empresa: number;
  total_cuota_trabajador: number;
  total_cotizacion: number;
  estado: string;
  nombre_empleado: string;
}

interface Empleado {
  id: string;
  nombre: string;
}

interface CotizacionResumen {
  mes: number;
  total_empresa: number;
  total_trabajador: number;
  total: number;
  empleados: number;
}

const tipoContratoLabel: Record<string, string> = {
  indefinido: "Indefinido",
  temporal: "Temporal",
  formacion: "Formacion",
  practicas: "Practicas",
  obra_servicio: "Obra y Servicio",
  interinidad: "Interinidad",
  relevo: "Relevo",
  discontinuo: "Fijo Discontinuo",
};

const estadoColor: Record<string, string> = {
  vigente: "default",
  finalizado: "secondary",
  extinguido: "destructive",
  suspendido: "outline",
};

const tipoBajaLabel: Record<string, string> = {
  enfermedad_comun: "Enfermedad Comun",
  accidente_laboral: "Acc. Laboral",
  accidente_no_laboral: "Acc. No Laboral",
  enfermedad_profesional: "Enf. Profesional",
  maternidad: "Maternidad",
  paternidad: "Paternidad",
  riesgo_embarazo: "Riesgo Embarazo",
};

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (v: number | string | null) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    parseFloat(String(v)) || 0
  );

export default function ClienteLaboralPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [bajas, setBajas] = useState<Baja[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionRow[]>([]);
  const [cotResumen, setCotResumen] = useState<CotizacionResumen[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  const [anio, setAnio] = useState(now.getFullYear());
  const [tab, setTab] = useState("contratos");

  // Dialogs
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [showFiniquito, setShowFiniquito] = useState<string | null>(null); // contrato id
  const [showBajaTracker, setShowBajaTracker] = useState(false);
  const [editingBaja, setEditingBaja] = useState<Baja | null>(null);
  const [calculatingCot, setCalculatingCot] = useState(false);

  const loadContratos = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/contratos`
      );
      if (res.ok) {
        const json = await res.json();
        setContratos(json.data || []);
      }
    } catch {
      /* silent */
    }
  }, [empresaId]);

  const loadBajas = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/bajas`
      );
      if (res.ok) {
        const json = await res.json();
        setBajas(json.data || []);
      }
    } catch {
      /* silent */
    }
  }, [empresaId]);

  const loadCotizaciones = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/cotizaciones/${anio}`
      );
      if (res.ok) {
        const json = await res.json();
        setCotizaciones(json.data || []);
        setCotResumen(json.resumen || []);
      }
    } catch {
      /* silent */
    }
  }, [empresaId, anio]);

  const loadEmpleados = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/empleados?empresa_id=${empresaId}`
      );
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setEmpleados(
          list.map((e: { id: string; nombre: string; user_nombre?: string }) => ({
            id: e.id,
            nombre: e.user_nombre || e.nombre,
          }))
        );
      }
    } catch {
      /* silent */
    }
  }, [empresaId]);

  useEffect(() => {
    Promise.all([loadContratos(), loadBajas(), loadCotizaciones(), loadEmpleados()]).finally(() =>
      setLoading(false)
    );
  }, [loadContratos, loadBajas, loadCotizaciones, loadEmpleados]);

  useEffect(() => {
    loadCotizaciones();
  }, [anio, loadCotizaciones]);

  // Handlers
  async function handleContratoSaved() {
    setShowContratoForm(false);
    setEditingContrato(null);
    await loadContratos();
  }

  async function handleExtinguir(contratoId: string) {
    const motivo = prompt("Motivo de extincion (despido_improcedente, despido_objetivo, fin_contrato_temporal, baja_voluntaria, mutuo_acuerdo, ere):");
    if (!motivo) return;
    const fecha = prompt("Fecha de extincion (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!fecha) return;

    const res = await authenticatedFetch(
      `/asesor/clientes/${empresaId}/contratos/${contratoId}/extinguir`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo_extincion: motivo, fecha_extincion: fecha }),
      }
    );
    if (res.ok) {
      await loadContratos();
    }
  }

  async function handleDarAlta(bajaId: string) {
    const fecha = prompt("Fecha de alta medica (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!fecha) return;

    const res = await authenticatedFetch(
      `/asesor/clientes/${empresaId}/bajas/${bajaId}/alta`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha_alta_medica: fecha }),
      }
    );
    if (res.ok) {
      await loadBajas();
    }
  }

  async function handleCalcCotizacion(mes: number) {
    setCalculatingCot(true);
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/cotizaciones/${anio}/${mes}/calcular`,
        { method: "POST" }
      );
      if (res.ok) {
        await loadCotizaciones();
      }
    } finally {
      setCalculatingCot(false);
    }
  }

  async function handleBajaSaved() {
    setShowBajaTracker(false);
    setEditingBaja(null);
    await loadBajas();
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contratos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="bajas" className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> Bajas
          </TabsTrigger>
          <TabsTrigger value="cotizaciones" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Cotizaciones
          </TabsTrigger>
        </TabsList>

        {/* ===== CONTRATOS ===== */}
        <TabsContent value="contratos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Contratos ({contratos.length})
            </h2>
            <Button size="sm" onClick={() => { setEditingContrato(null); setShowContratoForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Contrato
            </Button>
          </div>

          {contratos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay contratos registrados
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contratos.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{c.nombre_empleado}</p>
                          {c.dni && (
                            <span className="text-xs text-muted-foreground">
                              ({c.dni})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={estadoColor[c.estado] as "default" | "secondary" | "destructive" | "outline"}>
                            {c.estado}
                          </Badge>
                          <Badge variant="outline">
                            {tipoContratoLabel[c.tipo_contrato] || c.tipo_contrato}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {c.jornada} - {c.horas_semanales}h/sem
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Desde {new Date(c.fecha_inicio).toLocaleDateString("es-ES")}
                          {c.fecha_fin && ` hasta ${new Date(c.fecha_fin).toLocaleDateString("es-ES")}`}
                          {!c.fecha_fin && " (indefinido)"}
                        </p>
                        {c.salario_bruto_anual && (
                          <p className="text-sm">
                            Bruto anual: {formatCurrency(c.salario_bruto_anual)} ({c.num_pagas} pagas)
                          </p>
                        )}
                        {c.categoria_profesional && (
                          <p className="text-xs text-muted-foreground">
                            {c.categoria_profesional}
                            {c.convenio_colectivo && ` | ${c.convenio_colectivo}`}
                          </p>
                        )}
                        {c.es_bonificado && (
                          <Badge variant="secondary" className="text-xs">Bonificado</Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {c.estado === "vigente" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingContrato(c); setShowContratoForm(true); }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExtinguir(c.id)}
                            >
                              Extinguir
                            </Button>
                          </>
                        )}
                        {(c.estado === "extinguido" || c.estado === "vigente") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowFiniquito(c.id)}
                          >
                            Finiquito
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== BAJAS ===== */}
        <TabsContent value="bajas" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Bajas Laborales ({bajas.length})
            </h2>
            <Button size="sm" onClick={() => { setEditingBaja(null); setShowBajaTracker(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nueva Baja
            </Button>
          </div>

          {bajas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay bajas laborales registradas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bajas.map((b) => {
                const diasTranscurridos = b.dias_totales ||
                  Math.ceil(
                    (new Date(b.fecha_fin || new Date()).getTime() -
                      new Date(b.fecha_inicio).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1;
                const pagadorActual =
                  diasTranscurridos <= 15 ? "Empresa" :
                  diasTranscurridos <= 20 ? "Empresa (60%)" : "INSS/Mutua (75%)";

                return (
                  <Card key={b.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{b.nombre_empleado}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={b.estado === "activa" ? "default" : "secondary"}>
                              {b.estado === "activa" ? "Activa" : b.estado === "alta_medica" ? "Alta Medica" : "Cerrada"}
                            </Badge>
                            <Badge variant="outline">
                              {tipoBajaLabel[b.tipo_baja] || b.tipo_baja}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Desde {new Date(b.fecha_inicio).toLocaleDateString("es-ES")}
                            {b.fecha_alta_medica && ` - Alta: ${new Date(b.fecha_alta_medica).toLocaleDateString("es-ES")}`}
                          </p>
                          <p className="text-sm">
                            {diasTranscurridos} dias | Pagador: {pagadorActual}
                          </p>
                          {b.diagnostico && (
                            <p className="text-xs text-muted-foreground">
                              Diagnostico: {b.diagnostico}
                            </p>
                          )}
                          {b.siguiente_revision && (
                            <p className="text-xs text-orange-600">
                              Proxima revision: {new Date(b.siguiente_revision).toLocaleDateString("es-ES")}
                            </p>
                          )}
                          {b.base_reguladora && (
                            <p className="text-xs text-muted-foreground">
                              Base reguladora: {formatCurrency(b.base_reguladora)}
                              {b.importe_diario && ` | Diario: ${formatCurrency(b.importe_diario)}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {b.estado === "activa" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingBaja(b); setShowBajaTracker(true); }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDarAlta(b.id)}
                              >
                                Dar Alta
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timeline bar */}
                      {b.estado === "activa" && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Dia 1-3: Empresa</span>
                            <span>Dia 4-15: Empresa</span>
                            <span>Dia 16-20: INSS 60%</span>
                            <span>Dia 21+: INSS 75%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                            <div
                              className="bg-blue-500 h-full"
                              style={{ width: `${Math.min(100, (Math.min(diasTranscurridos, 3) / 365) * 100 * 20)}%` }}
                            />
                            <div
                              className="bg-blue-400 h-full"
                              style={{ width: `${Math.min(100, (Math.min(Math.max(diasTranscurridos - 3, 0), 12) / 365) * 100 * 20)}%` }}
                            />
                            <div
                              className="bg-orange-400 h-full"
                              style={{ width: `${Math.min(100, (Math.min(Math.max(diasTranscurridos - 15, 0), 5) / 365) * 100 * 20)}%` }}
                            />
                            <div
                              className="bg-green-500 h-full"
                              style={{ width: `${Math.min(100, (Math.max(diasTranscurridos - 20, 0) / 365) * 100 * 20)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== COTIZACIONES ===== */}
        <TabsContent value="cotizaciones" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Cotizaciones SS</h2>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumen mensual */}
          {cotResumen.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cotResumen
                .sort((a, b) => a.mes - b.mes)
                .map((r) => (
                  <Card key={r.mes}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{meses[r.mes - 1]}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p>Empresa: {formatCurrency(r.total_empresa)}</p>
                      <p>Trabajador: {formatCurrency(r.total_trabajador)}</p>
                      <p className="font-semibold">Total: {formatCurrency(r.total)}</p>
                      <p className="text-muted-foreground">{r.empleados} empleados</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Calcular mes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Calcular Cotizaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {meses.map((m, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    disabled={calculatingCot}
                    onClick={() => handleCalcCotizacion(i + 1)}
                  >
                    {calculatingCot ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                    {m}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalle por empleado */}
          {cotizaciones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalle por Empleado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Empleado</th>
                        <th className="text-left py-2 px-2">Mes</th>
                        <th className="text-right py-2 px-2">Base CC</th>
                        <th className="text-right py-2 px-2">Cuota Empresa</th>
                        <th className="text-right py-2 px-2">Cuota Trabajador</th>
                        <th className="text-right py-2 px-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizaciones.map((c) => (
                        <tr key={c.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">{c.nombre_empleado}</td>
                          <td className="py-2 px-2">{meses[c.periodo_mes - 1]}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(c.base_contingencias_comunes)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(c.total_cuota_empresa)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(c.total_cuota_trabajador)}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(c.total_cotizacion)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Contrato Form */}
      <Dialog open={showContratoForm} onOpenChange={setShowContratoForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContrato ? "Editar Contrato" : "Nuevo Contrato"}
            </DialogTitle>
          </DialogHeader>
          <ContratoForm
            empresaId={empresaId}
            empleados={empleados}
            contrato={editingContrato}
            onSaved={handleContratoSaved}
            onCancel={() => setShowContratoForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Finiquito Calculator */}
      {showFiniquito && (
        <Dialog open={!!showFiniquito} onOpenChange={() => setShowFiniquito(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Calculo de Finiquito</DialogTitle>
            </DialogHeader>
            <FiniquitoCalculator
              empresaId={empresaId}
              contratoId={showFiniquito}
              onClose={() => setShowFiniquito(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Baja Tracker */}
      <Dialog open={showBajaTracker} onOpenChange={setShowBajaTracker}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBaja ? "Editar Baja Laboral" : "Nueva Baja Laboral"}
            </DialogTitle>
          </DialogHeader>
          <BajaTracker
            empresaId={empresaId}
            empleados={empleados}
            contratos={contratos}
            baja={editingBaja}
            onSaved={handleBajaSaved}
            onCancel={() => setShowBajaTracker(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
