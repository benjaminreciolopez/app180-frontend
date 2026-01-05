"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { FichajeAction } from "./FichajeAction";
import type { AccionFichaje } from "./FichajeAction";

/* =========================
   TIPOS
========================= */

type FichajeHoy = {
  id: string;
  tipo_label: string;
  hora: string;
};

type DashboardData = {
  nombre?: string;
  turno?: {
    nombre?: string;
  };
  fichando?: boolean;
  estado_label?: string;
  estado_color?: string;
  minutos_trabajados_hoy?: string;
  accion?: AccionFichaje | null;
  fichajes_hoy?: FichajeHoy[];
};

/* =========================
   COMPONENTE
========================= */

export default function EmpleadoDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/empleado/dashboard");
      setData(res.data || {});
    } catch (e) {
      console.error(e);
      setError("No se ha podido cargar el dashboard");
      setData({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p className="p-4">Cargando…</p>;
  }

  if (error) {
    return <div className="p-4 text-red-600 font-semibold">{error}</div>;
  }

  if (!data) {
    return null;
  }

  const fichajesHoy: FichajeHoy[] = data.fichajes_hoy ?? [];

  return (
    <div className="app-main space-y-6 pb-24">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {data.nombre || "Empleado"}
        </h1>
        <p className="text-muted">Turno: {data.turno?.nombre || "Sin turno"}</p>
      </div>

      {/* ESTADO DE HOY */}
      <div className="bg-white border rounded p-4 space-y-2">
        <h2 className="font-semibold text-lg">Estado de hoy</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Situación actual</span>
          <span
            className={`font-bold ${
              data.fichando ? "text-green-600" : "text-gray-500"
            }`}
          >
            {data.fichando ? "Trabajando" : "Fuera de jornada"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Turno</span>
          <span>{data.turno?.nombre || "Sin turno"}</span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Estado"
          value={data.estado_label || "-"}
          color={data.estado_color}
        />
        <Stat label="Hoy" value={data.minutos_trabajados_hoy || "0 min"} />
      </div>

      {/* BOTÓN PRINCIPAL */}
      <div className="fixed bottom-4 left-4 right-4">
        <FichajeAction accion={data.accion ?? null} reload={load} />
      </div>

      {/* FICHAJES DE HOY */}
      <div className="card">
        <h3 className="font-semibold mb-3">Fichajes de hoy</h3>

        {fichajesHoy.length === 0 ? (
          <p className="text-sm text-gray-500">No hay fichajes hoy</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {fichajesHoy.map((f) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.tipo_label}</span>
                <span>{f.hora}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* =========================
   COMPONENTES AUXILIARES
========================= */

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-xl font-bold ${color ? `text-${color}` : ""}`}>
        {value}
      </p>
    </div>
  );
}
