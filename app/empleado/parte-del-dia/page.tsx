"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function ParteEmpleadoPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const [resumen, setResumen] = useState("");
  const [horas, setHoras] = useState<number | null>(null);

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
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Parte Diario</h1>

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
            className="border px-3 py-2 w-full"
            rows={5}
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">
            Horas trabajadas hoy
          </label>
          <input
            type="number"
            className="border px-3 py-1 w-full"
            value={horas ?? ""}
            onChange={(e) =>
              setHoras(e.target.value ? parseFloat(e.target.value) : null)
            }
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Guardar
        </button>
      </form>
    </div>
  );
}
