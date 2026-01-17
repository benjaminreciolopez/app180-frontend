"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function DeletePlantillaModal({
  open,
  onClose,
  name,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");

  const ok = typed === name;

  return (
    <Modal open={open} onClose={onClose} title="Eliminar plantilla">
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Esta acción <b>no se puede deshacer</b>. Se borrarán:
        </p>

        <ul className="list-disc ml-5 text-sm text-gray-600">
          <li>Días</li>
          <li>Bloques</li>
          <li>Excepciones</li>
          <li>Asignaciones a empleados</li>
        </ul>

        <p className="text-sm mt-2">
          Escribe <b>{name}</b> para confirmar:
        </p>

        <input
          className="border p-2 rounded w-full"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>
            Cancelar
          </button>

          <button
            className={`px-3 py-2 rounded text-white ${
              ok ? "bg-red-600" : "bg-red-300 cursor-not-allowed"
            }`}
            disabled={!ok}
            onClick={onConfirm}
          >
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </Modal>
  );
}
// app180-frontend/app/admin/jornadas/DeletePlantillaModal.tsx
