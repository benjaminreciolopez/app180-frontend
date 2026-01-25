"use client";

import { login } from "../services/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [current, setCurrent] = useState("");
  const [visible, setVisible] = useState(false);

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

        <button className="bg-blue-600 text-white w-full py-2 rounded">
          Entrar
        </button>
      </form>
    </div>
  );
}
