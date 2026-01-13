"use client";

import { useState } from "react";
import { api } from "@/services/api";

const API_ENDPOINTS = {
  solicitar: "/empleado/ausencias",
  subirAdjunto: "/empleado/ausencias/adjuntos", // lo crearemos luego
};

type AdjuntoTemp = {
  file: File;
  url: string;
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
  const [adjuntos, setAdjuntos] = useState<AdjuntoTemp[]>([]);

  function onFilesSelected(files: FileList | null) {
    if (!files) return;

    const nuevos: AdjuntoTemp[] = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      nuevos.push({ file, url });
    });

    setAdjuntos((prev) => [...prev, ...nuevos]);
  }

  function removeAdjunto(i: number) {
    setAdjuntos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[i].url);
      copy.splice(i, 1);
      return copy;
    });
  }

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
      const res = await api.post(API_ENDPOINTS.solicitar, {
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        comentario,
      });

      const ausenciaId = res.data?.id;

      // Subida de adjuntos (cuando tengamos backend)
      if (ausenciaId && adjuntos.length > 0) {
        const fd = new FormData();
        adjuntos.forEach((a) => fd.append("files", a.file));
        fd.append("ausencia_id", ausenciaId);

        await api.post(API_ENDPOINTS.subirAdjunto, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

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
            : "Puedes adjuntar el parte o justificante médico (opcional)"}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex gap-3">
            <label className="flex-1 flex flex-col text-[13px] font-medium text-gray-600">
              Inicio
              <input
                type="date"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </label>

            <label className="flex-1 flex flex-col text-[13px] font-medium text-gray-600">
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

      {/* ===================== */}
      {/* ADJUNTOS */}
      {/* ===================== */}
      {tipo === "baja_medica" && (
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Justificantes (opcional)</div>

          <label className="block">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => onFilesSelected(e.target.files)}
            />

            <div className="w-full py-3 rounded-xl border border-dashed border-black/20 text-center text-sm text-gray-500 cursor-pointer">
              Toca para adjuntar PDF o imagen
            </div>
          </label>

          {adjuntos.length > 0 && (
            <div className="space-y-2">
              {adjuntos.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="truncate">{a.file.name}</div>
                  <button
                    onClick={() => removeAdjunto(i)}
                    className="px-2 py-1 rounded-lg border text-xs"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        disabled={saving}
        onClick={enviar}
        className="w-full py-3 rounded-2xl bg-black text-white font-semibold disabled:opacity-60"
      >
        {saving ? "Enviando…" : "Enviar solicitud"}
      </button>

      <div className="text-xs text-gray-500">
        Los justificantes no son obligatorios, pero pueden acelerar la
        aprobación.
      </div>
    </div>
  );
}
