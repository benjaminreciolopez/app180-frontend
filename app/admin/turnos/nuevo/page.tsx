"use client";

import { useState } from "react";
import { createTurno } from "@/services/turnos";
import { useRouter } from "next/navigation";

export default function NuevoTurnoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipoTurno, setTipoTurno] = useState("continuo");
  const [tipoHorario, setTipoHorario] = useState("fijo");
  const [horas, setHoras] = useState<number | null>(8);

  async function guardar(e: any) {
    e.preventDefault();

    await createTurno({
      nombre,
      tipo_turno: tipoTurno,
      tipo_horario: tipoHorario,
      horas_dia_objetivo: horas,
    });

    router.push("/admin/turnos");
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Crear nuevo turno</h1>

      <form
        onSubmit={guardar}
        className="space-y-4 bg-white p-4 border rounded"
      >
        <div>
          <label>Nombre</label>
          <input
            className="border px-3 py-1 w-full"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Tipo de turno</label>
          <select
            className="border px-3 py-1 w-full"
            value={tipoTurno}
            onChange={(e) => setTipoTurno(e.target.value)}
          >
            <option value="continuo">Continuo</option>
            <option value="discontinuo">Discontinuo</option>
          </select>
        </div>

        <div>
          <label>Tipo de horario</label>
          <select
            className="border px-3 py-1 w-full"
            value={tipoHorario}
            onChange={(e) => setTipoHorario(e.target.value)}
          >
            <option value="fijo">Fijo</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <div>
          <label>Horas objetivo al día</label>
          <input
            type="number"
            className="border px-3 py-1 w-full"
            value={horas ?? ""}
            onChange={(e) => setHoras(parseInt(e.target.value))}
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar
        </button>
      </form>
    </div>
  );
}
