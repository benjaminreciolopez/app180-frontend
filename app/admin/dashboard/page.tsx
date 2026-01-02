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
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando dashboard…</p>;

  if (error || !data) {
    return (
      <div className="app-main">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={load} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

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

      {/* KPIs */}
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

      {/* BLOQUES INFERIORES */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* TRABAJANDO AHORA */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Empleados fichando ahora</h2>
          </div>

          {!data.trabajandoAhora.length ? (
            <p className="text-muted-foreground text-sm">
              Ningún empleado está fichando en este momento
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.trabajandoAhora.map((t) => (
                <li key={t.id} className="py-2">
                  <div className="font-semibold">{t.empleado_nombre}</div>
                  <div className="text-sm text-muted-foreground">
                    Cliente: {t.cliente_nombre || "Sin cliente"} — desde{" "}
                    {hora(t.desde)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ÚLTIMOS FICHAJES */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Últimos fichajes</h2>
          </div>

          {!data.ultimosFichajes.length ? (
            <p className="text-muted-foreground text-sm">
              No hay fichajes registrados aún
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosFichajes.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {fecha(f.created_at)} {hora(f.created_at)}
                    </td>
                    <td>{f.empleado_nombre}</td>
                    <td>{f.cliente_nombre || "—"}</td>
                    <td>
                      {f.estado === "ENTRADA" ? (
                        <span className="badge badge-success">ENTRADA</span>
                      ) : (
                        <span className="badge badge-muted">SALIDA</span>
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
