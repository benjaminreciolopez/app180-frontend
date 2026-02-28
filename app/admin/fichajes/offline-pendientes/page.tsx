"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { showSuccess, showError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { CloudOff, CheckCircle2, XCircle, Clock, Smartphone, Camera, User, ZoomIn } from "lucide-react";

interface OfflineFichaje {
  id: string;
  tipo: string;
  subtipo: string | null;
  fecha: string;
  estado: string;
  origen: string;
  offline_timestamp: string | null;
  offline_device_id: string | null;
  sync_batch_id: string | null;
  created_at: string;
  empleado_nombre: string;
  codigo_empleado: string | null;
  device_nombre: string | null;
  foto_verificacion_url: string | null;
  empleado_foto_url: string | null;
}

const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  descanso_inicio: "Inicio descanso",
  descanso_fin: "Fin descanso",
};

const SUBTIPO_LABELS: Record<string, string> = {
  pausa_corta: "Pausa corta",
  comida: "Comida",
  trayecto: "Desplazamiento",
};

export default function OfflinePendientesPage() {
  const confirm = useConfirm();
  const [fichajes, setFichajes] = useState<OfflineFichaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ perfil: string | null; captura: string | null; nombre: string } | null>(null);

  useEffect(() => {
    loadFichajes();
  }, []);

  const loadFichajes = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/fichajes/offline-pendientes");
      if (res.ok) {
        const data = await res.json();
        setFichajes(data.fichajes || []);
        setTotal(data.total || 0);
      }
    } catch {
      showError("Error al cargar fichajes pendientes");
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === fichajes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fichajes.map((f) => f.id)));
    }
  };

  const handleValidar = async (accion: "aprobar" | "rechazar", ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    const label = accion === "aprobar" ? "aprobar" : "rechazar";
    const confirmed = await confirm({
      title: `${accion === "aprobar" ? "Aprobar" : "Rechazar"} fichajes`,
      description: `Se van a ${label} ${targetIds.length} fichaje(s) offline. Esta acción no se puede deshacer.`,
      confirmLabel: accion === "aprobar" ? "Aprobar" : "Rechazar",
      variant: accion === "rechazar" ? "destructive" : "default",
    });

    if (!confirmed) return;

    setProcessing(true);
    try {
      const res = await authenticatedFetch("/api/fichajes/offline-validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds, accion }),
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess(`${data.procesados} fichaje(s) ${accion === "aprobar" ? "aprobados" : "rechazados"}`);
        setSelectedIds(new Set());
        loadFichajes();
      } else {
        const data = await res.json();
        showError(data.error || "Error al validar");
      }
    } catch {
      showError("Error de conexión");
    }
    setProcessing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CloudOff className="h-6 w-6 text-amber-500" />
            Fichajes offline pendientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} fichaje(s) pendientes de validaci&oacute;n
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">
              {selectedIds.size} seleccionados
            </span>
            <button
              onClick={() => handleValidar("aprobar")}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar
            </button>
            <button
              onClick={() => handleValidar("rechazar")}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {fichajes.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="Todo al día"
          description="No hay fichajes offline pendientes de validación"
        />
      )}

      {/* Table */}
      {fichajes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === fichajes.length && fichajes.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left">Empleado</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Fecha original</th>
                <th className="p-3 text-left">Sincronizado</th>
                <th className="p-3 text-left">Verificación</th>
                <th className="p-3 text-left">Dispositivo</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fichajes.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(f.id)}
                      onChange={() => toggleSelect(f.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{f.empleado_nombre}</p>
                      {f.codigo_empleado && (
                        <p className="text-xs text-muted-foreground">{f.codigo_empleado}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      f.tipo === "entrada" ? "bg-emerald-500/10 text-emerald-500" :
                      f.tipo === "salida" ? "bg-red-500/10 text-red-500" :
                      f.tipo === "descanso_inicio" ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {TIPO_LABELS[f.tipo] || f.tipo}
                    </span>
                    {f.subtipo && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({SUBTIPO_LABELS[f.subtipo] || f.subtipo})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatDate(f.offline_timestamp || f.fecha)}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(f.created_at)}
                  </td>
                  <td className="p-3">
                    {f.foto_verificacion_url || f.empleado_foto_url ? (
                      <button
                        onClick={() => setPhotoModal({
                          perfil: f.empleado_foto_url,
                          captura: f.foto_verificacion_url,
                          nombre: f.empleado_nombre,
                        })}
                        className="flex items-center gap-1.5 group"
                      >
                        <div className="flex -space-x-2">
                          {f.empleado_foto_url && (
                            <img
                              src={f.empleado_foto_url}
                              alt="Perfil"
                              className="w-8 h-8 rounded-full object-cover border-2 border-background"
                            />
                          )}
                          {f.foto_verificacion_url && (
                            <img
                              src={f.foto_verificacion_url}
                              alt="Captura"
                              className="w-8 h-8 rounded-full object-cover border-2 border-background"
                            />
                          )}
                        </div>
                        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin fotos</span>
                    )}
                  </td>
                  <td className="p-3">
                    {f.device_nombre ? (
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{f.device_nombre}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleValidar("aprobar", [f.id])}
                        disabled={processing}
                        className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                        title="Aprobar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleValidar("rechazar", [f.id])}
                        disabled={processing}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Rechazar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Photo comparison modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="bg-background rounded-2xl p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">Verificación de identidad</h3>
            <p className="text-sm text-muted-foreground mb-4">{photoModal.nombre}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                  <User className="h-3 w-3" /> Foto perfil
                </p>
                {photoModal.perfil ? (
                  <img
                    src={photoModal.perfil}
                    alt="Perfil"
                    className="w-full aspect-square object-cover rounded-xl border border-border"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                  <Camera className="h-3 w-3" /> Foto captura
                </p>
                {photoModal.captura ? (
                  <img
                    src={photoModal.captura}
                    alt="Captura"
                    className="w-full aspect-square object-cover rounded-xl border border-border"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setPhotoModal(null)}
              className="mt-4 w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
