"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function MisReportes() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

  async function load() {
    try {
      const res = await api.get("/reports/mine");
      setReports(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis reportes</h1>

      {reports.length === 0 ? (
        <p>No tienes reportes aún</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="p-4 border rounded bg-white space-y-1">
              <div className="font-semibold">{r.fecha}</div>

              <div className="text-sm text-gray-700 truncate">{r.resumen}</div>

              <div className="text-sm">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
