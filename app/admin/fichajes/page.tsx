"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Fichaje {
  id: string;
  nombre_empleado: string;
  fecha: string;
  tipo: string;
  hora_entrada?: string;
  hora_salida?: string;
  sospechoso?: boolean;
  sospecha_motivo?: string;
}

export default function FichajesPage() {
  const [loading, setLoading] = useState(true);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [form, setForm] = useState({
    empleado_id: "",
    fecha: "",
    entrada: "",
    salida: "",
    tipo: "",
  });
  async function loadEmpleados() {
    const res = await api.get("/employees");
    setEmpleados(res.data || []);
  }
  async function registrar() {
    try {
      await api.post("/fichajes/manual", {
        empleado_id: form.empleado_id,
        fecha: form.fecha,
        tipo: form.tipo,
        hora_entrada: form.entrada,
        hora_salida: form.salida || null,
      });

      alert("Fichaje creado");
      setShowModal(false);
      loadFichajes();
    } catch (e) {
      alert("Error creando fichaje");
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  async function loadFichajes() {
    try {
      let url = "/fichajes";

      if (filtro === "hoy") url = "/fichajes/hoy";
      if (filtro === "sospechosos") url = "/fichajes/sospechosos";

      const res = await api.get(url);
      setFichajes(res.data || []);
    } catch (e) {
      console.error("Error cargando fichajes", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadFichajes();
  }, [filtro]);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Fichajes</h1>

      <button
        className="bg-green-600 text-white px-4 py-2 rounded mb-4"
        onClick={() => setShowModal(true)}
      >
        + Registrar fichaje manual
      </button>

      {/* FILTROS */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFiltro("todos")}
          className={`px-4 py-2 rounded ${
            filtro === "todos" ? "bg-blue-600 text-white" : "bg-gray-300"
          }`}
        >
          Todos
        </button>

        <button
          onClick={() => setFiltro("hoy")}
          className={`px-4 py-2 rounded ${
            filtro === "hoy" ? "bg-blue-600 text-white" : "bg-gray-300"
          }`}
        >
          Hoy
        </button>

        <button
          onClick={() => setFiltro("sospechosos")}
          className={`px-4 py-2 rounded ${
            filtro === "sospechosos" ? "bg-red-600 text-white" : "bg-gray-300"
          }`}
        >
          Sospechosos
        </button>
      </div>

      <p className="mb-4">Total: {fichajes.length}</p>

      <table className="w-full bg-white border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Empleado</th>
            <th className="p-3 text-left">Fecha</th>
            <th className="p-3 text-left">Tipo</th>
            <th className="p-3 text-left">Entrada</th>
            <th className="p-3 text-left">Salida</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Motivo</th>
          </tr>
        </thead>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
            <div className="bg-white p-6 rounded w-[400px]">
              <h2 className="text-xl font-bold mb-4">Nuevo Fichaje</h2>

              <select
                className="border p-2 w-full mb-3"
                value={form.empleado_id}
                onChange={(e) =>
                  setForm({ ...form, empleado_id: e.target.value })
                }
              >
                <option value="">Seleccionar empleado</option>
                {empleados.map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
              <select
                className="border p-2 w-full mb-3"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="">Seleccionar tipo</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="descanso_inicio">Inicio descanso</option>
                <option value="descanso_fin">Fin descanso</option>
              </select>

              <input
                type="date"
                className="border p-2 w-full mb-3"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />

              <input
                type="time"
                className="border p-2 w-full mb-3"
                value={form.entrada}
                onChange={(e) => setForm({ ...form, entrada: e.target.value })}
              />

              <input
                type="time"
                className="border p-2 w-full mb-3"
                value={form.salida}
                onChange={(e) => setForm({ ...form, salida: e.target.value })}
              />

              <div className="flex justify-end gap-3">
                <button
                  className="px-3 py-2 bg-gray-300 rounded"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>

                <button
                  className="px-3 py-2 bg-blue-600 text-white rounded"
                  onClick={registrar}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        <tbody>
          {fichajes.map((f) => (
            <tr key={f.id} className="border-b">
              <td className="p-3">{f.nombre_empleado}</td>
              <td className="p-3">{f.fecha}</td>
              <td className="p-3">{f.tipo}</td>
              <td className="p-3">{f.hora_entrada || "-"}</td>
              <td className="p-3">{f.hora_salida || "-"}</td>
              <td className="p-3">
                {f.sospechoso ? (
                  <span className="text-red-600 font-semibold">Sospechoso</span>
                ) : (
                  <span className="text-green-600 font-semibold">OK</span>
                )}
              </td>
              <td className="text-red-600">{f.sospecha_motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
