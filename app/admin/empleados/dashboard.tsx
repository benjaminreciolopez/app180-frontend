"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import Link from "next/link";

export default function EmpleadoDashboard() {
  const [loading, setLoading] = useState(true);
  const [reporte, setReporte] = useState<any>(null);

  async function load() {
    try {
      const res = await api.get("/reports/mine/today");
      setReporte(res.data || null);
    } catch (e) {
      console.error("Error cargando reporte", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mi día</h1>

      {reporte ? (
        <div className="p-4 border rounded bg-white space-y-2">
          <p>
            <b>Fecha:</b> {reporte.fecha}
          </p>

          <p>
            <b>Estado:</b>{" "}
            <span
              className={
                reporte.estado === "aprobado"
                  ? "text-green-600"
                  : reporte.estado === "rechazado"
                  ? "text-red-600"
                  : "text-yellow-600"
              }
            >
              {reporte.estado}
            </span>
          </p>

          <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">
            {reporte.resumen}
          </pre>

          {reporte.estado === "pendiente" && (
            <Link
              href="/empleado/reportar"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
            >
              Editar reporte
            </Link>
          )}
        </div>
      ) : (
        <div className="p-4 border rounded bg-white">
          <p>No has enviado tu reporte de hoy.</p>

          <Link
            href="/empleado/reportar"
            className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Crear reporte del día
          </Link>
        </div>
      )}

      <Link
        href="/empleado/reportes"
        className="inline-block bg-gray-800 text-white px-4 py-2 rounded"
      >
        Ver historial
      </Link>
    </div>
  );
}
