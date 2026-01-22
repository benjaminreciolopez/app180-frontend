"use client";

import { login } from "../services/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      console.log("➡️ Enviando login...");
      const result = await login(email, password);

      console.log("📥 Resultado login:", result);

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.decoded));

      console.log("📦 Token guardado:", localStorage.getItem("token"));

      if (result.decoded.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/empleado/dashboard");
      }
    } catch (err: any) {
      console.error("❌ Error login:", err);
      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-96 space-y-3"
      >
        <h1 className="text-xl font-bold text-center">CONTENDO GESTIONES</h1>

        <input
          type="email"
          placeholder="Correo"
          className="border p-2 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="border p-2 w-full rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button className="bg-blue-600 text-white w-full py-2 rounded">
          Entrar
        </button>
      </form>
    </div>
  );
}
