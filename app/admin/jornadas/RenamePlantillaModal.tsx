"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function RenamePlantillaModal({
  open,
  onClose,
  currentName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  onConfirm: (newName: string) => void;
}) {
  const [value, setValue] = useState(currentName);

  return (
    <Modal open={open} onClose={onClose} title="Renombrar plantilla">
      <div className="space-y-3">
        <input
          className="border p-2 rounded w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="px-3 py-2 rounded bg-blue-600 text-white"
            onClick={() => {
              if (!value.trim()) return;
              onConfirm(value.trim());
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
// app180-frontend/app/admin/jornadas/RenamePlantillaModal.tsx
