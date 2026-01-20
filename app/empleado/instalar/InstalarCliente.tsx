"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";

export default function InstalarCliente({ token }: { token?: string }) {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();
  const executed = useRef(false);

  useEffect(() => {
    async function activar() {
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

      try {
        let device_hash: string = localStorage.getItem("device_hash") ?? "";

        if (!device_hash) {
          device_hash =
            globalThis.crypto?.randomUUID?.() ||
            Math.random().toString(36).substring(2);

          localStorage.setItem("device_hash", device_hash);
        }

        const res = await api.post("/empleado/activate-install", {
          token: tokenFinal, // ✅ usamos tokenFinal
          device_hash,
          user_agent: navigator.userAgent,
        });

        setEstado("ok");
        setMensaje(res.data?.message || "Dispositivo activado correctamente");

        setTimeout(() => {
          router.replace("/login");
        }, 1500);
      } catch (err: any) {
        console.error(err);
        setEstado("error");
        setMensaje(
          err?.response?.data?.error || "No se pudo activar este dispositivo",
        );
      }
    }

    activar();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="bg-white shadow p-6 rounded max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold">Activación de dispositivo</h1>

        {estado === "cargando" && (
          <p>Validando invitación y registrando dispositivo...</p>
        )}

        {estado === "ok" && (
          <>
            <p className="text-green-600">{mensaje}</p>
            <p className="text-sm text-gray-500">
              Redirigiendo a la aplicación…
            </p>
          </>
        )}

        {estado === "error" && (
          <>
            <p className="text-red-600">{mensaje}</p>
            <p>Pide al administrador otra invitación si continúa fallando.</p>
          </>
        )}
      </div>
    </div>
  );
}
