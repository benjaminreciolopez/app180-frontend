"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTurno } from "@/services/turnos";

export default function CrearTurnoForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo_turno: "completo",
  });

  function setField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    await createTurno(form);
    router.push("/admin/turnos");
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Crear nuevo turno</h2>

      <div className="space-y-3">
        <div>
          <label className="block font-medium">Nombre</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium">Descripción</label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            value={form.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium">Tipo de turno</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={form.tipo_turno}
            onChange={(e) => setField("tipo_turno", e.target.value)}
          >
            <option value="completo">Completo</option>
            <option value="partido">Partido</option>
            <option value="nocturno">Nocturno</option>
            <option value="rotativo">Rotativo</option>
            <option value="otros">Otros</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={() => router.push("/admin/turnos")}
          className="px-4 py-2 border rounded"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
