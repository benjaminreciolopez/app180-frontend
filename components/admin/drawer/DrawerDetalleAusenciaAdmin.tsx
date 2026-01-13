"use client";

import { useState } from "react";
import { api } from "@/services/api";
import ModalAdjuntoFullscreen from "@/components/ui/ModalAdjuntoFullscreen";

type Adjunto = {
  id: string;
  url: string;
  nombre: string;
};

type EventoAdmin = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: "vacaciones" | "baja_medica";
  estado: "pendiente" | "aprobado" | "rechazado";
  start: string;
  end: string;
  comentario_empleado?: string | null;
  comentario_admin?: string | null;
  adjuntos?: Adjunto[]; // preparado
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
  const [preview, setPreview] = useState<Adjunto | null>(null);

  async function aprobar() {
    if (!confirm("¿Aprobar esta solicitud?")) return;

    setLoading(true);
    try {
      await api.patch(`/admin/ausencias/${evento.id}/estado`, {
        estado: "aprobado",
      });
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
      await api.patch(`/admin/ausencias/${evento.id}/estado`, {
        estado: "rechazado",
      });
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
    <>
      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 shadow-sm">
          <div className="text-[15px] font-semibold text-gray-900">
            {evento.tipo === "vacaciones" ? "Vacaciones" : "Baja médica"}
          </div>

          <div className="text-xs text-gray-500">{evento.empleado_nombre}</div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Inicio</div>
              <div className="font-medium">{evento.start}</div>
            </div>

            <div>
              <div className="text-gray-500">Fin</div>
              <div className="font-medium">{evento.end}</div>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-gray-500">Estado: </span>
            <span className="font-medium capitalize">{evento.estado}</span>
          </div>

          {evento.comentario_empleado && (
            <div className="text-sm">
              <div className="text-gray-500">Comentario empleado</div>
              <div className="mt-1">{evento.comentario_empleado}</div>
            </div>
          )}
        </div>

        {/* ========================= */}
        {/* ADJUNTOS (Sesame style) */}
        {/* ========================= */}
        {evento.adjuntos?.length ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold">Documentos adjuntos</div>

            <div className="space-y-2">
              {evento.adjuntos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="truncate text-sm">{a.nombre}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreview(a)}
                      className="px-3 py-1.5 rounded-lg border text-xs"
                    >
                      Ver
                    </button>
                    <a
                      href={a.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg border text-xs"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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

      {preview && (
        <ModalAdjuntoFullscreen
          url={preview.url}
          filename={preview.nombre}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
