"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Calendar, TrendingUp, AlertTriangle,
  Settings, Sliders, Plus, Trash2, Download,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RetaTramoVisualizer } from "@/components/reta/RetaTramoVisualizer";
import { RetaRegularizacionGauge } from "@/components/reta/RetaRegularizacionGauge";

// Helper para formatear numeros con null safety
const fmt = (val: any, decimals = 2): string => {
  if (val == null || val === '') return '0.00';
  const n = parseFloat(val);
  return isNaN(n) ? '0.00' : n.toFixed(decimals);
};

const TIPOS_EVENTO = [
  { value: "vacaciones", label: "Vacaciones" },
  { value: "baja_it", label: "Baja IT (enfermedad)" },
  { value: "baja_maternidad", label: "Baja maternidad/paternidad" },
  { value: "proyecto_grande", label: "Proyecto grande" },
  { value: "cese_temporal", label: "Cese temporal actividad" },
  { value: "inicio_empleado", label: "Contratacion empleado" },
  { value: "fin_empleado", label: "Fin contrato empleado" },
  { value: "inversion", label: "Inversion/gasto extraordinario" },
  { value: "estacionalidad", label: "Ajuste estacionalidad" },
];

export default function ClienteRetaDetailPage() {
  const { empresa_id } = useParams<{ empresa_id: string }>();
  const searchParams = useSearchParams();
  const titular_id = searchParams.get("titular_id");
  const titularQS = titular_id ? `&titular_id=${titular_id}` : "";
  const titularQSFirst = titular_id ? `?titular_id=${titular_id}` : "";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showEventoDialog, setShowEventoDialog] = useState(false);
  const [showCambioDialog, setShowCambioDialog] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: "vacaciones", fecha_inicio: "", fecha_fin: "",
    impacto_ingresos: 0, impacto_gastos: 0, descripcion: "",
  });
  // Simulador
  const [simIngPct, setSimIngPct] = useState(0);
  const [simGasPct, setSimGasPct] = useState(0);
  const [simResult, setSimResult] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`/asesor/reta/clientes/${empresa_id}/estimacion${titularQSFirst}`);
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [empresa_id, titularQSFirst]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      const res = await authenticatedFetch(`/asesor/reta/clientes/${empresa_id}/estimacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo: "auto", titular_id: titular_id || null }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setRecalculando(false);
    }
  };

  const handleCrearEvento = async () => {
    try {
      await authenticatedFetch(`/asesor/reta/clientes/${empresa_id}/eventos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevoEvento, titular_id: titular_id || null }),
      });
      setShowEventoDialog(false);
      setNuevoEvento({ tipo: "vacaciones", fecha_inicio: "", fecha_fin: "", impacto_ingresos: 0, impacto_gastos: 0, descripcion: "" });
      await handleRecalcular();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvento = async (eventoId: string) => {
    try {
      await authenticatedFetch(`/asesor/reta/clientes/${empresa_id}/eventos/${eventoId}`, {
        method: "DELETE",
      });
      await handleRecalcular();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimular = async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/reta/clientes/${empresa_id}/simulacion?variacion_ingresos=${simIngPct}&variacion_gastos=${simGasPct}${titularQS}`
      );
      if (res.ok) {
        const json = await res.json();
        setSimResult(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><LoadingSpinner /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No se pudieron cargar los datos</div>;

  const { estimacion, perfil, tramos, eventos, proximaVentana, recomendacionCambio } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/asesor/reta")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">RETA - Estimacion</h1>
            <p className="text-sm text-muted-foreground">
              {perfil?.sector_actividad && `${perfil.sector_actividad} · `}
              {perfil?.regimen_estimacion === 'directa_simplificada' ? 'Est. directa simplificada' : perfil?.regimen_estimacion}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEventoDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Evento
          </Button>
          <Button size="sm" onClick={handleRecalcular} disabled={recalculando}>
            <RefreshCw className={`w-4 h-4 mr-1 ${recalculando ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>
      </div>

      {!estimacion ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No hay estimaciones para este ejercicio.</p>
            <Button onClick={handleRecalcular} disabled={recalculando}>
              <Calculator className="w-4 h-4 mr-2" />
              Generar primera estimacion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="tramos">Tramos</TabsTrigger>
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
          </TabsList>

          {/* TAB: Resumen */}
          <TabsContent value="resumen" className="space-y-4">
            {/* Alerta de ventana de cambio */}
            {proximaVentana && proximaVentana.diasRestantes <= 15 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    Ventana de cambio proxima: {proximaVentana.label}
                  </p>
                  <p className="text-xs text-amber-600">
                    Quedan {proximaVentana.diasRestantes} dias para solicitar el cambio de base (limite: {proximaVentana.fechaLimite})
                  </p>
                </div>
              </div>
            )}

            {/* Recomendacion de cambio */}
            {recomendacionCambio?.shouldChange && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                      Se recomienda cambiar la base de cotizacion
                    </p>
                    <p className="text-xs text-blue-600">
                      {recomendacionCambio.reason === 'cambio_tramo'
                        ? `Cambio de tramo ${recomendacionCambio.tramoAnterior} → ${recomendacionCambio.tramoNuevo}`
                        : recomendacionCambio.reason === 'sin_base_actual'
                        ? 'No hay base actual configurada'
                        : 'Diferencia significativa detectada'}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setShowCambioDialog(true)}>
                  Cambiar base
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Regularizacion gauge */}
              <RetaRegularizacionGauge
                riesgo={estimacion?.riesgo_regularizacion_anual != null ? parseFloat(estimacion.riesgo_regularizacion_anual) : null}
                confianza={estimacion?.confianza_pct}
              />

              {/* Datos de la estimacion */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Proyeccion anual</CardTitle>
                  <CardDescription>Metodo: {estimacion.metodo_proyeccion}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingresos proyectados</span>
                    <span className="font-mono font-medium">{fmt(estimacion.ingresos_proyectados_anual)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gastos proyectados</span>
                    <span className="font-mono font-medium">{fmt(estimacion.gastos_proyectados_anual)} €</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rendimiento neto</span>
                    <span className="font-mono font-semibold">{fmt(estimacion.rendimiento_neto_anual)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deduccion gastos dificil justif.</span>
                    <span className="font-mono">{fmt(estimacion.deduccion_gastos_dificil)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rend. neto reducido</span>
                    <span className="font-mono font-semibold">{fmt(estimacion.rendimiento_neto_reducido)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rend. neto mensual</span>
                    <span className="font-mono font-bold text-base">{fmt(estimacion.rendimiento_neto_mensual)} €</span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tramo recomendado</span>
                    <Badge variant="outline">{estimacion.tramo_recomendado}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base recomendada</span>
                    <span className="font-mono font-semibold">{fmt(estimacion.base_recomendada)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuota recomendada</span>
                    <span className="font-mono font-bold text-base">{fmt(estimacion.cuota_recomendada)} €/mes</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Escenarios */}
            {estimacion.escenario_optimista && estimacion.escenario_pesimista && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Escenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    {[
                      { label: "Pesimista", data: (() => { try { return typeof estimacion.escenario_pesimista === 'string' ? JSON.parse(estimacion.escenario_pesimista) : estimacion.escenario_pesimista || {}; } catch { return {}; } })(), color: "text-red-600" },
                      { label: "Realista", data: { tramo: estimacion.tramo_recomendado, cuota: parseFloat(estimacion.cuota_recomendada) || 0, rendimientoNetoMensual: parseFloat(estimacion.rendimiento_neto_mensual) || 0 }, color: "text-foreground" },
                      { label: "Optimista", data: (() => { try { return typeof estimacion.escenario_optimista === 'string' ? JSON.parse(estimacion.escenario_optimista) : estimacion.escenario_optimista || {}; } catch { return {}; } })(), color: "text-green-600" },
                    ].map((esc) => (
                      <div key={esc.label} className="space-y-1">
                        <p className={`font-medium ${esc.color}`}>{esc.label}</p>
                        <p className="text-xs text-muted-foreground">Tramo {esc.data.tramo}</p>
                        <p className="font-mono font-semibold">{esc.data.cuota?.toFixed(2)} €/mes</p>
                        <p className="text-xs text-muted-foreground">
                          Rend. {esc.data.rendimientoNetoMensual?.toFixed(0) || esc.data.rendimientoNeto?.toFixed(0)} €/mes
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Datos YTD reales */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Datos reales YTD</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="font-mono font-semibold">{fmt(estimacion.ingresos_reales_ytd)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gastos</p>
                  <p className="font-mono font-semibold">{fmt(estimacion.gastos_reales_ytd)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nominas</p>
                  <p className="font-mono font-semibold">{fmt(estimacion.nominas_reales_ytd)} €</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Tramos */}
          <TabsContent value="tramos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tramos RETA {new Date().getFullYear()}</CardTitle>
                <CardDescription>15 tramos segun rendimiento neto mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <RetaTramoVisualizer
                  tramos={tramos || []}
                  tramoActual={perfil?.tramo_actual}
                  tramoRecomendado={estimacion?.tramo_recomendado}
                  rendimientoMensual={estimacion?.rendimiento_neto_mensual != null ? parseFloat(estimacion.rendimiento_neto_mensual) : null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Eventos */}
          <TabsContent value="eventos" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Eventos que afectan la proyeccion (vacaciones, bajas, proyectos)
              </p>
              <Button size="sm" onClick={() => setShowEventoDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Evento
              </Button>
            </div>

            {eventos && eventos.length > 0 ? (
              <div className="space-y-2">
                {eventos.map((ev: any) => (
                  <Card key={ev.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {TIPOS_EVENTO.find(t => t.value === ev.tipo)?.label || ev.tipo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ev.fecha_inicio}{ev.fecha_fin ? ` → ${ev.fecha_fin}` : ""}
                          {ev.descripcion && ` · ${ev.descripcion}`}
                        </p>
                        {(ev.impacto_ingresos !== 0 || ev.impacto_gastos !== 0) && (
                          <p className="text-xs mt-1">
                            {ev.impacto_ingresos !== 0 && (
                              <span className={parseFloat(ev.impacto_ingresos) > 0 ? "text-green-600" : "text-red-600"}>
                                Ingresos: {parseFloat(ev.impacto_ingresos) > 0 ? "+" : ""}{parseFloat(ev.impacto_ingresos).toFixed(0)}€/mes
                              </span>
                            )}
                            {ev.impacto_ingresos !== 0 && ev.impacto_gastos !== 0 && " · "}
                            {ev.impacto_gastos !== 0 && (
                              <span className={parseFloat(ev.impacto_gastos) > 0 ? "text-red-600" : "text-green-600"}>
                                Gastos: {parseFloat(ev.impacto_gastos) > 0 ? "+" : ""}{parseFloat(ev.impacto_gastos).toFixed(0)}€/mes
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteEvento(ev.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No hay eventos registrados. Los eventos ajustan la proyeccion automaticamente.
              </p>
            )}
          </TabsContent>

          {/* TAB: Simulador */}
          <TabsContent value="simulador" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Simulador What-If</CardTitle>
                <CardDescription>
                  Ajusta los porcentajes para ver como cambiaria la estimacion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Variacion ingresos (%)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={-50} max={50} step={5}
                        value={simIngPct}
                        onChange={(e) => setSimIngPct(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">
                        {simIngPct > 0 ? "+" : ""}{simIngPct}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Variacion gastos (%)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={-50} max={50} step={5}
                        value={simGasPct}
                        onChange={(e) => setSimGasPct(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">
                        {simGasPct > 0 ? "+" : ""}{simGasPct}%
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSimular} className="w-full">
                  <Sliders className="w-4 h-4 mr-2" /> Simular
                </Button>

                {simResult && (
                  <div className="border rounded-lg p-4 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Ingresos simulados</p>
                        <p className="font-mono font-semibold">{fmt(simResult.ingresos)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gastos simulados</p>
                        <p className="font-mono font-semibold">{fmt(simResult.gastos)} €</p>
                      </div>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rend. neto mensual</span>
                      <span className="font-mono font-bold">{fmt(simResult.rendimientoNetoMensual)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tramo</span>
                      <Badge variant="outline">{simResult.baseOptima?.tramo ?? '-'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base recomendada</span>
                      <span className="font-mono font-semibold">{fmt(simResult.baseOptima?.baseRecomendada)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cuota mensual</span>
                      <span className="font-mono font-bold">{fmt(simResult.baseOptima?.cuota)} €</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regularizacion estimada</span>
                      <span className={`font-mono font-bold ${(simResult.riesgo?.riesgoAnual ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                        {(simResult.riesgo?.riesgoAnual ?? 0) > 0 ? "+" : ""}{fmt(simResult.riesgo?.riesgoAnual)} €
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog: Nuevo Evento */}
      <Dialog open={showEventoDialog} onOpenChange={setShowEventoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
            <DialogDescription>
              Registra un evento que afecte a la proyeccion de ingresos/gastos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de evento</Label>
              <Select value={nuevoEvento.tipo} onValueChange={(v) => setNuevoEvento(e => ({ ...e, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_EVENTO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={nuevoEvento.fecha_inicio}
                  onChange={(e) => setNuevoEvento(ev => ({ ...ev, fecha_inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input type="date" value={nuevoEvento.fecha_fin}
                  onChange={(e) => setNuevoEvento(ev => ({ ...ev, fecha_fin: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Impacto ingresos (€/mes)</Label>
                <Input type="number" value={nuevoEvento.impacto_ingresos}
                  onChange={(e) => setNuevoEvento(ev => ({ ...ev, impacto_ingresos: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Impacto gastos (€/mes)</Label>
                <Input type="number" value={nuevoEvento.impacto_gastos}
                  onChange={(e) => setNuevoEvento(ev => ({ ...ev, impacto_gastos: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Descripcion</Label>
              <Input value={nuevoEvento.descripcion}
                onChange={(e) => setNuevoEvento(ev => ({ ...ev, descripcion: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCrearEvento} disabled={!nuevoEvento.fecha_inicio}>
              Guardar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambio de base */}
      <Dialog open={showCambioDialog} onOpenChange={setShowCambioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar cambio de base</DialogTitle>
            <DialogDescription>
              {proximaVentana && (
                <>Proxima ventana: {proximaVentana.label} (limite: {proximaVentana.fechaLimite})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Base actual</Label>
              <p className="font-mono text-lg">{perfil?.base_cotizacion_actual ? parseFloat(perfil.base_cotizacion_actual).toFixed(2) : "Sin configurar"} €</p>
            </div>
            <div>
              <Label>Base recomendada</Label>
              <p className="font-mono text-lg font-bold">{estimacion?.base_recomendada != null ? fmt(estimacion.base_recomendada) : "-"} €</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Este cambio se registrara como solicitud. El cliente debe confirmar el cambio
                ante la Seguridad Social. La estimacion es orientativa y no constituye
                asesoramiento fiscal vinculante.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCambioDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              try {
                await authenticatedFetch(`/asesor/reta/clientes/${empresa_id}/cambios-base`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    base_nueva: parseFloat(estimacion.base_recomendada),
                    motivo: "Cambio recomendado por estimacion RETA",
                    titular_id: titular_id || null,
                  }),
                });
                setShowCambioDialog(false);
                await fetchData();
              } catch (err) {
                console.error(err);
              }
            }}>
              Registrar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Estimacion orientativa. El rendimiento neto real depende de datos que pueden cambiar.
        No constituye asesoramiento fiscal vinculante.
      </p>
    </div>
  );
}

function Calculator(props: any) {
  return <Sliders {...props} />;
}
