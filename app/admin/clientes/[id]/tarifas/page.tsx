"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash } from "lucide-react";

type Tarifa = {
  id: string;
  tipo: "hora" | "dia" | "mes" | "trabajo";
  precio: number;
  desde: string;
  hasta?: string | null;
  activa: boolean;
};

async function api(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Error API");

  return res.json();
}

export default function TarifasPage() {
  const { id } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api(`/admin/clientes/${id}/tarifas`);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function eliminar(tarifaId: string) {
    if (!confirm("¿Cerrar tarifa?")) return;

    await api(`/admin/clientes/tarifas/${tarifaId}`, {
      method: "DELETE",
    });

    load();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/clientes/${id}`)}
        >
          <ArrowLeft size={18} />
        </Button>

        <h1 className="text-xl font-semibold">Tarifas</h1>

        <Button className="ml-auto gap-2">
          <Plus size={16} /> Nueva tarifa
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Desde</th>
                <th className="p-3">Hasta</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.tipo}</td>
                  <td className="p-3">{t.precio} €</td>
                  <td className="p-3">{t.desde}</td>
                  <td className="p-3">{t.hasta || "—"}</td>
                  <td className="p-3">{t.activa ? "Activa" : "Cerrada"}</td>

                  <td className="p-3 text-right">
                    {t.activa && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => eliminar(t.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {!items.length && !loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Sin tarifas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
