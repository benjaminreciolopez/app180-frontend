"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Pendiente = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: "vacaciones" | "baja_medica";
  estado: "pendiente" | "aprobado" | "rechazado";
  fecha_inicio: string;
  fecha_fin: string;
  comentario_empleado?: string | null;
  creado_en?: string | null;
};

function tipoLabel(t: string) {
  return t === "vacaciones" ? "Vacaciones" : "Baja médica";
}

export default function DrawerPendientesAdmin({
  onClose,
  onUpdated,
  onOpenDetalle,
}: {
  onClose: () => void;
  onUpdated: () => void; // refrescar calendario
  onOpenDetalle: (p: Pendiente) => void; // abrir detalle (opcional)
}) {
  const [items, setItems] = useState<Pendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/ausencias", {
        params: { estado: "pendiente" },
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error cargando pendientes", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function aprobar(p: Pendiente) {
    if (!confirm("¿Aprobar esta solicitud?")) return;
    setWorkingId(p.id);
    try {
      // Tus endpoints actuales aprueban/rechazan SOLO vacaciones por tipo.
      // Para baja_medica: si quieres aprobarla, hay que crear endpoint aprobarBajaMedica.
      if (p.tipo !== "vacaciones") {
        alert(
          "Ahora mismo el backend solo tiene aprobar/rechazar para VACACIONES. Para BAJA MÉDICA te creo el endpoint en el paso 2."
        );
        return;
      }
      await api.patch(`/admin/ausencias/${p.id}/aprobar`);
      await load();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error al aprobar");
    } finally {
      setWorkingId(null);
    }
  }

  async function rechazar(p: Pendiente) {
    if (!confirm("¿Rechazar esta solicitud?")) return;
    setWorkingId(p.id);
    try {
      if (p.tipo !== "vacaciones") {
        alert(
          "Ahora mismo el backend solo tiene aprobar/rechazar para VACACIONES. Para BAJA MÉDICA te creo el endpoint en el paso 2."
        );
        return;
      }
      await api.patch(`/admin/ausencias/${p.id}/rechazar`);
      await load();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error al rechazar");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-gray-900">
            Solicitudes pendientes
          </div>
          <div className="text-xs text-gray-500">
            Aprueba o rechaza sin abrir el calendario
          </div>
        </div>

        <button
          onClick={load}
          className="text-sm font-semibold px-3 py-2 rounded-xl border border-black/10 bg-white active:bg-black/[0.04]"
        >
          Recargar
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando pendientes…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No hay pendientes.</div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <button
                onClick={() => onOpenDetalle(p)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-gray-900 truncate">
                      {p.empleado_nombre}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {tipoLabel(p.tipo)} · {p.fecha_inicio} → {p.fecha_fin}
                    </div>
                    {p.comentario_empleado ? (
                      <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                        “{p.comentario_empleado}”
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs font-medium text-amber-600">
                    Pendiente
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  disabled={workingId === p.id}
                  onClick={() => rechazar(p)}
                  className="py-2.5 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04] disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  disabled={workingId === p.id}
                  onClick={() => aprobar(p)}
                  className="py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50"
                >
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04]"
      >
        Cerrar
      </button>
    </div>
  );
}
