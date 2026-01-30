"use client";

import { login } from "../services/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈
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

      showSuccess('¡Bienvenido!');

      // Pequeño delay para que se vea el toast antes de redirigir
      setTimeout(() => {
        if (result.decoded.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/empleado/dashboard");
        }
      }, 500);
    } catch (err: any) {
      console.error("❌ Error login:", err);
      showError(err?.response?.data?.error || 'Error al iniciar sesión');
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

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Correo"
          autoComplete="username"
          className="border p-2 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* PASSWORD */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="border p-2 w-full rounded pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ERROR */}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* SUBMIT */}
        <button
          type="submit"
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-blue-300"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
