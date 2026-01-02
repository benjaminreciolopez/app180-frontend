"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface TrabajandoAhoraItem {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  cliente_nombre: string | null;
  estado: string;
  desde: string;
}

interface UltimoFichaje {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  cliente_nombre: string | null;
  estado: string;
  created_at: string;
}

interface DashboardData {
  empleadosActivos: number;
  fichajesHoy: number;
  sospechososHoy: number;
  trabajandoAhora: TrabajandoAhoraItem[];
  ultimosFichajes: UltimoFichaje[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/admin/dashboard");
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "No se pudieron cargar los datos");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando dashboard...</p>;

  if (error || !data)
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Reintentar
        </button>
      </div>
    );

  function hora(d: string) {
    return new Date(d).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function fecha(d: string) {
    return new Date(d).toLocaleDateString("es-ES");
  }

  return (
    <div className="app-main">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="kpi-card">
          <span className="kpi-label">Empleados activos</span>
          <span className="kpi-value">{data.empleadosActivos}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Fichajes de hoy</span>
          <span className="kpi-value">{data.fichajesHoy}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Fichajes sospechosos</span>
          <span className="kpi-value text-red-600">{data.sospechososHoy}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TRABAJANDO AHORA */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-semibold mb-3">
            Empleados fichando ahora
          </h2>

          {!data.trabajandoAhora.length ? (
            <p className="text-gray-500 text-sm">
              Ningún empleado está fichando en este momento
            </p>
          ) : (
            <ul className="divide-y">
              {data.trabajandoAhora.map((t) => (
                <li key={t.id} className="py-2">
                  <div className="font-semibold">{t.empleado_nombre}</div>
                  <div className="text-sm text-gray-600">
                    Cliente: {t.cliente_nombre || "Sin cliente"} — desde{" "}
                    {hora(t.desde)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ULTIMOS FICHAJES */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-semibold mb-3">Últimos fichajes</h2>

          {!data.ultimosFichajes.length ? (
            <p className="text-gray-500 text-sm">
              No hay fichajes registrados aún
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosFichajes.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td>
                      {fecha(f.created_at)} {hora(f.created_at)}
                    </td>
                    <td>{f.empleado_nombre}</td>
                    <td>{f.cliente_nombre || "—"}</td>
                    <td>
                      {f.estado === "ENTRADA" ? (
                        <span className="text-green-600 font-semibold">
                          ENTRADA
                        </span>
                      ) : (
                        <span>SALIDA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
