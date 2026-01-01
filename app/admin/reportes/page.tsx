"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import Link from "next/link";

export default function ReportesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [estado, setEstado] = useState("pendiente");

  async function load() {
    try {
      const res = await api.get("/reports", {
        params: estado ? { estado } : {},
      });

      setReports(res.data || []);
    } catch (e) {
      console.error("Error cargando reportes", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [estado]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reportes diarios</h1>

      {/* FILTROS */}
      <div className="mb-6 flex gap-4">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
          <option value="">Todos</option>
        </select>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : reports.length === 0 ? (
        <p>No hay reportes</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              href={`/admin/reportes/${r.id}`}
              key={r.id}
              className="block p-4 border rounded bg-white hover:bg-gray-50"
            >
              <div className="font-semibold">
                {r.empleado_nombre} — {r.fecha}
              </div>

              <div className="text-sm text-gray-600 truncate">{r.resumen}</div>

              <div className="text-sm mt-1">
                Estado:{" "}
                <b
                  className={
                    r.estado === "aprobado"
                      ? "text-green-600"
                      : r.estado === "rechazado"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }
                >
                  {r.estado}
                </b>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
