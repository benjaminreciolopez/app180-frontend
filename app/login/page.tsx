// app/login/page.tsx
"use client";
export const revalidate = 0;

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@test.com"); // por comodidad
  const [password, setPassword] = useState("admin123"); // pon aquí la real si la conoces
  const [error, setError] = useState<string>("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      console.log("[UI] intentando login...");
      const result = await login(email, password);

      // Aquí YA se ha guardado el token en localStorage
      console.log("[UI] login ok, decoded:", result.decoded);

      if (result.decoded.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/empleado/dashboard");
      }
    } catch (err: any) {
      console.error("[UI] error en login", err);
      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">Acceso APP180</h1>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="border rounded w-full px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            className="border rounded w-full px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
