"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarOff, CheckCircle, XCircle, Plus, Loader2 } from "lucide-react";
import { useLiveTable } from "@/hooks/useLiveTable";
import { LiveIndicator } from "@/components/shared/LiveIndicator";

interface Ausencia {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  motivo: string | null;
  comentario_empleado: string | null;
  comentario_admin: string | null;
  creado_en: string;
}

interface Empleado {
  id: string;
  nombre: string;
}

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  aprobado: { label: "Aprobada", cls: "bg-green-50 text-green-700 border-green-200" },
  rechazado: { label: "Rechazada", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function AsesorClienteAusenciasPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [actuando, setActuando] = useState<string | null>(null);

  // Live polling cada 60s — el asesor debería ver solicitudes nuevas al instante
  const {
    data: ausenciasData,
    loading,
    livePolling,
    setLivePolling,
    lastUpdated,
    refresh: refreshAusencias,
  } = useLiveTable<{ ausencias: Ausencia[] }>({
    queryKey: ["asesor", "ausencias", empresaId, filtroEstado],
    queryFn: async () => {
      const params: any = {};
      if (filtroEstado !== "todos") params.estado = filtroEstado;
      const res = await api.get(`/asesor/clientes/${empresaId}/ausencias`, { params });
      return { ausencias: res.data?.ausencias || [] };
    },
    intervalMs: 60_000,
  });
  const ausencias = ausenciasData?.ausencias || [];

  const [crearOpen, setCrearOpen] = useState(false);
  const [crearForm, setCrearForm] = useState({
    empleado_id: "",
    tipo: "vacaciones",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    comentario: "",
  });
  const [crearSaving, setCrearSaving] = useState(false);

  useEffect(() => {
    loadEmpleados();
  }, [empresaId]);

  // Wrapper para mantener compatibilidad con código existente que llama a
  // `loadAusencias()` tras una mutación. Ahora invalida el cache de useLiveTable.
  const loadAusencias = () => refreshAusencias();

  async function loadEmpleados() {
    try {
      const res = await api.get(`/asesor/empleados?empresa_id=${empresaId}`);
      setEmpleados((res.data?.data || []).filter((e: any) => e.activo));
    } catch {
      /* silent */
    }
  }

  async function aprobar(id: string) {
    setActuando(id);
    try {
      await api.put(`/asesor/clientes/${empresaId}/ausencias/${id}/aprobar`);
      showSuccess("Ausencia aprobada");
      await loadAusencias();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error aprobando ausencia");
    } finally {
      setActuando(null);
    }
  }

  async function rechazar(id: string) {
    const motivo = prompt("Motivo del rechazo (opcional):") || undefined;
    setActuando(id);
    try {
      await api.put(`/asesor/clientes/${empresaId}/ausencias/${id}/rechazar`, { motivo });
      showSuccess("Ausencia rechazada");
      await loadAusencias();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error rechazando ausencia");
    } finally {
      setActuando(null);
    }
  }

  async function crearAusencia() {
    if (!crearForm.empleado_id || !crearForm.fecha_inicio || !crearForm.fecha_fin) {
      showError("Empleado y fechas son obligatorios");
      return;
    }
    setCrearSaving(true);
    try {
      await api.post(`/asesor/clientes/${empresaId}/ausencias`, crearForm);
      showSuccess("Ausencia creada y aprobada");
      setCrearOpen(false);
      setCrearForm({ empleado_id: "", tipo: "vacaciones", fecha_inicio: "", fecha_fin: "", motivo: "", comentario: "" });
      await loadAusencias();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error creando ausencia");
    } finally {
      setCrearSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const pendientes = ausencias.filter((a) => a.estado === "pendiente").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarOff className="w-6 h-6" />
            Ausencias
          </h1>
          <p className="text-sm text-muted-foreground">
            Vacaciones, bajas médicas y permisos de los empleados.
            {pendientes > 0 && <span className="ml-1 text-amber-700 font-medium">{pendientes} pendientes</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <LiveIndicator
            livePolling={livePolling}
            onToggle={() => setLivePolling(!livePolling)}
            lastUpdated={lastUpdated}
            intervalSeconds={60}
          />
          <Button onClick={() => setCrearOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva ausencia
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["todos", "pendiente", "aprobado", "rechazado"].map((e) => (
          <Button
            key={e}
            variant={filtroEstado === e ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroEstado(e)}
          >
            {e === "todos" ? "Todas" : e.charAt(0).toUpperCase() + e.slice(1) + (e === "aprobado" || e === "rechazado" ? "s" : "s")}
          </Button>
        ))}
      </div>

      {ausencias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No hay ausencias para mostrar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ausencias.map((a) => {
            const badge = ESTADO_BADGE[a.estado] || ESTADO_BADGE.pendiente;
            return (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{a.empleado_nombre}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.tipo === "baja_medica" ? "Baja médica" : "Vacaciones"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Del {new Date(a.fecha_inicio).toLocaleDateString("es-ES")} al{" "}
                      {new Date(a.fecha_fin).toLocaleDateString("es-ES")}
                    </p>
                    {a.motivo && <p className="text-xs mt-1">📋 {a.motivo}</p>}
                    {a.comentario_empleado && (
                      <p className="text-xs italic text-muted-foreground mt-1">
                        Empleado: "{a.comentario_empleado}"
                      </p>
                    )}
                    {a.comentario_admin && (
                      <p className="text-xs italic text-muted-foreground mt-1">
                        Admin/Asesor: "{a.comentario_admin}"
                      </p>
                    )}
                  </div>
                  {a.estado === "pendiente" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => aprobar(a.id)} disabled={actuando === a.id}>
                        {actuando === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rechazar(a.id)} disabled={actuando === a.id}>
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

      {/* Modal Crear Ausencia */}
      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva ausencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Empleado *</label>
              <select
                value={crearForm.empleado_id}
                onChange={(e) => setCrearForm((f) => ({ ...f, empleado_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">— selecciona —</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={crearForm.tipo}
                onChange={(e) => setCrearForm((f) => ({ ...f, tipo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="vacaciones">Vacaciones</option>
                <option value="baja_medica">Baja médica</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Inicio *</label>
                <Input
                  type="date"
                  value={crearForm.fecha_inicio}
                  onChange={(e) => setCrearForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fin *</label>
                <Input
                  type="date"
                  value={crearForm.fecha_fin}
                  onChange={(e) => setCrearForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Motivo / nota</label>
              <Input
                value={crearForm.motivo}
                onChange={(e) => setCrearForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrearOpen(false)} disabled={crearSaving}>
              Cancelar
            </Button>
            <Button onClick={crearAusencia} disabled={crearSaving} className="gap-2">
              {crearSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear y aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
