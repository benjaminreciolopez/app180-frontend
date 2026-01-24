// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/services/auth";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [checking, setChecking] = useState(true);
  console.log("LOGIN PAGE MOUNTED");

  // =========================
  // BOOTSTRAP CHECK
  // =========================
  useEffect(() => {
    console.log("BOOTSTRAP CHECK START");

    async function init() {
      try {
        const res = await api.get("/system/status");
        console.log("BOOTSTRAP RESULT:", res.data);

        if (res.data.bootstrap) {
          console.log("REDIRECT TO REGISTER");
          router.replace("/register");
          return;
        }
      } catch (e) {
        console.error("BOOTSTRAP ERROR", e);
      } finally {
        setChecking(false);
      }
    }

    init();
  }, [router]);

  // =========================
  // LOGIN
  // =========================
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const result = await login(email, password);

      if (result.decoded.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/empleado/dashboard");
      }
    } catch (err: any) {
      console.error("[UI] error en login", err);

      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <form
        autoComplete="off"
        onSubmit={handleLogin}
        className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">
          Acceso CONTENDO GESTIONES
        </h1>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            autoComplete="username"
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
            autoComplete="current-password"
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
