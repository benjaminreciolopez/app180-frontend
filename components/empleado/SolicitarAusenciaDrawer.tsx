"use client";

import { useState } from "react";
import Drawer from "@/components/ui/Drawer";
import { api } from "@/services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function SolicitarAusenciaDrawer({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [tipo, setTipo] = useState<"vacaciones" | "baja_medica">("vacaciones");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar() {
    if (!inicio || !fin) {
      alert("Debes indicar fechas");
      return;
    }

    if (tipo === "baja_medica" && comentario.trim().length < 5) {
      alert("Debes indicar el motivo de la baja");
      return;
    }

    setLoading(true);
    try {
      await api.post("/empleado/ausencias/solicitar", {
        tipo,
        fecha_inicio: inicio,
        fecha_fin: fin,
        comentario,
      });

      onSuccess?.();
      onClose();
      setInicio("");
      setFin("");
      setComentario("");
      setTipo("vacaciones");
    } catch (e) {
      console.error(e);
      alert("Error solicitando ausencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Solicitar ausencia">
      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as "vacaciones" | "baja_medica")
            }
          >
            <option value="vacaciones">Vacaciones</option>
            <option value="baja_medica">Baja médica</option>
          </select>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">Inicio</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Fin</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>
        </div>

        {/* Comentario */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Comentario {tipo === "baja_medica" && "(obligatorio)"}
          </label>
          <textarea
            rows={3}
            className="border rounded px-3 py-2 w-full"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Motivo o información adicional"
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="btn-secondary px-4 py-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn-primary px-4 py-2"
            onClick={enviar}
            disabled={loading}
          >
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
