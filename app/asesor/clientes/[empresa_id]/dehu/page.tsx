"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Loader2, Inbox, Wifi } from "lucide-react";

interface Notificacion {
  id: string;
  identificador: string;
  organismo: string | null;
  concepto: string | null;
  fecha_puesta_disposicion: string | null;
  fecha_caducidad: string | null;
  estado: string;
  acuse_recibido_at: string | null;
  acuse_csv: string | null;
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  leida: { label: "Leída", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", cls: "bg-red-50 text-red-700 border-red-200" },
  expirada: { label: "Expirada", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function AsesorClienteDehuPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const queryClient = useQueryClient();

  const [filtro, setFiltro] = useState<string>("todas");
  const [syncing, setSyncing] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [actuando, setActuando] = useState<string | null>(null);
  const [livePolling, setLivePolling] = useState(true);

  const baseUrl = `/asesor/clientes/${empresaId}/dehu`;

  // Live polling con React Query — refetch cada 60s para ver notificaciones nuevas
  // sin necesidad de pulsar refrescar manualmente. Se desactiva si la pestaña no
  // está visible (refetchIntervalInBackground=false).
  const queryKey = ["asesor", "dehu-notificaciones", empresaId, filtro];
  const { data, isLoading: loading, dataUpdatedAt } = useQuery<{ notificaciones: Notificacion[] }>({
    queryKey,
    queryFn: async () => {
      const params: any = {};
      if (filtro !== "todas") params.estado = filtro;
      const res = await api.get(`${baseUrl}/notificaciones`, { params });
      return { notificaciones: res.data?.notificaciones || [] };
    },
    refetchInterval: livePolling ? 60_000 : false, // 60s
    refetchIntervalInBackground: false,
  });
  const items = data?.notificaciones || [];

  function reload() {
    queryClient.invalidateQueries({ queryKey });
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await api.post(`${baseUrl}/sync`);
      if (res.data?.ok) {
        showSuccess(`Sincronizado: ${res.data.nuevas || 0} notificaciones nuevas`);
      } else {
        showError(res.data?.mensaje || "Error sincronizando");
      }
      reload();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error sincronizando");
    } finally {
      setSyncing(false);
    }
  }

  async function probarConexion() {
    setTestingConn(true);
    try {
      const res = await api.post(`${baseUrl}/test`);
      if (res.data?.ok) showSuccess(res.data.mensaje);
      else showError(res.data?.mensaje || "Conexión falló");
    } catch (err: any) {
      showError(err.response?.data?.error || "Error de conexión");
    } finally {
      setTestingConn(false);
    }
  }

  async function cambiarEstado(id: string, estado: "leida" | "rechazada") {
    setActuando(id);
    try {
      await api.put(`${baseUrl}/notificaciones/${id}/estado`, { estado });
      showSuccess(estado === "leida" ? "Marcada como leída" : "Marcada como rechazada");
      reload();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error actualizando estado");
    } finally {
      setActuando(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const pendientes = items.filter((n) => n.estado === "pendiente").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6" />
            DEHú — Notificaciones electrónicas
            {pendientes > 0 && (
              <Badge variant="destructive" className="ml-2">{pendientes} pendientes</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Notificaciones electrónicas de AEAT, TGSS y otros organismos para este cliente.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => setLivePolling((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              livePolling
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-muted text-muted-foreground border-transparent"
            }`}
            title={livePolling ? "Refresco automático cada 60s. Click para pausar." : "Pausado. Click para reactivar."}
          >
            <Wifi size={12} className={livePolling ? "animate-pulse" : ""} />
            {livePolling ? "Live" : "Pausado"}
          </button>
          {dataUpdatedAt > 0 && (
            <span className="text-[10px] text-muted-foreground" title={new Date(dataUpdatedAt).toLocaleString("es-ES")}>
              Última lectura: {new Date(dataUpdatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button variant="outline" onClick={probarConexion} disabled={testingConn}>
            {testingConn ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            Probar conexión
          </Button>
          <Button onClick={sync} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar con DEHú
          </Button>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="pt-4">
          <div className="flex gap-2 items-start text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-medium text-amber-900">Importante: DEHú vive en red SARA</p>
                <p className="text-xs text-amber-800 mt-1">
                  El SOAP oficial de DEHú no es accesible desde internet público. Para usar la sincronización
                  necesitas: (a) un intermediario comercial con acceso a SARA, (b) VPN/punto de acceso a red SARA,
                  o (c) integración con scraping web del portal público (en desarrollo).
                </p>
              </div>
              <div>
                <p className="font-medium text-amber-900">Pasos para activar:</p>
                <ol className="text-xs text-amber-800 mt-1 ml-4 list-decimal space-y-0.5">
                  <li>Cliente suscrito al buzón en <a href="https://dehu.redsara.es" target="_blank" rel="noreferrer" className="underline">dehu.redsara.es</a></li>
                  <li>Credenciales en pestaña <strong>Integraciones</strong> (reutilizar cert AEAT del cliente)</li>
                  <li>El fabricante activa <code className="bg-amber-100 px-1 rounded">dehu_soap_enabled</code> en /admin/app-config</li>
                  <li>Pulsa "Sincronizar" — recibirás un mensaje claro si no es alcanzable</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {["todas", "pendiente", "leida", "rechazada"].map((e) => (
          <Button
            key={e}
            variant={filtro === e ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltro(e)}
          >
            {e === "todas" ? "Todas" : ESTADO_BADGE[e]?.label || e}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p>No hay notificaciones registradas.</p>
            <p className="text-xs mt-1">Pulsa "Sincronizar con DEHú" para consultar pendientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const badge = ESTADO_BADGE[n.estado] || ESTADO_BADGE.pendiente;
            const expirada = n.fecha_caducidad && new Date(n.fecha_caducidad) < new Date();
            return (
              <Card key={n.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{n.organismo || "—"}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                      {expirada && n.estado === "pendiente" && (
                        <Badge variant="destructive" className="text-[10px]">⚠ Expirada</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">ID {n.identificador}</span>
                    </div>
                    <p className="font-medium text-sm mt-1">{n.concepto || "(sin concepto)"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.fecha_puesta_disposicion && (
                        <>Puesta a disposición: {new Date(n.fecha_puesta_disposicion).toLocaleDateString("es-ES")}</>
                      )}
                      {n.fecha_caducidad && (
                        <> · Caduca: {new Date(n.fecha_caducidad).toLocaleDateString("es-ES")}</>
                      )}
                    </p>
                    {n.acuse_csv && (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        ✓ Acuse: <code className="bg-emerald-50 px-1 rounded">{n.acuse_csv}</code>
                      </p>
                    )}
                  </div>
                  {n.estado === "pendiente" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="outline" disabled={actuando === n.id} onClick={() => cambiarEstado(n.id, "leida")}>
                        {actuando === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button size="sm" variant="outline" disabled={actuando === n.id} onClick={() => cambiarEstado(n.id, "rechazada")}>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
