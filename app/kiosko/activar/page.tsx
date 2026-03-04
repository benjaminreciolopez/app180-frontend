"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setKioskToken } from "@/lib/kioskFetch";
import LockdownInstructions from "@/components/kiosk/LockdownInstructions";
import { CheckCircle2, Loader2, AlertTriangle, ChevronRight, BookOpen } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

type Step = "validating" | "success" | "lockdown" | "error";

function ActivarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>("validating");
  const [error, setError] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No se proporciono token de activacion. Solicita un nuevo QR al administrador.");
      setStep("error");
      return;
    }
    activateDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activateDevice = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/kiosk/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Token invalido o expirado");
      }

      // Store device token
      setKioskToken(data.device_token);
      setDeviceName(data.device_name);
      setEmpresaNombre(data.empresa_nombre);
      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al activar dispositivo";
      setError(message);
      setStep("error");
    }
  };

  const goToKiosk = () => router.replace("/kiosko");

  // ─── Validating ────────────────────────────────────────
  if (step === "validating") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Activando dispositivo...</p>
          <p className="text-slate-400 text-sm mt-2">Verificando token de activacion</p>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Error de activacion</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <p className="text-slate-500 text-sm">
            Contacta con el administrador para obtener un nuevo codigo QR de activacion.
          </p>
        </div>
      </div>
    );
  }

  // ─── Lockdown Instructions ─────────────────────────────
  if (step === "lockdown") {
    return <LockdownInstructions onContinue={goToKiosk} />;
  }

  // ─── Success ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Dispositivo activado</h1>
        <p className="text-slate-400 mb-1">{deviceName}</p>
        <p className="text-slate-500 text-sm mb-8">{empresaNombre}</p>

        <div className="space-y-3">
          <button
            onClick={() => setStep("lockdown")}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="h-5 w-5" />
            Configurar como kiosco
          </button>
          <button
            onClick={goToKiosk}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Ir al Punto de Fichaje
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="text-slate-600 text-xs mt-6">
          Recomendamos configurar el modo kiosco para bloquear la tablet en esta aplicacion
        </p>
      </div>
    </div>
  );
}

export default function KioskoActivarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
        </div>
      }
    >
      <ActivarContent />
    </Suspense>
  );
}
