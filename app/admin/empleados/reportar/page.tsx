"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";

export default function ReportarPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState("");
  const [horas, setHoras] = useState<number | null>(null);

  async function load() {
    try {
      const res = await api.get("/reports/mine/today");
      if (res.data) {
        setResumen(res.data.resumen || "");
        setHoras(res.data.horas_trabajadas || null);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function guardar(e: any) {
    e.preventDefault();

    await api.post("/reports", {
      resumen,
      horas_trabajadas: horas,
    });

    router.push("/empleado/dashboard");
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Reporte del día</h1>

      <form
        onSubmit={guardar}
        className="space-y-4 bg-white p-4 border rounded"
      >
        <div>
          <label className="font-semibold">Resumen del trabajo</label>
          <textarea
            className="border w-full px-3 py-2 rounded h-32"
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="font-semibold">Horas trabajadas</label>
          <input
            type="number"
            className="border w-full px-3 py-2 rounded"
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
