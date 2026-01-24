"use client";

import Modal from "./Modal";
import { useState, useEffect } from "react";

const DIAS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
  { n: 7, label: "Domingo" },
];

type Props = {
  open: boolean;
  origen: number;
  onClose: () => void;
  onConfirm: (dias: number[], reset: boolean) => void;
};

export default function CopyDiasModal({
  open,
  origen,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setReset(false);
    }
  }, [open]);

  function toggle(d: number) {
    setSelected((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Copiar configuración">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Origen: <b>{DIAS.find((d) => d.n === origen)?.label}</b>
        </p>

        <div className="grid grid-cols-2 gap-2">
          {DIAS.filter((d) => d.n !== origen).map((d) => (
            <label key={d.n} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(d.n)}
                onChange={() => toggle(d.n)}
              />
              {d.label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm pt-2">
          <input
            type="checkbox"
            checked={reset}
            onChange={() => setReset(!reset)}
          />
          Resetear destino antes de copiar
        </label>

        <div className="flex justify-end gap-2 pt-3">
          <button className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>
            Cancelar
          </button>

          <button
            disabled={selected.length === 0}
            className="
              px-3 py-2 rounded
              bg-blue-600 text-white
              disabled:opacity-50
            "
            onClick={() => onConfirm(selected, reset)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </Modal>
  );
}
