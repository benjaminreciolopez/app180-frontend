"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Row = {
  id: string;
  fecha: string;
  minutos: number | null;
  precio: number | null;
  descripcion: string;
  empleado_id: string;
  empleado_nombre: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  work_item_nombre: string | null;
};

type ResumenItem = { minutos_total: number; trabajos: number } & Record<
  string,
  any
>;

function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminTrabajosPage() {
  const [desde, setDesde] = useState(ymd());
  const [hasta, setHasta] = useState(ymd());

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<{
    porCliente: any[];
    porEmpleado: any[];
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get("/admin/worklogs", { params: { desde, hasta } }),
        api.get("/admin/worklogs/resumen", { params: { desde, hasta } }),
      ]);
      setItems(Array.isArray(a.data?.items) ? a.data.items : []);
      setResumen(b.data || null);
    } finally {
      setLoading(false);
    }
  }

  const totalMin = items.reduce((acc, it) => acc + (it.minutos ?? 0), 0);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-main space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trabajos realizados</h1>
          <p className="text-sm text-gray-500">
            Histórico para presupuestar (work_logs_180)
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

      <div className="card flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total periodo: <b>{Math.round((totalMin / 60) * 100) / 100} h</b> (
          {totalMin} min)
        </div>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          {resumen && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-2">Top clientes</h3>
                {resumen.porCliente?.length ? (
                  <ul className="text-sm space-y-1">
                    {resumen.porCliente.slice(0, 8).map((x: any) => (
                      <li
                        key={x.cliente_id || "sin"}
                        className="flex justify-between"
                      >
                        <span>{x.cliente_nombre || "Sin cliente"}</span>
                        <span>
                          {Math.round((x.minutos_total / 60) * 100) / 100} h
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Sin datos</p>
                )}
              </div>

              <div className="card">
                <h3 className="font-semibold mb-2">Top empleados</h3>
                {resumen.porEmpleado?.length ? (
                  <ul className="text-sm space-y-1">
                    {resumen.porEmpleado.slice(0, 8).map((x: any) => (
                      <li key={x.empleado_id} className="flex justify-between">
                        <span>{x.empleado_nombre}</span>
                        <span>
                          {Math.round((x.minutos_total / 60) * 100) / 100} h
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Sin datos</p>
                )}
              </div>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Empleado</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Trabajo</th>
                  <th className="p-3 text-left">Min</th>
                  <th className="p-3 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={6}>
                      No hay trabajos
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-3">
                        {new Date(it.fecha).toLocaleString("es-ES")}
                      </td>
                      <td className="p-3">{it.empleado_nombre}</td>
                      <td className="p-3">{it.cliente_nombre || "—"}</td>
                      <td className="p-3">{it.work_item_nombre || "—"}</td>
                      <td className="p-3">{it.minutos ?? "—"}</td>
                      <td className="p-3">{it.descripcion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
