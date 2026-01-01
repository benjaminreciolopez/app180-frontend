"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function InstalarEmpleadoPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token;

  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function activar() {
      if (!token) {
        setEstado("error");
        setMensaje("Falta token de invitación");
        return;
      }

      try {
        let device_hash = localStorage.getItem("device_hash");
        if (!device_hash) {
          device_hash = crypto.randomUUID();
          localStorage.setItem("device_hash", device_hash);
        }

        const res = await api.post("/empleado/activate-install", {
          token,
          device_hash,
          user_agent: navigator.userAgent,
        });

        setEstado("ok");
        setMensaje(res.data?.message || "Dispositivo activado correctamente");
      } catch (err: any) {
        console.error(err);
        setEstado("error");
        setMensaje(
          err?.response?.data?.error || "No se pudo activar este dispositivo"
        );
      }
    }

    activar();
  }, [token]);

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

            <p>Puedes instalar la app ahora.</p>

            <a
              href="/empleado/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded inline-block"
            >
              Ir a la aplicación
            </a>
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
