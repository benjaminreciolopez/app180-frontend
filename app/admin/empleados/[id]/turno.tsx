"use client";

import { useEffect, useState } from "react";
import { getTurnos } from "@/services/turnos";
import { api } from "@/services/api";
import { useParams, useRouter } from "next/navigation";

/* ================================
   🔹 COMPONENTE REUTILIZABLE
   para usar dentro de otra vista
================================ */
export function AsignarTurno({ empleado }: any) {
  const [turnos, setTurnos] = useState<any[]>([]);
  const [turnoId, setTurnoId] = useState(empleado?.turno_id || "");

  useEffect(() => {
    async function load() {
      const t = await getTurnos();
      setTurnos(t);
    }
    load();
  }, []);

  async function guardar() {
    await api.put(`/employees/${empleado.id}/turno`, {
      turno_id: turnoId,
    });

    alert("Turno actualizado");
  }

  return (
    <div>
      <label className="block mb-1 font-semibold">Turno asignado</label>

      <select
        value={turnoId}
        onChange={(e) => setTurnoId(e.target.value)}
        className="border rounded px-3 py-2"
      >
        <option value="">Sin turno</option>

        {turnos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>

      <button
        onClick={guardar}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Guardar
      </button>
    </div>
  );
}

/* ================================
   🔹 PÁGINA COMPLETA ADMIN
   /admin/empleados/[id]/turno
================================ */
export default function AsignarTurnoEmpleado() {
  const { id } = useParams();
  const router = useRouter();

  const [turnos, setTurnos] = useState<any[]>([]);
  const [turnoId, setTurnoId] = useState("");

  useEffect(() => {
    async function load() {
      const t = await getTurnos();
      setTurnos(t);
    }
    load();
  }, []);

  async function asignar() {
    await api.put(`/employees/${id}/turno`, { turno_id: turnoId });

    alert("Turno asignado");
    router.push("/admin/empleados");
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-4">Asignar turno</h1>

      <select
        className="border w-full px-3 py-2"
        value={turnoId}
        onChange={(e) => setTurnoId(e.target.value)}
      >
        <option value="">Seleccionar turno</option>

        {turnos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>

      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        onClick={asignar}
      >
        Guardar
      </button>
    </div>
  );
}
