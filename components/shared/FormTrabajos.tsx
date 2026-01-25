"use client";

import { useState } from "react";
import { api } from "@/services/api";

type Option = { id: string; nombre: string };

type Props = {
  isAdmin?: boolean;
  empleados?: Option[]; // Solo necesario si isAdmin
  clientes: Option[];
  workItems: Option[];
  onCreated: () => void;
};

export default function FormTrabajos({
  isAdmin = false,
  empleados = [],
  clientes,
  workItems,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Fields
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [horas, setHoras] = useState("1"); // Default 1h
  const [descripcion, setDescripcion] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  
  // Admin only
  const [empleadoId, setEmpleadoId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!descripcion.trim()) {
      alert("La descripción es obligatoria");
      return;
    }

    const h = parseFloat(horas.replace(",", "."));
    if (isNaN(h) || h <= 0) {
      alert("La duración debe ser un número válido mayor a 0");
      return;
    }

    const minutos = Math.round(h * 60);

    setLoading(true);
    try {
      await api.post("/worklogs", {
        fecha,
        minutos,
        descripcion,
        client_id: clienteId || null,
        work_item_id: workItemId || null,
        // Solo enviamos empleado_id si es admin y eligió algo (o vacío para auto-asignar)
        empleado_id: isAdmin ? (empleadoId || null) : undefined,
      });

      // Reset
      setDescripcion("");
      setHoras("1");
      setClienteId("");
      setWorkItemId("");
      if (isAdmin) setEmpleadoId(""); // Reset empleado selection
      
      onCreated();
    } catch (err) {
      console.error(err);
      alert("Error al guardar el trabajo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Registrar nuevo trabajo</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">
              Empleado
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
            >
              <option value="">(Yo / Asignarme a mí)</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Fecha</label>
          <input
            type="date"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">
            Duración (Horas)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Ej: 1.5"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">
            Cliente <span className="text-gray-400 font-normal">(Opcional)</span>
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">- Seleccionar -</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">
            Tipo de trabajo{" "}
            <span className="text-gray-400 font-normal">(Opcional)</span>
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={workItemId}
            onChange={(e) => setWorkItemId(e.target.value)}
          >
            <option value="">- Seleccionar -</option>
            {workItems.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Descripción</label>
        <textarea
          required
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Describe el trabajo realizado..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Trabajo"}
        </button>
      </div>
    </form>
  );
}
