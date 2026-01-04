"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function ParteEmpleadoPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const [resumen, setResumen] = useState("");
  const [horas, setHoras] = useState<number | null>(null);
  const bloqueado =
    report?.estado === "aprobado" || report?.estado === "rechazado";

  async function load() {
    try {
      const res = await api.get("/reports/mine/today");
      setReport(res.data);

      if (res.data) {
        setResumen(res.data.resumen);
        setHoras(res.data.horas_trabajadas);
      }
    } catch (e) {
      console.error("Error cargando parte diario", e);
    } finally {
      setLoading(false);
    }
  }

  async function guardar(e: any) {
    e.preventDefault();

    await api.post("/reports/mine/today", {
      resumen,
      horas_trabajadas: horas,
    });

    alert("Parte guardado correctamente");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="app-main space-y-6 pb-24">
      <h1 className="text-xl font-bold">Parte Diario</h1>

      {report?.estado === "pendiente" && (
        <p className="text-sm text-yellow-600">
          Este parte será revisado por tu responsable.
        </p>
      )}

      {report?.estado === "aprobado" && (
        <p className="text-sm text-green-600">
          Parte aprobado. No se puede modificar.
        </p>
      )}

      {report?.estado === "rechazado" && (
        <p className="text-sm text-red-600">
          Parte rechazado. Contacta con tu responsable.
        </p>
      )}

      {report && (
        <div className="p-3 border rounded bg-white">
          Estado:{" "}
          <b
            className={
              report.estado === "aprobado"
                ? "text-green-600"
                : report.estado === "rechazado"
                ? "text-red-600"
                : "text-yellow-600"
            }
          >
            {report.estado}
          </b>
        </div>
      )}

      <form
        onSubmit={guardar}
        className="space-y-4 bg-white p-4 border rounded"
      >
        <div>
          <label className="block mb-1 font-semibold">
            ¿Qué has hecho hoy?
          </label>
          <textarea
            disabled={bloqueado}
            className="border px-3 py-2 w-full disabled:bg-gray-100"
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
          />
        </div>
        {!bloqueado && (
          <button className="w-full bg-blue-600 text-white py-3 rounded text-lg">
            Guardar parte
          </button>
        )}

        {report && (
          <div className="p-3 border rounded bg-gray-50 text-sm">
            <b>Horas registradas automáticamente:</b> {report.horas_trabajadas}{" "}
            h
          </div>
        )}
      </form>
    </div>
  );
}
