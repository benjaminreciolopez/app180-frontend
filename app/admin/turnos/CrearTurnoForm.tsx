"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTurno } from "@/services/turnos";

export default function CrearTurnoForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo_turno: "continuo",
    tipo_horario: "fijo",
    horas_dia_objetivo: 8,
    max_horas_dia: 9,
    max_horas_semana: 40,
    minutos_descanso_min: 30,
    minutos_descanso_max: 120,
    nocturno_permitido: false,
  });

  function setField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function guardar() {
    await createTurno(form);
    router.push("/admin/turnos"); // 👈 navegación aquí
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

        <div className="flex gap-4">
          <div>
            <label className="block font-medium">Tipo turno</label>
            <select
              className="border rounded px-3 py-2"
              value={form.tipo_turno}
              onChange={(e) => setField("tipo_turno", e.target.value)}
            >
              <option value="continuo">Continuo</option>
              <option value="discontinuo">Discontinuo</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Horario</label>
            <select
              className="border rounded px-3 py-2"
              value={form.tipo_horario}
              onChange={(e) => setField("tipo_horario", e.target.value)}
            >
              <option value="fijo">Fijo</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="block font-medium">Horas objetivo</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-24"
              value={form.horas_dia_objetivo}
              onChange={(e) =>
                setField("horas_dia_objetivo", Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="block font-medium">Max día</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-24"
              value={form.max_horas_dia}
              onChange={(e) =>
                setField("max_horas_dia", Number(e.target.value))
              }
            />
          </div>

          <div>
            <label className="block font-medium">Max semana</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-24"
              value={form.max_horas_semana}
              onChange={(e) =>
                setField("max_horas_semana", Number(e.target.value))
              }
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <label className="block font-medium">Descanso mínimo</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-28"
              value={form.minutos_descanso_min}
              onChange={(e) =>
                setField("minutos_descanso_min", Number(e.target.value))
              }
            />{" "}
            min
          </div>

          <div>
            <label className="block font-medium">Descanso máximo</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-28"
              value={form.minutos_descanso_max}
              onChange={(e) =>
                setField("minutos_descanso_max", Number(e.target.value))
              }
            />{" "}
            min
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.nocturno_permitido}
              onChange={(e) => setField("nocturno_permitido", e.target.checked)}
            />
            Permitir turno nocturno (cruza medianoche)
          </label>
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
        </button>{" "}
      </div>
    </div>
  );
}
