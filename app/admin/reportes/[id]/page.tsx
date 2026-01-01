"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useParams, useRouter } from "next/navigation";

export default function ReporteDetalle() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [r, setR] = useState<any>(null);

  async function load() {
    try {
      const res = await api.get(`/reports/${id}`);
      setR(res.data);
    } catch (e) {
      console.error("Error cargando reporte", e);
    } finally {
      setLoading(false);
    }
  }

  async function aprobar() {
    await api.patch(`/reports/${id}/aprobar`);
    router.push("/admin/reportes");
  }

  async function rechazar() {
    await api.patch(`/reports/${id}/rechazar`);
    router.push("/admin/reportes");
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (!r) return <p>No encontrado</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Parte diario</h1>

      <div className="p-4 border rounded bg-white space-y-2">
        <p>
          <b>Empleado:</b> {r.empleado_nombre}
        </p>
        <p>
          <b>Fecha:</b> {r.fecha}
        </p>

        <div>
          <b>Resumen:</b>
          <pre className="mt-1 bg-gray-100 p-2 rounded whitespace-pre-wrap">
            {r.resumen}
          </pre>
        </div>

        <p>
          <b>Horas:</b> {r.horas_trabajadas ?? "—"}
        </p>

        <p>
          <b>Estado:</b>{" "}
          <span
            className={
              r.estado === "aprobado"
                ? "text-green-600"
                : r.estado === "rechazado"
                ? "text-red-600"
                : "text-yellow-600"
            }
          >
            {r.estado}
          </span>
        </p>
      </div>

      {r.estado === "pendiente" && (
        <div className="flex gap-3">
          <button
            onClick={aprobar}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Aprobar
          </button>

          <button
            onClick={rechazar}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
