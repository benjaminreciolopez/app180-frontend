"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Radio,
  Settings,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileCode,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────

interface SiiConfig {
  sii_activo: boolean;
  sii_obligatorio: boolean;
  sii_motivo: string;
  modo: string;
  entorno: string;
  certificado_id: string | null;
  certificado_nombre: string | null;
  ultimo_envio_exitoso: string | null;
  notas: string;
  fecha_alta_sii: string | null;
}

interface Envio {
  id: string;
  tipo_libro: string;
  tipo_comunicacion: string;
  ejercicio: number;
  periodo: string;
  estado: string;
  num_registros: number;
  registros_correctos: number;
  registros_con_errores: number;
  csv_aeat: string | null;
  csv_respuesta: string | null;
  aeat_error_desc: string | null;
  detalle_errores: any;
  enviado_at: string | null;
  created_at: string;
  registros?: Registro[];
}

interface Registro {
  id: string;
  numero_factura: string;
  nombre_contraparte: string;
  nif_contraparte: string;
  base_imponible: number;
  tipo_impositivo: number;
  cuota_repercutida: number;
  tipo_factura_sii: string;
  estado_registro: string;
  codigo_error: string | null;
  descripcion_error: string | null;
}

interface Estadisticas {
  envios: {
    total: number;
    pendientes: number;
    enviados: number;
    aceptados: number;
    rechazados: number;
    parciales: number;
  };
  facturas_pendientes: number;
  mensual: any[];
  ultimos_envios: Envio[];
}

