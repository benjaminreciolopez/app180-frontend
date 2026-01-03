"use client";

import { useEffect, useState } from "react";
import { getTurnos } from "@/services/turnos";
import { api } from "@/services/api";
import { useParams, useRouter } from "next/navigation";
interface Turno {
  id: string;
  nombre: string;
}

interface EmpleadoBasico {
  id: string;
  turno_id?: string | null;
}

/* ================================
   🔹 COMPONENTE REUTILIZABLE
   para usar dentro de otra vista
================================ */
export function AsignarTurno({ empleado }: { empleado: EmpleadoBasico }) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoId, setTurnoId] = useState<string>(empleado.turno_id || "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    async function load() {
      const t = await getTurnos();
      setTurnos(t);
    }
    load();
  }, []);

  async function guardar() {
    if (saving) return;
    setSaving(true);
    setOk(false);

    try {
      await api.put(`/employees/${empleado.id}/turno`, {
        turno_id: turnoId || null,
      });
      setOk(true);
    } catch {
      alert("Error al actualizar el turno");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Turno asignado</label>

      <select
        value={turnoId}
        onChange={(e) => setTurnoId(e.target.value)}
        className="input w-full"
      >
        <option value="">Sin turno</option>
        {turnos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>

      <button onClick={guardar} disabled={saving} className="btn-primary">
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {ok && (
        <p className="text-sm text-green-600">
          Turno actualizado correctamente
        </p>
      )}
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

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnoId, setTurnoId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const t = await getTurnos();
      setTurnos(t);
    }
    load();
  }, []);

  async function asignar() {
    if (saving) return;
    setSaving(true);

    try {
      await api.put(`/employees/${id}/turno`, {
        turno_id: turnoId || null,
      });
      router.push("/admin/empleados");
    } catch {
      alert("Error al asignar turno");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-main max-w-xl">
      <h1 className="text-xl font-bold mb-4">Asignar turno</h1>

      <div className="card space-y-4">
        <select
          className="input w-full"
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

        <div className="flex gap-2">
          <button onClick={asignar} disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar"}
          </button>

          <button onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
