// src/components/empleado/drawer/DrawerSolicitarAusencia.tsx
"use client";

import { useState } from "react";
import { api } from "@/services/api";

const API_ENDPOINTS = {
  solicitar: "/empleado/ausencias", // <-- cambia si tu ruta es distinta
};

function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DrawerSolicitarAusencia({
  tipoInicial,
  onDone,
}: {
  tipoInicial: "vacaciones" | "baja_medica";
  onDone: () => void;
}) {
  const tipo = tipoInicial;
  const [fechaInicio, setFechaInicio] = useState(ymd());
  const [fechaFin, setFechaFin] = useState(ymd());
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  async function enviar() {
    if (!fechaInicio || !fechaFin) {
      alert("Fechas obligatorias");
      return;
    }
    if (fechaInicio > fechaFin) {
      alert("La fecha de inicio no puede ser mayor que la de fin");
      return;
    }

    setSaving(true);
    try {
      await api.post(API_ENDPOINTS.solicitar, {
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        comentario,
      });
      alert("Solicitud enviada");
      onDone();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error enviando solicitud");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 shadow-sm">
        <div className="text-[15px] font-semibold text-gray-900">
          {tipo === "vacaciones"
            ? "Solicitar vacaciones"
            : "Solicitar baja médica"}
        </div>
        <div className="text-xs text-gray-500">
          {tipo === "vacaciones"
            ? "Solicita tus días de descanso"
            : "Indica el periodo de baja médica"}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[13px] font-medium text-gray-600">
              Inicio
              <input
                type="date"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </label>

            <label className="text-[13px] font-medium text-gray-600">
              Fin
              <input
                type="date"
                min={fechaInicio}
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm text-gray-700">
            Comentario (opcional)
            <textarea
              className="mt-1 w-full border rounded-xl px-3 py-2"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ej: cita médica, viaje, etc."
            />
          </label>
        </div>
      </div>

      <button
        disabled={saving}
        onClick={enviar}
        className="w-full py-3 rounded-2xl bg-black text-white font-semibold disabled:opacity-60"
      >
        {saving ? "Enviando…" : "Enviar solicitud"}
      </button>

      <div className="text-xs text-gray-500">
        Si luego quieres adjuntar justificantes (PDF/PNG), lo conectamos con tu
        tabla <b>ausencias_adjuntos_180</b> en una siguiente pantalla.
      </div>
    </div>
  );
}
