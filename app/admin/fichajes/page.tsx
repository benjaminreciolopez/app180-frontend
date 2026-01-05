"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
interface FichajeAPI {
  jornada_id: string;
  nombre_empleado: string;
  fecha: string;
  tipo: "entrada" | "salida" | "descanso_inicio" | "descanso_fin";
  sospechoso?: boolean;
  nota?: string | null;
}

interface JornadaUI {
  jornada_id: string;
  empleado: string;
  fecha: string; // YYYY-MM-DD
  entrada?: string; // ISO
  salida?: string; // ISO
  estado: "OK" | "Sospechoso";
  motivo?: string | null;
}
function agruparPorJornada(fichajes: FichajeAPI[]): JornadaUI[] {
  const map = new Map<string, JornadaUI>();

  for (const f of fichajes) {
    if (!f.jornada_id) continue;

    if (!map.has(f.jornada_id)) {
      map.set(f.jornada_id, {
        jornada_id: f.jornada_id,
        empleado: f.nombre_empleado,
        fecha: f.fecha.split("T")[0],
        estado: f.sospechoso ? "Sospechoso" : "OK",
        motivo: f.nota,
      });
    }

    const j = map.get(f.jornada_id)!;

    if (f.nota) {
      j.motivo = j.motivo ? `${j.motivo} | ${f.nota}` : f.nota;
    }

    if (f.tipo === "entrada") j.entrada = f.fecha;
    if (f.tipo === "salida") j.salida = f.fecha;

    // si alguno es sospechoso, toda la jornada lo es
    if (f.sospechoso) j.estado = "Sospechoso";
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

function withLocalOffset(dateStr: string, timeStr: string) {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  const off = -d.getTimezoneOffset(); // minutos
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`;
}

export default function FichajesPage() {
  const [loading, setLoading] = useState(true);
  const [fichajes, setFichajes] = useState<JornadaUI[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [form, setForm] = useState({
    empleado_id: "",
    fecha: "",
    tipo: "entrada", // entrada | salida | completa
    hora: "",
    horaEntrada: "",
    horaSalida: "",
    motivo: "",
  });

  async function loadEmpleados() {
    const res = await api.get("/employees");
    setEmpleados(res.data || []);
  }
  async function registrar() {
    try {
      if (!form.empleado_id || !form.fecha) {
        alert("Empleado y fecha obligatorios");
        return;
      }

      // 👉 Entrada o salida
      if (form.tipo !== "completa") {
        if (!form.hora) {
          alert("Debes indicar la hora");
          return;
        }

        const fechaHora = withLocalOffset(form.fecha, form.hora);

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: form.tipo,
          fecha_hora: fechaHora,
          motivo: form.motivo || null,
        });
      }

      // 👉 Jornada completa (2 fichajes)
      else {
        if (!form.horaEntrada || !form.horaSalida) {
          alert("Debes indicar hora de entrada y salida");
          return;
        }

        const entrada = withLocalOffset(form.fecha, form.horaEntrada);
        const salida = withLocalOffset(form.fecha, form.horaSalida);

        if (entrada >= salida) {
          alert("La salida debe ser posterior a la entrada");
          return;
        }

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: "entrada",
          fecha_hora: entrada,
          motivo: form.motivo || null,
        });

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: "salida",
          fecha_hora: salida,
          motivo: form.motivo || null,
        });
      }

      alert("Fichaje creado correctamente");
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
      const jornadas = agruparPorJornada(res.data || []);
      setFichajes(jornadas);
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
            <th className="p-3 text-left">Entrada</th>
            <th className="p-3 text-left">Salida</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Motivo</th>
          </tr>
        </thead>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded w-[400px] space-y-3">
              <h2 className="text-xl font-bold mb-2">Nuevo fichaje manual</h2>

              {/* EMPLEADO */}
              <select
                className="border p-2 w-full"
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

              {/* TIPO */}
              <select
                className="border p-2 w-full"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="completa">Jornada completa</option>
              </select>

              {/* FECHA */}
              <input
                type="date"
                className="border p-2 w-full"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />

              {/* HORA ÚNICA */}
              {form.tipo !== "completa" && (
                <input
                  type="time"
                  className="border p-2 w-full"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              )}

              {/* JORNADA COMPLETA */}
              {form.tipo === "completa" && (
                <>
                  <input
                    type="time"
                    className="border p-2 w-full"
                    placeholder="Hora de entrada"
                    value={form.horaEntrada}
                    onChange={(e) =>
                      setForm({ ...form, horaEntrada: e.target.value })
                    }
                  />

                  <input
                    type="time"
                    className="border p-2 w-full"
                    placeholder="Hora de salida"
                    value={form.horaSalida}
                    onChange={(e) =>
                      setForm({ ...form, horaSalida: e.target.value })
                    }
                  />
                </>
              )}
              <textarea
                className="border p-2 w-full"
                placeholder="Motivo (opcional)"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />

              {/* ACCIONES */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-3 py-2 bg-gray-300 rounded"
                  onClick={() => {
                    setShowModal(false);
                    setForm({
                      empleado_id: "",
                      fecha: "",
                      tipo: "entrada",
                      hora: "",
                      horaEntrada: "",
                      horaSalida: "",
                      motivo: "",
                    });
                  }}
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
            <tr key={f.jornada_id} className="border-b">
              <td className="p-3">{f.empleado}</td>
              <td className="p-3">{f.fecha}</td>

              <td className="p-3">
                {f.entrada
                  ? new Date(f.entrada).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </td>

              <td className="p-3">
                {f.salida
                  ? new Date(f.salida).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </td>

              <td className="p-3">
                {f.estado === "Sospechoso" ? (
                  <span className="text-red-600 font-semibold">Sospechoso</span>
                ) : (
                  <span className="text-green-600 font-semibold">OK</span>
                )}
              </td>

              <td className="p-3">{f.motivo || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
