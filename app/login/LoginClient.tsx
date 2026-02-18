"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login, getOrGenerateDeviceHash } from "@/services/auth";
import { api, setAuthToken } from "@/services/api";
import { Eye, EyeOff } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";

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

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Al montar, verificar si ya hay token → mostrar loading mientras AuthInit decide
  useEffect(() => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      // AuthInit se encargará de redirigir, mientras tanto mostramos loading
      setCheckingSession(true);
      // Timeout de seguridad: si tras 5s no se ha redirigido, dejar ver el login
      const timeout = setTimeout(() => setCheckingSession(false), 5000);
      return () => clearTimeout(timeout);
    } else {
      setCheckingSession(false);
    }
  }, []);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: any) => {
    setLoading(true);
    try {
      const device_hash = getOrGenerateDeviceHash();
      const res = await api.post("/auth/google", {
        credential: response.credential,
        device_hash,
        user_agent: navigator.userAgent
      });

      const { token, user, is_new_user } = res.data;

      // Save to localStorage (always remember for Google)
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setAuthToken(token);

      showSuccess(is_new_user ? "Cuenta creada correctamente" : "Inicio de sesión exitoso");

      // No hacer setLoading(false) tras login exitoso — mantener loading hasta que la navegación se complete
      if (is_new_user) {
        window.location.href = "/onboarding";
      } else if (user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/empleado/dashboard";
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error con Google Sign-In");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check for session expired flag
    if (localStorage.getItem("session_expired") === "true") {
      localStorage.removeItem("session_expired");
      setTimeout(() => {
        showError("Tu sesión ha caducado. Por favor inicia sesión nuevamente.");
      }, 500);
    }
  }, []);

  // Initialize Google Identity Services (solo cuando el formulario es visible)
  useEffect(() => {
    if (loading || checkingSession) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          ux_mode: "popup",
        });

        const btnContainer = document.getElementById("google-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 380,
            logo_alignment: "left",
          });
        }
      }
    };

    // Retry until script loads
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
  }, [handleGoogleResponse, loading, checkingSession]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const result = await login(email, password, undefined, remember);
      showSuccess("Inicio de sesión exitoso");

      // No hacer setLoading(false) tras login exitoso — mantener loading hasta que la navegación se complete
      if (result?.decoded?.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/empleado/dashboard";
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error al iniciar sesión");
      setLoading(false);
    }
  }

  // Pantalla de carga a pantalla completa
  if (loading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">CONTENDO GESTIONES</h1>
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                {checkingSession ? "Verificando sesión..." : "Iniciando sesión..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">CONTENDO GESTIONES</h1>
          <p className="text-sm text-gray-500">Sistema de gestión empresarial</p>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center">
          <div id="google-btn" className="w-full flex justify-center" />
        </div>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <button
              type="button"
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="bg-white px-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              {showEmailForm ? "Ocultar" : "Acceso con email"}
            </button>
          </div>
        </div>

        {/* Email/Password Form (collapsible) */}
        {showEmailForm && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="border rounded w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="border p-2 w-full rounded pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-[38px] text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer select-none">
                Mantener sesión iniciada
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-5 text-base font-bold shadow-md hover:shadow-xl transition-all"
            >
              Entrar
            </Button>
          </form>
        )}

        <p className="text-xs text-center text-gray-400">
          Al continuar, aceptas los{" "}
          <a href="/terminos" className="underline hover:text-gray-600">términos</a>{" "}
          y la{" "}
          <a href="/privacidad" className="underline hover:text-gray-600">política de privacidad</a>
        </p>
      </div>
    </div>
  );
}
