"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Loader2, ArrowRight, Sparkles, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vipToken = searchParams.get("vip_token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no vip_token, redirect to login (legacy behavior)
    if (!vipToken) {
      router.replace("/login");
    }
  }, [vipToken, router]);

  // Google VIP registration handler
  const handleGoogleResponse = useCallback(async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          vip_session_token: vipToken,
          empresa_nombre_vip: empresaNombre || undefined,
        }),
      });

      const json = await res.json();

      if (json.token) {
        localStorage.setItem("token", json.token);
        localStorage.setItem("user", JSON.stringify(json.user));
        sessionStorage.setItem("token", json.token);
        sessionStorage.setItem("user", JSON.stringify(json.user));

        toast.success("Cuenta VIP creada con Google");
        router.replace("/onboarding?vip=1");
      } else {
        setError(json.error || "Error al crear la cuenta con Google");
      }
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [vipToken, empresaNombre, router]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!vipToken || loading) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          ux_mode: "popup",
        });

        const btnContainer = document.getElementById("google-vip-btn");
        if (btnContainer) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.renderButton(btnContainer, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signup_with",
            shape: "rectangular",
            width: 380,
            logo_alignment: "left",
          });
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse, loading, vipToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !nombre || !empresaNombre) {
      setError("Todos los campos son obligatorios");
      return;
    }
    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/public/qr-vip-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nombre,
          empresa_nombre: empresaNombre,
          session_token: vipToken,
        }),
      });

      const json = await res.json();

      if (json.success && json.token) {
        sessionStorage.setItem("token", json.token);
        sessionStorage.setItem("user", JSON.stringify(json.user));
        localStorage.setItem("token", json.token);
        localStorage.setItem("user", JSON.stringify(json.user));

        toast.success("Cuenta VIP creada correctamente");
        router.replace("/onboarding?vip=1");
      } else {
        setError(json.error || "Error al crear la cuenta");
      }
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!vipToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Redirigiendo al registro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* VIP Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Registro VIP</h1>
          <p className="text-blue-100 text-sm mt-1">
            Acceso cortesia del creador de Contendo
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            Todos los modulos incluidos
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-Up */}
          <div>
            <div id="google-vip-btn" className="flex justify-center" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o con email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Garcia"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de tu empresa</label>
              <input
                type="text"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                placeholder="Mi Empresa SL"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* VIP Features summary */}
            <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-700">Incluido en tu cuenta VIP:</p>
              {["Facturacion + VeriFactu", "Empleados + Fichajes", "Calendario + Fiscal", "10 consultas IA/dia"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-blue-600">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta VIP
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              Ya tienes cuenta?{" "}
              <a href="/login" className="text-blue-600 hover:underline">Inicia sesion</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
