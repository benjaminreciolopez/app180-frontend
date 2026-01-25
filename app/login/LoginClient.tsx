"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth";
import { Eye, EyeOff } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [current, setCurrent] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const result = await login(email, password);

      if (result?.decoded?.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/empleado/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <form
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
            className="border rounded w-full px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className="
                  border rounded w-full px-3 py-2 pr-10
                  bg-white dark:bg-neutral-800
                  border-neutral-300 dark:border-neutral-700
                  text-neutral-900 dark:text-neutral-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute inset-y-0 right-2 flex items-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
