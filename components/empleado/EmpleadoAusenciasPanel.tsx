// src/components/empleado/EmpleadoAusenciasPanel.tsx
"use client";

import { useMemo, useState } from "react";
import { api } from "@/services/api";

type TipoAusencia = "vacaciones" | "baja_medica";

type Props = {
  onDone?: () => void; // para recargar dashboard/calendario al cerrar
  onClose?: () => void; // opcional, si quieres cerrar drawer al enviar
};

function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function classInput(disabled?: boolean) {
  return `w-full border rounded-xl px-4 py-3 text-base ${
    disabled ? "bg-gray-100" : "bg-white"
  }`;
}

export default function EmpleadoAusenciasPanel({ onDone, onClose }: Props) {
  const [tipo, setTipo] = useState<TipoAusencia>("vacaciones");
  const [fechaInicio, setFechaInicio] = useState<string>(ymd());
  const [fechaFin, setFechaFin] = useState<string>(ymd());
  const [comentario, setComentario] = useState<string>("");

  // Adjuntos (preparado)
  const [files, setFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const rangoOk = useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    return fechaInicio <= fechaFin;
  }, [fechaInicio, fechaFin]);

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);

    // filtrado básico (preparado)
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const safe = arr.filter((f) => allowed.includes(f.type));

    setFiles((prev) => [...prev, ...safe]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError(null);
    setOk(null);

    if (!rangoOk) {
      setError("La fecha inicio no puede ser mayor que la fecha fin.");
      return;
    }

    // Reglas mínimas
    if (tipo === "baja_medica" && files.length === 0) {
      // preparado para adjuntos: puedes desactivar esta regla si aún no subes
      setError(
        "Para baja médica, adjunta al menos un justificante (PDF/imagen)."
      );
      return;
    }

    try {
      setSaving(true);

      /**
       * Versión 1 (JSON simple): si aún no tienes endpoint de subida.
       * Envía la solicitud sin adjuntos (pero UI ya lista).
       */
      const payload = {
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        comentario: comentario.trim() || null,
        // adjuntos: preparado para cuando activemos backend de archivos
        adjuntos_count: files.length,
      };

      // Ajusta si tu ruta es distinta
      const res = await api.post("/empleado/ausencias/solicitar", payload);

      setOk("Solicitud enviada correctamente.");
      setComentario("");
      setFiles([]);

      onDone?.();
      // si quieres cerrar el drawer al enviar:
      onClose?.();

      return res.data;
    } catch (e: any) {
      console.error(e);
      setError(
        e?.response?.data?.error || "No se ha podido enviar la solicitud."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Info / Estado */}
      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {ok && (
        <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm">
          {ok}
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Tipo de ausencia</label>
        <select
          className={classInput()}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoAusencia)}
        >
          <option value="vacaciones">Vacaciones</option>
          <option value="baja_medica">Baja médica</option>
        </select>
        <p className="text-xs text-gray-500">
          Si es baja médica, lo normal es adjuntar justificante.
        </p>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Inicio</label>
          <input
            type="date"
            className={classInput()}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Fin</label>
          <input
            type="date"
            className={classInput()}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      {!rangoOk && (
        <div className="text-sm text-red-600">
          La fecha inicio no puede ser mayor que la fecha fin.
        </div>
      )}

      {/* Comentario */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Comentario</label>
        <textarea
          className="w-full border rounded-xl px-4 py-3 text-base"
          rows={4}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Explica brevemente el motivo o añade información relevante."
        />
      </div>

      {/* Adjuntos (preparado) */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">
          Adjuntos (PDF / PNG / JPG)
        </label>

        <input
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          className="block w-full text-sm"
          onChange={(e) => onPickFiles(e.target.files)}
        />

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((f, idx) => (
              <div
                key={`${f.name}-${idx}`}
                className="flex items-center justify-between p-3 border rounded-xl bg-white"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="text-xs text-gray-500">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Puedes adjuntar justificantes. Queda preparado para subir a
            ausencias_adjuntos_180 cuando activemos el endpoint de archivos.
          </p>
        )}
      </div>

      {/* Footer acciones (Apple-style: botón grande) */}
      <div className="sticky bottom-0 bg-white pt-3">
        <button
          disabled={saving || !rangoOk}
          onClick={submit}
          className="w-full btn-primary py-4 text-lg disabled:opacity-60 rounded-2xl"
        >
          {saving ? "Enviando..." : "Enviar solicitud"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-2xl border text-base hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
