"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { EmpleadoLite, PlanDia } from "./types";

export default function PreviewPanel() {
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [empleadoSel, setEmpleadoSel] = useState<string>("");
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [plan, setPlan] = useState<PlanDia | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api.get("/employees");
      setEmpleados(
        (r.data || []).map((x: any) => ({ id: x.id, nombre: x.nombre }))
      );
    })();
  }, []);

  async function load() {
    if (!empleadoSel) {
      alert("Selecciona un empleado");
      return;
    }
    setLoading(true);
    try {
      const r = await api.get(`/admin/plan-dia/${empleadoSel}?fecha=${fecha}`);
      setPlan(r.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="text-lg font-bold">Preview plan del día</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-semibold">Empleado</label>
            <select
              className="border p-2 rounded w-full"
              value={empleadoSel}
              onChange={(e) => setEmpleadoSel(e.target.value)}
            >
              <option value="">Selecciona...</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Fecha</label>
            <input
              className="border p-2 rounded w-full"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white w-full"
              onClick={load}
            >
              Ver plan
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded p-4">
        {loading ? (
          <div className="text-gray-600">Cargando...</div>
        ) : !plan ? (
          <div className="text-gray-600">Selecciona empleado y fecha.</div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-700">
              <b>Fecha:</b> {plan.fecha} · <b>Modo:</b> {plan.modo || "-"} ·{" "}
              <b>Plantilla:</b> {plan.plantilla_id || "(sin plantilla)"}
            </div>

            {plan.rango ? (
              <div className="text-sm text-gray-700">
                <b>Rango:</b> {plan.rango.inicio} - {plan.rango.fin}
              </div>
            ) : null}

            <table className="w-full border rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Inicio</th>
                  <th className="p-3 text-left">Fin</th>
                  <th className="p-3 text-left">Obligatorio</th>
                </tr>
              </thead>
              <tbody>
                {plan.bloques.map((b, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-3">{b.tipo}</td>
                    <td className="p-3">{b.inicio}</td>
                    <td className="p-3">{b.fin}</td>
                    <td className="p-3">{String(b.obligatorio)}</td>
                  </tr>
                ))}
                {plan.bloques.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-gray-600">
                      Sin bloques para este día.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
