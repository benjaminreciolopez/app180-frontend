"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";

type Cliente = {
  id: string;
  nombre: string;
  codigo?: string;
  tipo: string;
  modo_trabajo: string;
  activo: boolean;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get("/admin/clientes");
      setClientes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Cargando clientes…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>

        <Link href="/admin/clientes/nuevo">
          <Button>Nuevo cliente</Button>
        </Link>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2">Código</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Modo</th>
              <th className="p-2">Estado</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-medium">{c.nombre}</td>
                <td className="p-2">{c.codigo || "-"}</td>
                <td className="p-2">{c.tipo}</td>
                <td className="p-2">{c.modo_trabajo}</td>
                <td className="p-2">{c.activo ? "Activo" : "Inactivo"}</td>

                <td className="p-2 text-right">
                  <Link href={`/admin/clientes/${c.id}`}>
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
