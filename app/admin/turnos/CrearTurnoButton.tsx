"use client";

import { useState } from "react";
import CrearTurnoForm from "./CrearTurnoForm";

export default function CrearTurnoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo turno
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-lg w-full">
            <CrearTurnoForm />
          </div>
        </div>
      )}
    </>
  );
}
