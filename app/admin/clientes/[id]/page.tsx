"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function EditarClientePage() {
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    api.get(`/admin/clientes/${id}`).then((r) => {
      setForm(r.data);
    });
  }, [id]);

  if (!form) return <div>Cargando…</div>;

  function set(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await api.patch(`/admin/clientes/${id}`, form);

    router.push("/admin/clientes");
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Editar cliente</h1>

      <div>
        <Label>Nombre</Label>
        <Input
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
        />
      </div>

      <div>
        <Label>Código</Label>
        <Input
          value={form.codigo || ""}
          onChange={(e) => set("codigo", e.target.value)}
        />
      </div>

      <div>
        <Label>Activo</Label>
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => set("activo", e.target.checked)}
        />
      </div>

      <Button type="submit">Guardar cambios</Button>
      <div className="flex gap-3 mb-4">
        <Link href={`/admin/clientes/${id}/tarifas`}>
          <Button variant="outline">Gestionar tarifas</Button>
        </Link>
      </div>
    </form>
  );
}
