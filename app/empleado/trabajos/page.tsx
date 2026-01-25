// app180-frontend/app/empleado/trabajos/page.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Item = {
  id: string;
  fecha: string;
  minutos: number | null;
  precio: number | null;
  descripcion: string;
  client_id?: string | null;
  cliente_nombre?: string | null;
  work_item_id?: string | null;
  work_item_nombre?: string | null;
};

type Cliente = { id: string; nombre: string };
type WorkItem = { id: string; nombre: string };

function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function EmpleadoTrabajosPage() {
  const [desde, setDesde] = useState(ymd());
  const [hasta, setHasta] = useState(ymd());
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  // Form
  const [clientId, setClientId] = useState<string>("");
  const [workItemId, setWorkItemId] = useState<string>("");
  const [minutos, setMinutos] = useState<string>("60");
  const [descripcion, setDescripcion] = useState<string>("");
  const [fecha, setFecha] = useState<string>(ymd());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/worklogs/mis", { params: { desde, hasta } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogos() {
    // Ajusta estos endpoints si ya los tienes:
    // - /clientes (empleado) o /empleado/clientes
    // - /work-items (empresa)
    try {
      const [c, w] = await Promise.all([
        api.get("/clientes"), // si no existe, lo adaptamos
        api.get("/work-items"), // si no existe, lo adaptamos
      ]);
      setClientes(Array.isArray(c.data) ? c.data : []);
      setWorkItems(Array.isArray(w.data) ? w.data : []);
    } catch {
      // si aún no están, no bloqueamos la página
      setClientes([]);
      setWorkItems([]);
    }
  }

  async function crear() {
    if (descripcion.trim().length < 2) {
      alert("Descripción obligatoria");
      return;
    }

    setSaving(true);
    try {
      await api.post("/worklogs", {
        client_id: clientId || null,
        work_item_id: workItemId || null,
        minutos: minutos ? Number(minutos) : null,
        descripcion,
        fecha,
      });
      if (desde > hasta) {
        alert("La fecha 'desde' no puede ser mayor que 'hasta'");
        return;
      }
      setDescripcion("");
      await load();
      setMinutos("60");
      setClientId("");
      setWorkItemId("");
    } catch (e) {
      console.error(e);
      alert("Error creando trabajo");
    } finally {
      setSaving(false);
    }
  }

  const totalMin = items.reduce((acc, it) => acc + (it.minutos ?? 0), 0);

  useEffect(() => {
    loadCatalogos();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-main space-y-4 pb-24">
      <div className="flex items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis trabajos</h1>
          <p className="text-sm text-gray-500">
            Seguimiento por cliente y tiempo (work_logs_180)
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
          <button className="btn-primary px-4 py-2" onClick={load}>
            Cargar
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Registrar trabajo</h2>

        <div className="grid md:grid-cols-4 gap-2">
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Minutos (ej: 60)"
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Cliente (opcional)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-3 py-2"
            value={workItemId}
            onChange={(e) => setWorkItemId(e.target.value)}
          >
            <option value="">Tipo de trabajo (opcional)</option>
            {workItems.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nombre}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={3}
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <div className="flex justify-end">
          <button
            disabled={saving}
            className="btn-primary px-4 py-2"
            onClick={crear}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Listado</h3>
          <div className="text-sm text-gray-600">
            Total: {Math.round((totalMin / 60) * 100) / 100} h ({totalMin} min)
          </div>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No hay trabajos en este rango</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Trabajo</th>
                  <th className="p-3 text-left">Min</th>
                  <th className="p-3 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">
                      {new Date(it.fecha).toLocaleString("es-ES")}
                    </td>
                    <td className="p-3">{it.cliente_nombre || "—"}</td>
                    <td className="p-3">{it.work_item_nombre || "—"}</td>
                    <td className="p-3">{it.minutos ?? "—"}</td>
                    <td className="p-3">{it.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
