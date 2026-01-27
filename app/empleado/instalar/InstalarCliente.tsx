"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/services/api";
import { AlertCircle, CheckCircle, Smartphone, HelpCircle } from "lucide-react";
import {
  isStandalone,
  getPlatform,
  getInstallInstructions,
  isMobileDevice,
} from "@/utils/pwaDetection";

export default function InstalarCliente({ token }: { token?: string }) {
  const [estado, setEstado] = useState<
    "cargando" | "ok" | "error" | "no-pwa" | "no-mobile"
  >("cargando");
  const [mensaje, setMensaje] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const router = useRouter();
  const executed = useRef(false);

  useEffect(() => {
    async function verificarYActivar() {
      if (executed.current) return;
      executed.current = true;

      // ✅ Fallback robusto: si prop token viene vacío, lo leemos de la URL
      const tokenFinal =
        token ||
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("token") ||
            undefined
          : undefined);

      if (!tokenFinal) {
        setEstado("error");
        setMensaje("Falta token de invitación (revisa el enlace)");
        return;
      }

      // 🔍 Verificar si es dispositivo móvil
      if (!isMobileDevice()) {
        setEstado("no-mobile");
        setMensaje(
          "Esta aplicación debe instalarse desde un dispositivo móvil (iPhone o Android)",
        );
        return;
      }

      // 🔍 Verificar si está en modo standalone (PWA instalada)
      const isPWA = isStandalone();
      console.log("🔍 Modo standalone:", isPWA);

      if (!isPWA) {
        setEstado("no-pwa");
        setMensaje(
          "Debes instalar la aplicación antes de activar tu dispositivo",
        );
        setShowInstructions(true);
        return;
      }

      // ✅ Continuar con activación
      await activarDispositivo(tokenFinal);
    }

    async function activarDispositivo(tokenFinal: string) {
      try {
        let device_hash: string = localStorage.getItem("device_hash") ?? "";

        if (!device_hash) {
          device_hash =
            globalThis.crypto?.randomUUID?.() ||
            Math.random().toString(36).substring(2);

          localStorage.setItem("device_hash", device_hash);
        }

        console.log("📱 Activando dispositivo con hash:", device_hash);

        const res = await api.post("/empleado/activate-install", {
          token: tokenFinal,
          device_hash,
          user_agent: navigator.userAgent,
        });

        const { token: jwtToken, user } = res.data;

        if (jwtToken && user) {
          localStorage.setItem("token", jwtToken);
          localStorage.setItem("user", JSON.stringify(user));
          setAuthToken(jwtToken);
          console.log("✅ Dispositivo activado correctamente");
        }

        setEstado("ok");
        setMensaje(res.data?.message || "Dispositivo activado correctamente");

        setTimeout(() => {
          router.replace("/empleado/dashboard");
        }, 1500);
      } catch (err: any) {
        console.error("❌ Error activando dispositivo:", err);
        setEstado("error");

        const errorMsg = err?.response?.data?.error;
        let mensajeUsuario = "No se pudo activar este dispositivo";

        if (errorMsg?.includes("ya fue usada")) {
          mensajeUsuario =
            "Esta invitación ya fue usada. Solicita otra al administrador.";
        } else if (errorMsg?.includes("caducada")) {
          mensajeUsuario =
            "Esta invitación ha caducado. Solicita otra al administrador.";
        } else if (errorMsg?.includes("inválido")) {
          mensajeUsuario =
            "El enlace de invitación no es válido. Verifica que lo copiaste correctamente.";
        } else if (errorMsg) {
          mensajeUsuario = errorMsg;
        }

        setMensaje(mensajeUsuario);
      }
    }

    verificarYActivar();
  }, [token, router]);

  const platform = getPlatform();
  const instructions = getInstallInstructions(platform);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 p-4">
      <div className="bg-white dark:bg-neutral-900 shadow-2xl rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
          <h1 className="text-2xl font-bold text-white text-center">
            Activación de dispositivo
          </h1>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Cargando */}
          {estado === "cargando" && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-600 dark:text-neutral-400">
                Validando invitación y registrando dispositivo...
              </p>
            </div>
          )}

          {/* No es móvil */}
          {estado === "no-mobile" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <Smartphone className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {mensaje}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Por favor, abre este enlace desde tu teléfono móvil (iPhone o
                  Android).
                </p>
              </div>
            </div>
          )}

          {/* No está en PWA */}
          {estado === "no-pwa" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {mensaje}
                </p>
              </div>

              {showInstructions && (
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    📱 Instrucciones de instalación
                    {platform === "ios" && " (iPhone)"}
                    {platform === "android" && " (Android)"}
                  </h3>
                  <ol className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-semibold text-blue-600 flex-shrink-0">
                          {index + 1}.
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                Ya instalé la aplicación
              </button>
            </div>
          )}

          {/* Éxito */}
          {estado === "ok" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    {mensaje}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    Redirigiendo a la aplicación...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {estado === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {mensaje}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Qué puedo hacer?
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>
                      Si no instalaste correctamente la aplicación, contacta con
                      tu administrador para que te envíe un nuevo enlace de
                      invitación
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>
                      Asegúrate de instalar la aplicación como PWA siguiendo las{" "}
                      <a
                        href="/ayuda-instalacion"
                        className="text-blue-600 dark:text-blue-400 underline"
                      >
                        instrucciones de instalación
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0">•</span>
                    <span>
                      Si el problema persiste, verifica que estás usando el
                      navegador correcto (Safari en iPhone, Chrome en Android)
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
