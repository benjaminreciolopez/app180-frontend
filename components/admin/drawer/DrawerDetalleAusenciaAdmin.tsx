// src/components/admin/drawer/DrawerDetalleAusenciaAdmin.tsx
"use client";

import { useState } from "react";
import { api } from "@/services/api";

type EventoAdmin = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: string;
  estado: string;
  start: string;
  end: string;
};

export default function DrawerDetalleAusenciaAdmin({
  evento,
  onClose,
  onUpdated,
}: {
  evento: EventoAdmin;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function aprobar() {
    if (!confirm("¿Aprobar esta solicitud?")) return;

    setLoading(true);
    try {
      await api.patch(`/admin/ausencias/${evento.id}/aprobar`);
      alert("Solicitud aprobada");
      onUpdated();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error al aprobar");
    } finally {
      setLoading(false);
    }
  }

  async function rechazar() {
    if (!confirm("¿Rechazar esta solicitud?")) return;

    setLoading(true);
    try {
      await api.patch(`/admin/ausencias/${evento.id}/rechazar`);
      alert("Solicitud rechazada");
      onUpdated();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error al rechazar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 shadow-sm">
        <div className="text-[15px] font-semibold text-gray-900">
          {evento.tipo === "vacaciones" ? "Vacaciones" : "Baja médica"}
        </div>

        <div className="text-xs text-gray-500">
          {evento.empleado_nombre}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Inicio</div>
            <div className="font-medium">
              {evento.start}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Fin</div>
            <div className="font-medium">
              {evento.end}
            </div>
          </div>
        </div>

        <div className="text-sm">
          <span className="text-gray-500">Estado: </span>
          <span className="font-medium capitalize">{evento.estado}</span>
        </div>
      </div>

      {evento.estado === "pendiente" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={loading}
            onClick={rechazar}
            className="py-3 rounded-xl border border-black/10 bg-white text-sm font-semibold active:bg-black/[0.04] disabled:opacity-50"
          >
            Rechazar
          </button>

          <button
            disabled={loading}
            onClick={aprobar}
            className="py-3 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50"
          >
            Aprobar
          </button>
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
