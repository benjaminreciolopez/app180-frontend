"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTurno, updateTurno } from "@/services/turnos";

export default function EditarTurnoPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo_turno: "completo",
  });

  useEffect(() => {
    async function load() {
      try {
        const t = await getTurno(id);

        setForm({
          nombre: t.nombre || "",
          descripcion: t.descripcion || "",
          tipo_turno: t.tipo_turno || "completo",
        });
      } catch (e) {
        console.error("Error cargando turno", e);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  function setField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function guardar(e: any) {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    await updateTurno(id, form);
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
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            required
          />
        </div>

        <div>
          <label>Descripción</label>
          <textarea
            className="border px-3 py-1 w-full"
            value={form.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
          />
        </div>

        <div>
          <label>Tipo de turno</label>
          <select
            className="border px-3 py-1 w-full"
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

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar
        </button>
      </form>
    </div>
  );
}
// app180-frontend/app/admin/turnos/[id]/page.tsx
