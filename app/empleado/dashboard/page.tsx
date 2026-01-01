"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function EmpleadoDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get("/empleado/dashboard");
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Cargando…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mi Panel</h1>

      <div className="p-4 bg-white border rounded">
        <p>
          <b>Nombre:</b> {data.nombre}
        </p>
        <p>
          <b>Turno:</b> {data.turno?.nombre || "Sin turno asignado"}
        </p>
        <p>
          <b>Estado:</b> {data.fichando ? "Trabajando" : "Fuera"}
        </p>
      </div>
    </div>
  );
}
