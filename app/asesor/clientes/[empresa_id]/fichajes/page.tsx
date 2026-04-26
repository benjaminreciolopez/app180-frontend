"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLiveTable } from "@/hooks/useLiveTable";
import { LiveIndicator } from "@/components/shared/LiveIndicator";

interface Fichaje {
  id: string;
  empleado_id: string;
  fecha: string;
  tipo: string;
  estado: string | null;
  sospechoso: boolean;
  sospecha_motivo: string | null;
  nota: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  nombre_empleado: string;
  // sólo en sospechosos:
  nombre_cliente?: string;
  distancia_km?: number;
}

export default function AsesorClienteFichajesPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [tab, setTab] = useState<"todos" | "sospechosos">("sospechosos");
  const [actuando, setActuando] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [motivoMasivo, setMotivoMasivo] = useState("");
  const [accionMasiva, setAccionMasiva] = useState(false);

  // Sospechosos en vivo cada 60s — son alertas que requieren atención del asesor
  const sospLive = useLiveTable<{ fichajes: Fichaje[] }>({
    queryKey: ["asesor", "fichajes-sospechosos", empresaId],
    queryFn: async () => {
      const res = await api.get(`/asesor/clientes/${empresaId}/fichajes/sospechosos`);
      return { fichajes: res.data?.fichajes || [] };
    },
    intervalMs: 60_000,
  });
  const sospechosos = sospLive.data?.fichajes || [];

  // Lista completa: cache 5 min, sin polling (no urgente)
  const todosLive = useLiveTable<{ fichajes: Fichaje[] }>({
    queryKey: ["asesor", "fichajes-todos", empresaId],
    queryFn: async () => {
      const res = await api.get(`/asesor/clientes/${empresaId}/fichajes`);
      return { fichajes: res.data?.fichajes || [] };
    },
    intervalMs: 5 * 60_000,
    livePollingDefault: false,
  });
  const fichajes = todosLive.data?.fichajes || [];

  const loading = sospLive.loading || todosLive.loading;
  const loadFichajes = () => {
    sospLive.refresh();
    todosLive.refresh();
  };

  async function validar(id: string, accion: "confirmar" | "rechazar") {
    const motivo = accion === "rechazar" ? prompt("Motivo del rechazo (opcional):") : null;
    setActuando(id);
    try {
      await api.put(`/asesor/clientes/${empresaId}/fichajes/${id}/validar`, {
        accion,
        motivo: motivo || undefined,
      });
      showSuccess(accion === "confirmar" ? "Fichaje confirmado" : "Fichaje rechazado");
      await loadFichajes();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error validando fichaje");
    } finally {
      setActuando(null);
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function validarMasivo(accion: "confirmar" | "rechazar") {
    if (seleccionados.size === 0) {
      showError("Selecciona al menos un fichaje");
      return;
    }
    if (!confirm(`${accion === "confirmar" ? "Confirmar" : "Rechazar"} ${seleccionados.size} fichajes?`)) return;
    setAccionMasiva(true);
    try {
      const res = await api.put(`/asesor/clientes/${empresaId}/fichajes/validar-masivo`, {
        ids: Array.from(seleccionados),
        accion,
        motivo: motivoMasivo || undefined,
      });
      showSuccess(`${res.data?.total || 0} fichajes ${accion === "confirmar" ? "confirmados" : "rechazados"}`);
      setSeleccionados(new Set());
      setMotivoMasivo("");
      await loadFichajes();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error en validación masiva");
    } finally {
      setAccionMasiva(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Fichajes
          </h1>
          <p className="text-sm text-muted-foreground">
            Validación de fichajes y revisión de sospechosos.
          </p>
        </div>
        <LiveIndicator
          livePolling={sospLive.livePolling}
          onToggle={() => sospLive.setLivePolling(!sospLive.livePolling)}
          lastUpdated={sospLive.lastUpdated}
          intervalSeconds={60}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "todos" | "sospechosos")}>
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="sospechosos" className="gap-1.5 whitespace-nowrap">
              <AlertTriangle className="w-4 h-4" /> Sospechosos
              {sospechosos.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                  {sospechosos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-1.5 whitespace-nowrap">
              <Clock className="w-4 h-4" /> Todos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sospechosos" className="mt-4">
          {seleccionados.size > 0 && (
            <Card className="mb-3 border-amber-300 bg-amber-50">
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">{seleccionados.size} seleccionados</span>
                <input
                  type="text"
                  value={motivoMasivo}
                  onChange={(e) => setMotivoMasivo(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className="flex-1 min-w-[180px] border rounded px-3 py-1.5 text-sm"
                />
                <Button size="sm" onClick={() => validarMasivo("confirmar")} disabled={accionMasiva}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Confirmar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => validarMasivo("rechazar")} disabled={accionMasiva}>
                  <XCircle className="w-4 h-4 mr-1" /> Rechazar
                </Button>
              </CardContent>
            </Card>
          )}

          {sospechosos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay fichajes sospechosos pendientes de revisión.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sospechosos.map((f) => (
                <Card key={f.id} className={seleccionados.has(f.id) ? "ring-2 ring-amber-400" : ""}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(f.id)}
                      onChange={() => toggleSeleccion(f.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{f.nombre_empleado}</span>
                        <Badge variant="outline" className="text-[10px]">{f.tipo}</Badge>
                        {f.distancia_km != null && (
                          <Badge variant="destructive" className="text-[10px]">
                            {Number(f.distancia_km).toFixed(1)} km del cliente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(f.fecha).toLocaleString("es-ES")}
                      </p>
                      {f.sospecha_motivo && (
                        <p className="text-xs text-amber-700 mt-1">⚠ {f.sospecha_motivo}</p>
                      )}
                      {f.direccion && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {f.direccion}, {f.ciudad}, {f.pais}</p>
                      )}
                      {f.nota && <p className="text-xs italic mt-1">"{f.nota}"</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => validar(f.id, "confirmar")} disabled={actuando === f.id}>
                        {actuando === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => validar(f.id, "rechazar")} disabled={actuando === f.id}>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          {fichajes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No hay fichajes registrados.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {fichajes.map((f) => (
                <Card key={f.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{f.tipo}</Badge>
                    <span className="font-medium text-sm truncate">{f.nombre_empleado}</span>
                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                      {new Date(f.fecha).toLocaleString("es-ES")}
                    </span>
                    {f.estado && (
                      <Badge variant={f.estado === "confirmado" ? "default" : f.estado === "rechazado" ? "destructive" : "secondary"} className="text-[10px]">
                        {f.estado}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
