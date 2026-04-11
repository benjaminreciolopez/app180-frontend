"use client";

import { useState, useRef } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  ArrowRight,
  Upload,
  ExternalLink,
  FileDown,
} from "lucide-react";

interface Discrepancia {
  id: string;
  casilla: string;
  campo_app: string;
  descripcion_campo: string;
  valor_app: number;
  valor_aeat: number;
  diferencia: number;
  porcentaje_diferencia: number;
  severidad: "alta" | "media" | "baja";
  estado: string;
}

interface ConsultaResult {
  consulta: any;
  resumen: { total: number; altas: number; medias: number; bajas: number };
  discrepancias: Discrepancia[];
}

interface HistorialItem {
  id: string;
  modelo: string;
  periodo: string;
  fecha_consulta: string;
  estado: string;
  discrepancias_resumen: { total: number; altas: number; medias: number; bajas: number };
  total_discrepancias: number;
  discrepancias_altas: number;
}

const TODOS_MODELOS = [
  { id: "303", label: "Modelo 303", tipo: "trimestral" },
  { id: "130", label: "Modelo 130", tipo: "trimestral" },
  { id: "111", label: "Modelo 111", tipo: "trimestral" },
  { id: "115", label: "Modelo 115", tipo: "trimestral" },
  { id: "349", label: "Modelo 349", tipo: "trimestral" },
  { id: "390", label: "Modelo 390", tipo: "anual" },
  { id: "190", label: "Modelo 190", tipo: "anual" },
  { id: "180", label: "Modelo 180", tipo: "anual" },
  { id: "347", label: "Modelo 347", tipo: "anual" },
];

// Enlaces a la Sede Electrónica de AEAT para descargar/consultar cada modelo
const AEAT_ENLACES: Record<string, string> = {
  "303": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml",
  "130": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml",
  "111": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI05.shtml",
  "115": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI07.shtml",
  "349": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI36.shtml",
  "390": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI35.shtml",
  "190": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml",
  "180": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI06.shtml",
  "347": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml",
};

const SEVERIDAD_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-800 border-red-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baja: "bg-blue-100 text-blue-800 border-blue-200",
};

const SEVERIDAD_ICONS: Record<string, any> = {
  alta: XCircle,
  media: AlertTriangle,
  baja: ShieldCheck,
};

function getExtensionModelo(modelo: string): string {
  const AUTOLIQ = ["303", "130", "111", "115"];
  if (AUTOLIQ.includes(modelo)) return ".ses";
  return `.${modelo}`;
}

