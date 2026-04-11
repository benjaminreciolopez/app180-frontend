"use client";

import { useState } from "react";
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
  { id: "100", label: "Renta IRPF", tipo: "anual" },
  { id: "200", label: "Imp. Sociedades", tipo: "anual" },
];

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

export default function AeatConsultaPanel({ year, trimestre, apiBasePath = "/api/admin/fiscal/consulta" }: { year: string; trimestre: string; apiBasePath?: string }) {
  const [modeloSeleccionado, setModeloSeleccionado] = useState("303");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(`${trimestre}T`);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState<string | null>(null);
  const [detalleData, setDetalleData] = useState<any>(null);

  const modeloConfig = TODOS_MODELOS.find(m => m.id === modeloSeleccionado);
  const esTrimestral = modeloConfig?.tipo === "trimestral";

  const handleConsultar = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const res = await authenticatedFetch("${apiBasePath}/consultar", {
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
        throw new Error(data.error || "Error consultando AEAT");
      }

      const data = await res.json();
      setResultado(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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
      const res = await authenticatedFetch(`/api/admin/fiscal/consulta/${consultaId}/resolver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discrepancia_id: discrepanciaId, accion }),
      });

      if (res.ok) {
        // Recargar detalle
        if (vistaDetalle) handleVerDetalle(vistaDetalle);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel de consulta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Consultar Declaraciones en AEAT
          </CardTitle>
          <CardDescription>
            Consulta las declaraciones presentadas en AEAT usando el certificado electr&oacute;nico y compara con los datos de la app
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
            <Button onClick={handleConsultar} disabled={loading} className="gap-2">
              {loading ? <LoadingSpinner /> : <Search className="h-4 w-4" />}
              Consultar AEAT
            </Button>

            <Button variant="outline" onClick={handleCargarHistorial} disabled={loadingHistorial} className="gap-2">
              {loadingHistorial ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}
              Ver Historial
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado de la consulta */}
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
              Resultado Consulta: {modeloConfig?.label} {esTrimestral ? periodoSeleccionado : ""} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Resumen de discrepancias */}
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
                  <p className="text-sm text-green-600">Los datos de la app coinciden con los presentados en AEAT</p>
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

      {/* Historial de consultas */}
      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Consultas - {year}</CardTitle>
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

      {/* Detalle de consulta seleccionada */}
      {vistaDetalle && detalleData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Detalle Consulta: {detalleData.consulta?.modelo} {detalleData.consulta?.periodo} {detalleData.consulta?.ejercicio}
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
            <th className="text-right py-2 px-3 font-medium text-slate-500">Valor App</th>
            <th className="text-right py-2 px-3 font-medium text-slate-500">Valor AEAT</th>
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
                        title="Actualizar app con valor AEAT"
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
