"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tarifa = {
  id: string;
  tipo: string;
  precio: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  activo: boolean;
  trabajo_nombre?: string;
};

export default function TarifasClientePage() {
  const params = useParams();
  const clienteId = params.id as string;

  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    tipo: "hora",
    precio: "",
    fecha_inicio: "",
  });

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /* ================= LOAD ================= */

  async function load() {
    try {
      const { data } = await api.get(`/admin/clientes/${clienteId}/tarifas`);

      setTarifas(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (clienteId) load();
  }, [clienteId]);

  /* ================= CREAR ================= */

  async function crear(e: React.FormEvent) {
    e.preventDefault();

    await api.post(`/admin/clientes/${clienteId}/tarifas`, {
      tipo: form.tipo,
      precio: Number(form.precio),
      fecha_inicio: form.fecha_inicio,
    });

    setForm({
      tipo: "hora",
      precio: "",
      fecha_inicio: "",
    });

    load();
  }

  /* ================= CERRAR ================= */

  async function cerrar(id: string) {
    await api.delete(`/admin/clientes/tarifas/${id}`);
    load();
  }

  /* ================= UI ================= */

  if (loading) return <div>Cargando tarifas…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Tarifas del cliente</h1>

      {/* Alta */}

      <form onSubmit={crear} className="border p-4 rounded space-y-4">
        <h2 className="font-semibold">Nueva tarifa</h2>

        <div>
          <Label>Tipo</Label>

          <select
            className="w-full border rounded px-3 py-2"
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
          >
            <option value="hora">Por hora</option>
            <option value="dia">Por día</option>
            <option value="mes">Mensual</option>
            <option value="trabajo">Por trabajo</option>
          </select>
        </div>

        <div>
          <Label>Precio</Label>

          <Input
            type="number"
            step="0.01"
            value={form.precio}
            onChange={(e) => set("precio", e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Fecha inicio</Label>

          <Input
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => set("fecha_inicio", e.target.value)}
            required
          />
        </div>

        <Button type="submit">Crear tarifa</Button>
      </form>

      {/* Listado */}

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2">Tipo</th>
              <th className="p-2">Precio</th>
              <th className="p-2">Desde</th>
              <th className="p-2">Hasta</th>
              <th className="p-2">Estado</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {tarifas.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.tipo}</td>

                <td className="p-2">{t.precio} €</td>

                <td className="p-2">{t.fecha_inicio}</td>

                <td className="p-2">{t.fecha_fin || "-"}</td>

                <td className="p-2">{t.activo ? "Activa" : "Cerrada"}</td>

                <td className="p-2 text-right">
                  {t.activo && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cerrar(t.id)}
                    >
                      Cerrar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