export default function AeatConsultaPanel({ year, trimestre, apiBasePath = "/api/admin/fiscal/consulta" }: { year: string; trimestre: string; apiBasePath?: string }) {
  const [modeloSeleccionado, setModeloSeleccionado] = useState("303");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(`${trimestre}T`);
  const [loading, setLoading] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);
  const [detalleData, setDetalleData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modeloConfig = TODOS_MODELOS.find(m => m.id === modeloSeleccionado);
  const esTrimestral = modeloConfig?.tipo === "trimestral";

  const handleVerificar = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const res = await authenticatedFetch(`${apiBasePath}/consultar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo: modeloSeleccionado,
          ejercicio: parseInt(year),
          periodo: esTrimestral ? periodoSeleccionado : "0A",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error verificando modelo");
      }

      const data = await res.json();
      setResultado(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportarFichero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);
    setImportMsg(null);
    setError(null);

    try {
      const contenido = await file.text();

      const res = await authenticatedFetch(`${apiBasePath}/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo: modeloSeleccionado,
          ejercicio: parseInt(year),
          periodo: esTrimestral ? periodoSeleccionado : "0A",
          contenido_fichero: contenido,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error importando fichero");
      }

      const data = await res.json();
      setImportMsg(`Modelo ${modeloSeleccionado} importado correctamente. Ya puedes verificar discrepancias.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingImport(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCargarHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await authenticatedFetch(
        `${apiBasePath}/historial?ejercicio=${year}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setHistorial(data.consultas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleVerDetalle = async (consultaId: string) => {
    try {
      const res = await authenticatedFetch(`${apiBasePath}/${consultaId}`);
      if (res.ok) {
        const data = await res.json();
        setDetalleData(data);
        setVistaDetalle(consultaId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolverDiscrepancia = async (discrepanciaId: string, accion: string) => {
    try {
      const consultaId = detalleData?.consulta?.id || resultado?.consulta?.id;
      const res = await authenticatedFetch(`${apiBasePath}/${consultaId}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discrepancia_id: discrepanciaId, accion }),
      });

      if (res.ok) {
        if (vistaDetalle) handleVerDetalle(vistaDetalle);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Verificar Modelos Presentados
          </CardTitle>
          <CardDescription>
            Compara los datos presentados con los datos actuales para detectar discrepancias.
            Importa ficheros de modelos presentados desde AEAT o verifica los presentados desde la app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Selector de modelo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Modelo</label>
              <Select value={modeloSeleccionado} onValueChange={setModeloSeleccionado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header-trim" disabled>Trimestrales</SelectItem>
                  {TODOS_MODELOS.filter(m => m.tipo === "trimestral").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                  <SelectItem value="header-anual" disabled>Anuales</SelectItem>
                  {TODOS_MODELOS.filter(m => m.tipo === "anual").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de periodo (solo trimestrales) */}
            {esTrimestral && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Periodo</label>
                <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1T">1T</SelectItem>
                    <SelectItem value="2T">2T</SelectItem>
                    <SelectItem value="3T">3T</SelectItem>
                    <SelectItem value="4T">4T</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botones */}
            <Button onClick={handleVerificar} disabled={loading} className="gap-2">
              {loading ? <LoadingSpinner /> : <Search className="h-4 w-4" />}
              Verificar
            </Button>

            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept={getExtensionModelo(modeloSeleccionado) + ",.txt,.ses"}
                onChange={handleImportarFichero}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingImport}
                className="gap-2"
              >
                {loadingImport ? <LoadingSpinner /> : <Upload className="h-4 w-4" />}
                Importar Fichero ({getExtensionModelo(modeloSeleccionado)})
              </Button>
            </div>

            <Button variant="outline" onClick={handleCargarHistorial} disabled={loadingHistorial} className="gap-2">
              {loadingHistorial ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}
              Historial
            </Button>
          </div>

          {/* Enlace a Sede Electrónica */}
          {AEAT_ENLACES[modeloSeleccionado] && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-blue-700">
                Descarga el fichero presentado desde la{" "}
                <a
                  href={AEAT_ENLACES[modeloSeleccionado]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-blue-900"
                >
                  Sede Electrónica de AEAT - Modelo {modeloSeleccionado}
                </a>
                {" "}e impórtalo aquí para verificar discrepancias.
              </span>
            </div>
          )}

          {importMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              {importMsg}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado de la verificación */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultado.resumen.altas > 0 ? (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              ) : resultado.resumen.medias > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              )}
              Resultado: {modeloConfig?.label} {esTrimestral ? periodoSeleccionado : ""} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold">{resultado.resumen.total}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{resultado.resumen.altas}</div>
                <div className="text-xs text-red-600">Altas</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{resultado.resumen.medias}</div>
                <div className="text-xs text-yellow-600">Medias</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{resultado.resumen.bajas}</div>
                <div className="text-xs text-blue-600">Bajas</div>
              </div>
            </div>

            {resultado.resumen.total === 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Sin discrepancias</p>
                  <p className="text-sm text-green-600">Los datos actuales coinciden con los presentados</p>
                </div>
              </div>
            ) : (
              <DiscrepanciaTable
                discrepancias={resultado.discrepancias}
                onResolver={handleResolverDiscrepancia}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Verificaciones - {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historial.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{h.modelo}</Badge>
                    {h.periodo && <span className="text-sm text-slate-500">{h.periodo}</span>}
                    <span className="text-xs text-slate-400">
                      {new Date(h.fecha_consulta).toLocaleDateString("es-ES", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.discrepancias_altas > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">{h.discrepancias_altas} altas</Badge>
                    )}
                    {h.total_discrepancias > 0 ? (
                      <Badge variant="secondary">{h.total_discrepancias} discr.</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">OK</Badge>
                    )}
                    <Badge variant={h.estado === "resuelto" ? "default" : "outline"}>
                      {h.estado}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleVerDetalle(h.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle */}
      {vistaDetalle && detalleData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Detalle: {detalleData.consulta?.modelo} {detalleData.consulta?.periodo} {detalleData.consulta?.ejercicio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiscrepanciaTable
              discrepancias={detalleData.discrepancias || []}
              onResolver={handleResolverDiscrepancia}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DiscrepanciaTable({
  discrepancias,
  onResolver,
}: {
  discrepancias: Discrepancia[];
  onResolver: (id: string, accion: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 font-medium text-slate-500">Severidad</th>
            <th className="text-left py-2 px-3 font-medium text-slate-500">Casilla</th>
            <th className="text-left py-2 px-3 font-medium text-slate-500">Campo</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Valor Actual</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Valor Presentado</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Diferencia</th>
            <th className="text-center py-2 px-3 font-medium text-slate-500">Estado</th>
            <th className="text-center py-2 px-3 font-medium text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {discrepancias.map((d, i) => {
            const Icon = SEVERIDAD_ICONS[d.severidad] || ShieldCheck;
            return (
              <tr key={d.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3">
                  <Badge className={SEVERIDAD_COLORS[d.severidad]}>
                    <Icon className="h-3 w-3 mr-1" />
                    {d.severidad}
                  </Badge>
                </td>
                <td className="py-2 px-3 font-mono text-xs">{d.casilla}</td>
                <td className="py-2 px-3">{d.descripcion_campo || d.campo_app}</td>
                <td className="py-2 px-3 text-right font-mono">{formatCurrency(d.valor_app)}</td>
                <td className="py-2 px-3 text-right font-mono">{formatCurrency(d.valor_aeat)}</td>
                <td className="py-2 px-3 text-right font-mono text-red-600">
                  {formatCurrency(d.diferencia)}
                  {d.porcentaje_diferencia > 0 && (
                    <span className="text-xs text-slate-400 ml-1">({d.porcentaje_diferencia}%)</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <Badge variant={d.estado === "pendiente" ? "outline" : "default"} className="text-xs">
                    {d.estado}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-center">
                  {d.estado === "pendiente" && (
                    <div className="flex gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-green-700 hover:bg-green-50"
                        onClick={() => onResolver(d.id, "actualizar_app")}
                        title="Actualizar app con valor presentado"
                      >
                        Corregir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 text-slate-500 hover:bg-slate-100"
                        onClick={() => onResolver(d.id, "ignorar")}
                        title="Ignorar esta discrepancia"
                      >
                        Ignorar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