interface PrepararResult {
  envio: Envio | null;
  registros: any[];
  invalidos: { numero_factura: string; errors: string[] }[];
  total_validos: number;
  total_invalidos: number;
  message?: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (d: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const estadoBadge = (estado: string) => {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string }> = {
    pendiente: { variant: "outline", className: "border-amber-300 text-amber-600 dark:text-amber-400", label: "Pendiente" },
    enviado: { variant: "outline", className: "border-blue-300 text-blue-600 dark:text-blue-400", label: "Enviado" },
    aceptado: { variant: "default", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0", label: "Aceptado" },
    aceptado_con_errores: { variant: "outline", className: "border-amber-300 text-amber-600", label: "Parcial" },
    rechazado: { variant: "destructive", className: "", label: "Rechazado" },
    parcial: { variant: "outline", className: "border-amber-300 text-amber-600", label: "Parcial" },
    error_tecnico: { variant: "destructive", className: "", label: "Error Tecnico" },
    correcto: { variant: "default", className: "bg-green-100 text-green-700 border-0", label: "Correcto" },
  };
  const m = map[estado] || { variant: "secondary" as const, className: "", label: estado };
  return <Badge variant={m.variant} className={`text-[10px] ${m.className}`}>{m.label}</Badge>;
};

const tipoLibroLabel = (t: string) => {
  const map: Record<string, string> = {
    facturas_emitidas: "Emitidas",
    facturas_recibidas: "Recibidas",
    emitidas: "Emitidas",
    recibidas: "Recibidas",
    bienes_inversion: "Bienes Inversion",
    operaciones_intracomunitarias: "Intracomunitarias",
  };
  return map[t] || t;
};

// ─── Component ───────────────────────────────────────────────

export default function AsesorClienteSiiPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SiiConfig | null>(null);
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [enviosTotal, setEnviosTotal] = useState(0);
  const [expandedEnvio, setExpandedEnvio] = useState<string | null>(null);
  const [envioDetalle, setEnvioDetalle] = useState<Record<string, Envio>>({});
  const [tab, setTab] = useState<"overview" | "config" | "envios">("overview");
  const [saving, setSaving] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [prepararResult, setPrepararResult] = useState<PrepararResult | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [tipoLibroPreparar, setTipoLibroPreparar] = useState("facturas_emitidas");

  // ─── Load ──────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statsRes, enviosRes] = await Promise.all([
        authenticatedFetch(`/asesor/clientes/${empresaId}/sii/config`),
        authenticatedFetch(`/asesor/clientes/${empresaId}/sii/estadisticas`),
        authenticatedFetch(`/asesor/clientes/${empresaId}/sii/envios?limit=20`),
      ]);

      const configJson = await configRes.json();
      const statsJson = await statsRes.json();
      const enviosJson = await enviosRes.json();

      if (configJson.success) setConfig(configJson.data);
      if (statsJson.success) setStats(statsJson.data);
      if (enviosJson.success) {
        setEnvios(enviosJson.data?.envios || []);
        setEnviosTotal(enviosJson.data?.total || 0);
      }
    } catch (err) {
      console.error("Error loading SII data:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Config save ───────────────────────────────────────────

  async function handleSaveConfig(updates: Partial<SiiConfig>) {
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sii/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
      }
    } catch (err) {
      console.error("Error saving config:", err);
    } finally {
      setSaving(false);
    }
  }

  // ─── Preparar envio ────────────────────────────────────────

  async function handlePreparar() {
    setPreparando(true);
    setPrepararResult(null);
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sii/preparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_libro: tipoLibroPreparar }),
      });
      const json = await res.json();
      if (json.success) {
        setPrepararResult(json.data);
        loadAll(); // Refresh envios list
      }
    } catch (err) {
      console.error("Error preparando:", err);
    } finally {
      setPreparando(false);
    }
  }

  // ─── Simular envio ─────────────────────────────────────────

  async function handleSimular(envioId: string) {
    setSimulando(true);
    setXmlPreview(null);
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sii/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envio_id: envioId }),
      });
      const json = await res.json();
      if (json.success) {
        setXmlPreview(json.data.xml_preview);
      }
    } catch (err) {
      console.error("Error simulando:", err);
    } finally {
      setSimulando(false);
    }
  }

  // ─── Expand envio detail ───────────────────────────────────

  async function toggleEnvioDetalle(envioId: string) {
    if (expandedEnvio === envioId) {
      setExpandedEnvio(null);
      return;
    }
    setExpandedEnvio(envioId);
    if (!envioDetalle[envioId]) {
      try {
        const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/sii/envios/${envioId}`);
        const json = await res.json();
        if (json.success) {
          setEnvioDetalle((prev) => ({ ...prev, [envioId]: json.data }));
        }
      } catch {
        // silent
      }
    }
  }

  // ─── Render ────────────────────────────────────────────────

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            SII - Suministro Inmediato
          </h1>
          <p className="text-sm text-muted-foreground">
            Envio de facturas en tiempo real a la AEAT
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw size={14} className="mr-1" /> Actualizar
        </Button>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b">
        {(["overview", "config", "envios"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" ? "Resumen" : t === "config" ? "Configuracion" : "Envios"}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ───────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Status */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.sii_activo ? "Activo" : "Inactivo"}</p>
                    <p className="text-xs text-muted-foreground">Estado SII</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.facturas_pendientes || 0}</p>
                    <p className="text-xs text-muted-foreground">Pendientes de envio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.envios?.aceptados || 0}</p>
                    <p className="text-xs text-muted-foreground">Aceptados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.envios?.rechazados || 0}</p>
                    <p className="text-xs text-muted-foreground">Rechazados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preparar envio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send size={16} /> Preparar envio
              </CardTitle>
              <CardDescription>
                Selecciona el tipo de libro y prepara un lote de facturas pendientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de libro</Label>
                  <select
                    value={tipoLibroPreparar}
                    onChange={(e) => setTipoLibroPreparar(e.target.value)}
                    className="mt-1 border rounded-md px-3 py-2 text-sm bg-background w-full"
                  >
                    <option value="facturas_emitidas">Facturas Emitidas</option>
                    <option value="facturas_recibidas">Facturas Recibidas</option>
                  </select>
                </div>
                <Button
                  onClick={handlePreparar}
                  disabled={preparando || !config?.sii_activo}
                  size="sm"
                >
                  {preparando ? (
                    <><RefreshCw size={14} className="mr-1 animate-spin" /> Preparando...</>
                  ) : (
                    <><Send size={14} className="mr-1" /> Preparar lote</>
                  )}
                </Button>
              </div>

              {!config?.sii_activo && (
                <p className="text-xs text-amber-600 mt-2">
                  Activa el SII en la pestana de Configuracion para poder preparar envios
                </p>
              )}

              {/* Resultado de preparar */}
              {prepararResult && (
                <div className="mt-4 border rounded-lg p-4 space-y-3">
                  {prepararResult.message && !prepararResult.envio ? (
                    <p className="text-sm text-muted-foreground">{prepararResult.message}</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 font-medium">
                          {prepararResult.total_validos} registros validos
                        </span>
                        {prepararResult.total_invalidos > 0 && (
                          <span className="text-red-600 font-medium">
                            {prepararResult.total_invalidos} invalidos
                          </span>
                        )}
                      </div>

                      {prepararResult.invalidos?.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 rounded p-3">
                          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Facturas con errores de validacion:</p>
                          {prepararResult.invalidos.map((inv, i) => (
                            <div key={i} className="text-xs text-red-600 dark:text-red-400">
                              <span className="font-mono">{inv.numero_factura || "Sin numero"}</span>
                              {": "}
                              {inv.errors.join(", ")}
                            </div>
                          ))}
                        </div>
                      )}

                      {prepararResult.envio && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSimular(prepararResult.envio!.id)}
                            disabled={simulando}
                          >
                            <Eye size={14} className="mr-1" />
                            {simulando ? "Generando XML..." : "Simular (ver XML)"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* XML Preview */}
              {xmlPreview && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <FileCode size={12} /> Vista previa XML (simulacion)
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setXmlPreview(null)}
                      className="text-xs h-6"
                    >
                      Cerrar
                    </Button>
                  </div>
                  <pre className="bg-slate-950 text-green-400 text-[11px] p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto font-mono leading-relaxed">
                    {xmlPreview}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last envios */}
          {stats?.ultimos_envios && stats.ultimos_envios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ultimos envios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {stats.ultimos_envios.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="text-xs">
                          <span className="font-medium">{tipoLibroLabel(e.tipo_libro)}</span>
                          <span className="text-muted-foreground ml-2">
                            {e.ejercicio}/{e.periodo}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {e.num_registros || 0} reg.
                        </span>
                        {estadoBadge(e.estado)}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(e.enviado_at || e.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly stats chart */}
          {stats?.mensual && stats.mensual.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 size={16} /> Desglose mensual {new Date().getFullYear()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 px-2">Periodo</th>
                        <th className="text-left py-2 px-2">Libro</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="text-right py-2 px-2">Aceptados</th>
                        <th className="text-right py-2 px-2">Rechazados</th>
                        <th className="text-right py-2 px-2">Base total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.mensual.map((m, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-2 font-mono">{m.periodo}</td>
                          <td className="py-2 px-2">{tipoLibroLabel(m.tipo_libro)}</td>
                          <td className="py-2 px-2 text-right">{m.total}</td>
                          <td className="py-2 px-2 text-right text-green-600">{m.aceptados}</td>
                          <td className="py-2 px-2 text-right text-red-600">{m.rechazados}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(Number(m.total_base || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── CONFIG TAB ────────────────────────────────────── */}
      {tab === "config" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings size={16} /> Configuracion SII
            </CardTitle>
            <CardDescription>
              Parametros del Suministro Inmediato de Informacion para esta empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SII Activo */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">SII Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Habilitar el envio de facturas al SII de la AEAT
                </p>
              </div>
              <Switch
                checked={config?.sii_activo || false}
                onCheckedChange={(checked) =>
                  handleSaveConfig({ ...config!, sii_activo: checked })
                }
                disabled={saving}
              />
            </div>

            {/* Obligatorio */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Obligatorio (&gt;6M facturacion)</Label>
                <p className="text-xs text-muted-foreground">
                  Marcar si la empresa supera los 6M de facturacion anual
                </p>
              </div>
              <Switch
                checked={config?.sii_obligatorio || false}
                onCheckedChange={(checked) =>
                  handleSaveConfig({ ...config!, sii_obligatorio: checked })
                }
                disabled={saving}
              />
            </div>

            {/* Motivo */}
            <div>
              <Label className="font-medium">Motivo alta SII</Label>
              <select
                value={config?.sii_motivo || "voluntario"}
                onChange={(e) =>
                  handleSaveConfig({ ...config!, sii_motivo: e.target.value })
                }
                className="mt-1 border rounded-md px-3 py-2 text-sm bg-background w-full max-w-xs"
                disabled={saving}
              >
                <option value="voluntario">Voluntario</option>
                <option value="facturacion_6m">Facturacion &gt; 6M</option>
                <option value="redeme">REDEME</option>
                <option value="grupo_iva">Grupo de IVA</option>
              </select>
            </div>

            {/* Modo */}
            <div>
              <Label className="font-medium">Modo de envio</Label>
              <select
                value={config?.modo || "manual"}
                onChange={(e) =>
                  handleSaveConfig({ ...config!, modo: e.target.value })
                }
                className="mt-1 border rounded-md px-3 py-2 text-sm bg-background w-full max-w-xs"
                disabled={saving}
              >
                <option value="manual">Manual - Preparar y enviar manualmente</option>
                <option value="semi_automatico">Semi-automatico - Preparar auto, enviar manual</option>
                <option value="automatico">Automatico - Envio automatico (requiere certificado)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                En modo automatico las facturas se envian al SII automaticamente al emitirse
              </p>
            </div>

            {/* Entorno */}
            <div>
              <Label className="font-medium">Entorno</Label>
              <select
                value={config?.entorno || "test"}
                onChange={(e) =>
                  handleSaveConfig({ ...config!, entorno: e.target.value })
                }
                className="mt-1 border rounded-md px-3 py-2 text-sm bg-background w-full max-w-xs"
                disabled={saving}
              >
                <option value="test">Pruebas (AEAT sandbox)</option>
                <option value="produccion">Produccion (AEAT real)</option>
              </select>
              {config?.entorno === "produccion" && (
                <p className="text-xs text-red-600 mt-1">
                  Los envios a produccion se registran oficialmente en la AEAT
                </p>
              )}
            </div>

            {/* Certificado */}
            <div>
              <Label className="font-medium">Certificado digital</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {config?.certificado_nombre
                  ? `Certificado: ${config.certificado_nombre}`
                  : "No hay certificado asignado. Configuralo en la seccion de Certificados Digitales."}
              </p>
            </div>

            {/* Notas */}
            <div>
              <Label className="font-medium">Notas</Label>
              <textarea
                value={config?.notas || ""}
                onChange={(e) => setConfig((prev) => prev ? { ...prev, notas: e.target.value } : prev)}
                onBlur={() => config && handleSaveConfig(config)}
                className="mt-1 border rounded-md px-3 py-2 text-sm bg-background w-full max-w-lg min-h-[80px]"
                placeholder="Notas internas sobre la configuracion SII de este cliente..."
                disabled={saving}
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Sobre el SII</p>
              <ul className="text-xs text-blue-600 dark:text-blue-400/80 space-y-1">
                <li>Obligatorio para empresas con facturacion superior a 6 millones de euros</li>
                <li>Obligatorio para inscritos en el REDEME y grupos de IVA</li>
                <li>Plazo de envio: 4 dias habiles desde la fecha de expedicion</li>
                <li>Se comunican facturas emitidas, recibidas, bienes de inversion y operaciones intracomunitarias</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── ENVIOS TAB ────────────────────────────────────── */}
      {tab === "envios" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Historial de envios</CardTitle>
                <CardDescription>{enviosTotal} envios registrados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {envios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay envios registrados. Usa &quot;Preparar envio&quot; en la pestana Resumen.
              </p>
            ) : (
              <div className="space-y-1">
                {envios.map((envio) => (
                  <div key={envio.id} className="border rounded-lg overflow-hidden">
                    {/* Envio row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleEnvioDetalle(envio.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedEnvio === envio.id ? (
                          <ChevronDown size={14} className="text-muted-foreground" />
                        ) : (
                          <ChevronRight size={14} className="text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {tipoLibroLabel(envio.tipo_libro)}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {envio.ejercicio}/{envio.periodo}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {envio.tipo_comunicacion === "A0" ? "Alta" : envio.tipo_comunicacion === "A1" ? "Modificacion" : envio.tipo_comunicacion}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(envio.enviado_at || envio.created_at)}
                            {envio.num_registros ? ` | ${envio.num_registros} registros` : ""}
                            {envio.csv_aeat ? ` | CSV: ${envio.csv_aeat}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {envio.registros_correctos > 0 && (
                          <span className="text-[10px] text-green-600">{envio.registros_correctos} ok</span>
                        )}
                        {envio.registros_con_errores > 0 && (
                          <span className="text-[10px] text-red-600">{envio.registros_con_errores} err</span>
                        )}
                        {estadoBadge(envio.estado)}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedEnvio === envio.id && (
                      <div className="border-t bg-muted/20 px-4 py-3">
                        {envio.aeat_error_desc && (
                          <div className="bg-red-50 dark:bg-red-900/10 rounded p-3 mb-3">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400">Error AEAT</p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                              {envio.aeat_error_desc}
                            </p>
                          </div>
                        )}

                        {envio.detalle_errores && (
                          <div className="bg-amber-50 dark:bg-amber-900/10 rounded p-3 mb-3">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Detalle errores</p>
                            <pre className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 whitespace-pre-wrap">
                              {JSON.stringify(envio.detalle_errores, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Registros */}
                        {envioDetalle[envio.id]?.registros && envioDetalle[envio.id].registros!.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Registros ({envioDetalle[envio.id].registros!.length})
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-1.5 px-2">Factura</th>
                                    <th className="text-left py-1.5 px-2">Contraparte</th>
                                    <th className="text-left py-1.5 px-2">NIF</th>
                                    <th className="text-left py-1.5 px-2">Tipo</th>
                                    <th className="text-right py-1.5 px-2">Base</th>
                                    <th className="text-right py-1.5 px-2">IVA</th>
                                    <th className="text-right py-1.5 px-2">Cuota</th>
                                    <th className="text-center py-1.5 px-2">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {envioDetalle[envio.id].registros!.map((reg) => (
                                    <tr key={reg.id} className="border-b last:border-0">
                                      <td className="py-1.5 px-2 font-mono">{reg.numero_factura}</td>
                                      <td className="py-1.5 px-2 truncate max-w-[150px]">{reg.nombre_contraparte}</td>
                                      <td className="py-1.5 px-2 font-mono">{reg.nif_contraparte}</td>
                                      <td className="py-1.5 px-2">{reg.tipo_factura_sii}</td>
                                      <td className="py-1.5 px-2 text-right">{formatCurrency(Number(reg.base_imponible || 0))}</td>
                                      <td className="py-1.5 px-2 text-right">{reg.tipo_impositivo}%</td>
                                      <td className="py-1.5 px-2 text-right">{formatCurrency(Number(reg.cuota_repercutida || 0))}</td>
                                      <td className="py-1.5 px-2 text-center">
                                        {reg.estado_registro ? estadoBadge(reg.estado_registro) : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {envioDetalle[envio.id].registros!.some((r) => r.descripcion_error) && (
                              <div className="mt-2 space-y-1">
                                {envioDetalle[envio.id].registros!
                                  .filter((r) => r.descripcion_error)
                                  .map((r) => (
                                    <div key={r.id} className="text-[10px] text-red-600">
                                      <span className="font-mono">{r.numero_factura}</span>: [{r.codigo_error}] {r.descripcion_error}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {envio.estado === "pendiente" && (
                          <div className="flex gap-2 mt-3 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSimular(envio.id);
                              }}
                              disabled={simulando}
                            >
                              <Eye size={14} className="mr-1" /> Simular
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
