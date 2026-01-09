"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { FichajeAction } from "./FichajeAction";
import type { AccionFichaje } from "./FichajeAction";
import { useRouter } from "next/navigation";
import Drawer from "@/components/ui/Drawer";
import EmpleadoAusenciasPanel from "@/components/empleado/EmpleadoAusenciasPanel";

type FichajeHoy = {
  id: string;
  tipo_label: string;
  hora: string;
};
type WorkLogHoy = {
  id: string;
  descripcion: string;
  minutos: number | null;
  cliente_nombre?: string | null;
};

type DashboardData = {
  nombre?: string;
  turno?: { nombre?: string | null } | null;
  fichando?: boolean;
  estado_label?: string;
  estado_color?: string; // "green-600" | "red-600" ...
  minutos_trabajados_hoy?: string;
  accion?: AccionFichaje | null;
  fichajes_hoy?: FichajeHoy[];
};

function colorClass(color?: string) {
  // Evita Tailwind dinámico. Lista cerrada.
  switch (color) {
    case "green-600":
      return "text-green-600";
    case "red-600":
      return "text-red-600";
    case "yellow-600":
      return "text-yellow-600";
    case "blue-600":
      return "text-blue-600";
    case "gray-500":
      return "text-gray-500";
    default:
      return "text-gray-500";
  }
}

export default function EmpleadoDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workLogsHoy, setWorkLogsHoy] = useState<WorkLogHoy[]>([]);
  const router = useRouter();
  const [estadoDia, setEstadoDia] = useState<{
    laborable: boolean;
    label?: string;
  } | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/empleado/dashboard");
      setData((res.data || {}) as DashboardData);
    } catch (e) {
      console.error(e);
      setError("No se ha podido cargar el dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  async function loadWorkLogsHoy() {
    try {
      const hoy = new Date().toISOString().slice(0, 10);

      const res = await api.get("/worklogs/mis", {
        params: { desde: hoy, hasta: hoy },
      });

      setWorkLogsHoy(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error cargando work logs hoy", e);
      setWorkLogsHoy([]);
    }
  }

  async function loadEstadoDia() {
    try {
      const res = await api.get("/calendario/hoy");
      setEstadoDia(res.data);
    } catch {
      setEstadoDia({ laborable: true });
    }
  }

  useEffect(() => {
    load();
    loadWorkLogsHoy();
    loadEstadoDia();
  }, []);

  const fichajesHoy = useMemo<FichajeHoy[]>(
    () => (Array.isArray(data?.fichajes_hoy) ? data!.fichajes_hoy! : []),
    [data]
  );

  if (loading) return <p className="p-4">Cargando…</p>;

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-600 font-semibold">{error}</div>
        <button className="btn-primary px-4 py-2" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="app-main space-y-6 pb-24">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {data.nombre || "Empleado"}
        </h1>
        <p className="text-muted">
          Turno: {data.turno?.nombre ? data.turno.nombre : "Sin turno"}
        </p>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Ausencias">
        <EmpleadoAusenciasPanel
          onDone={() => {
            // recargas lo que quieras (dashboard + calendario si aplica)
            load();
            loadWorkLogsHoy();
            loadEstadoDia();
          }}
          onClose={() => setOpen(false)}
        />
      </Drawer>
      ; <button onClick={() => setOpen(true)}>Abrir</button>
      <button className="btn-secondary px-4 py-2" onClick={() => setOpen(true)}>
        Solicitar ausencia
      </button>
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
          <span className="text-sm text-gray-600">Estado</span>
          <span className={`font-semibold ${colorClass(data.estado_color)}`}>
            {data.estado_label || "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Hoy</span>
          <span className="font-semibold">
            {data.minutos_trabajados_hoy || "—"}
          </span>
        </div>
      </div>
      {estadoDia?.laborable === false && (
        <div className="p-4 border rounded bg-gray-100 text-sm text-gray-700">
          Hoy no es un día laborable: <b>{estadoDia.label}</b>
        </div>
      )}
      {/* BOTÓN PRINCIPAL */}
      <div className="fixed bottom-4 left-4 right-4 z-40 space-y-2">
        {/* BOTÓN PRINCIPAL */}
        {estadoDia?.laborable !== false && (
          <FichajeAction
            accion={data.accion ?? null}
            reload={() => {
              load();
              loadWorkLogsHoy();
            }}
          />
        )}

        {/* BOTONES SECUNDARIOS */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOpen(true)}
            className="bg-white border py-3 rounded-xl text-sm font-medium shadow"
          >
            Ausencia
          </button>

          <button
            onClick={() => router.push("/empleado/calendario")}
            className="bg-white border py-3 rounded-xl text-sm font-medium shadow"
          >
            Calendario
          </button>
        </div>
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
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Trabajos de hoy</h3>

          <button
            className="btn-primary text-sm px-3 py-1"
            onClick={() => router.push("/empleado/trabajos")}
          >
            Añadir
          </button>
        </div>

        {workLogsHoy.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay trabajos registrados hoy
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {workLogsHoy.map((w) => (
              <li key={w.id} className="flex justify-between">
                <span className="truncate">
                  {w.descripcion}
                  {w.cliente_nombre && (
                    <span className="text-gray-500"> · {w.cliente_nombre}</span>
                  )}
                </span>
                <span>{w.minutos ?? "—"} min</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
