"use client";

import { useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";

export default function NuevoEmpleadoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function crear(e: any) {
    e.preventDefault();

    await api.post("/employees", {
      nombre,
      email,
      password,
    });

    alert("Empleado creado");
    router.push("/admin/empleados");
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Nuevo empleado</h1>

      <form onSubmit={crear} className="bg-white p-4 border rounded space-y-4">
        <div>
          <label>Nombre</label>
          <input
            className="border px-3 py-1 w-full"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Email</label>
          <input
            className="border px-3 py-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Contraseña inicial</label>
          <input
            type="password"
            className="border px-3 py-1 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Crear
        </button>
      </form>
    </div>
  );
}
