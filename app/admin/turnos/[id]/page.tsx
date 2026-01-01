"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTurno, updateTurno } from "@/services/turnos";

export default function EditarTurnoPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [tipoTurno, setTipoTurno] = useState("continuo");
  const [tipoHorario, setTipoHorario] = useState("fijo");
  const [horas, setHoras] = useState<number | null>(8);

  useEffect(() => {
    async function load() {
      try {
        const t = await getTurno(id);

        setNombre(t.nombre);
        setTipoTurno(t.tipo_turno);
        setTipoHorario(t.tipo_horario);
        setHoras(t.horas_dia_objetivo);
      } catch (e) {
        console.error("Error cargando turno", e);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  async function guardar(e: any) {
    e.preventDefault();

    await updateTurno(id, {
      nombre,
      tipo_turno: tipoTurno,
      tipo_horario: tipoHorario,
      horas_dia_objetivo: horas ?? null,
    });

    router.push("/admin/turnos");
  }

  if (loading) return <p>Cargando turno...</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Editar turno</h1>

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
            onChange={(e) =>
              setHoras(e.target.value ? parseInt(e.target.value) : null)
            }
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar
        </button>
      </form>
    </div>
  );
}
