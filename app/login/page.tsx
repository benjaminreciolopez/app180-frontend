"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/services/auth";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  console.log("LOGIN PAGE MOUNTED");

  // BOOTSTRAP CHECK
  useEffect(() => {
    async function init() {
      try {
        const res = await api.get("/system/status");

        if (res.data.bootstrap) {
          router.replace("/setup");
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setChecking(false);
      }
    }

    init();
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const result = await login(email, password);

      if (!result) return;

      if (result.decoded.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/empleado/dashboard");
      }
    } catch (err: any) {
      if (err?.response?.data?.code === "BOOTSTRAP_REQUIRED") {
        router.replace("/setup");
        return;
      }

      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow p-8 rounded w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-bold text-center">
          Acceso Contendo Gestiones
        </h1>

        {error && <p className="text-red-600">{error}</p>}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
          placeholder="Email"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full"
          placeholder="Contraseña"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
