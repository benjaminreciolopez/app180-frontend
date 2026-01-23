"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NuevoClientePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    tipo: "cliente",
    modo_trabajo: "hora",
    precio_hora: "",
  });

  function set(k: string, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await api.post("/admin/clientes", {
      ...form,
      precio_hora: Number(form.precio_hora),
    });

    router.push("/admin/clientes");
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Nuevo cliente</h1>

      <div>
        <Label>Nombre</Label>
        <Input
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Código</Label>
        <Input
          value={form.codigo}
          onChange={(e) => set("codigo", e.target.value)}
        />
      </div>

      <div>
        <Label>Tipo</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={form.tipo}
          onChange={(e) => set("tipo", e.target.value)}
        >
          <option value="cliente">Cliente</option>
          <option value="obra">Obra</option>
          <option value="interno">Interno</option>
          <option value="delegacion">Delegación</option>
        </select>
      </div>

      <div>
        <Label>Modo de trabajo</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={form.modo_trabajo}
          onChange={(e) => set("modo_trabajo", e.target.value)}
        >
          <option value="hora">Por hora</option>
          <option value="dia">Por día</option>
          <option value="mes">Mensual</option>
          <option value="precio_fijo">Precio fijo</option>
        </select>
      </div>

      {form.modo_trabajo === "hora" && (
        <div>
          <Label>Precio / hora</Label>
          <Input
            type="number"
            step="0.01"
            value={form.precio_hora}
            onChange={(e) => set("precio_hora", e.target.value)}
            required
          />
        </div>
      )}

      <Button type="submit">Guardar</Button>
    </form>
  );
}
