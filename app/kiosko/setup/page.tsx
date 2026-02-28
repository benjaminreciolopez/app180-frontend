"use client";

import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/utils/api";
import { setKioskToken } from "@/lib/kioskFetch";
import { Check, Monitor, MapPin, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

interface Centro {
  id: string;
  nombre: string;
  direccion: string;
}

export default function KioskoSetupPage() {
  const [step, setStep] = useState<"auth" | "form" | "done">("auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auth check
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form
  const [nombre, setNombre] = useState("");
  const [centroId, setCentroId] = useState("");
  const [offlinePin, setOfflinePin] = useState("");
  const [centros, setCentros] = useState<Centro[]>([]);

  // Result
  const [deviceToken, setDeviceToken] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authenticatedFetch("/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.role === "admin") {
          setIsAuthenticated(true);
          setStep("form");
          loadCentros();
        } else {
          setError("Solo administradores pueden configurar dispositivos kiosko");
        }
      } else {
        setError("Debes iniciar sesión como administrador");
      }
    } catch {
      setError("No se pudo verificar la sesión");
    }
  };

  const loadCentros = async () => {
    try {
      const res = await authenticatedFetch("/admin/centros-trabajo");
      if (res.ok) {
        const data = await res.json();
        setCentros(Array.isArray(data) ? data : data.centros || []);
      }
    } catch {
      // No centros available
    }
  };

  const handleRegister = async () => {
    if (!nombre.trim()) {
      setError("El nombre del dispositivo es obligatorio");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await authenticatedFetch("/api/kiosk/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          centro_trabajo_id: centroId || null,
          offline_pin: offlinePin || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al registrar");
      }

      const data = await res.json();
      setDeviceToken(data.device_token);

      // Guardar token en localStorage para uso del kiosko
      setKioskToken(data.device_token);

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  // ─── AUTH CHECK ────────────────────────────────────────
  if (step === "auth" && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        {error ? (
          <>
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <a href="/login" className="text-blue-400 underline">
              Ir a iniciar sesión
            </a>
          </>
        ) : (
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white/50" />
        )}
      </div>
    );
  }

  // ─── FORM ──────────────────────────────────────────────
  if (step === "form") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-center mb-2">Configurar Punto de Fichaje</h1>
          <p className="text-white/40 text-center mb-8">
            Registra este dispositivo como terminal de fichaje
          </p>

          {error && (
            <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Device name */}
          <label className="block mb-4">
            <span className="text-sm text-white/60 mb-1 block">Nombre del dispositivo *</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tablet Recepción, Terminal Planta 2"
              className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </label>

          {/* Centro de trabajo */}
          <label className="block mb-4">
            <span className="text-sm text-white/60 mb-1 block">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              Centro de trabajo (opcional)
            </span>
            <select
              value={centroId}
              onChange={(e) => setCentroId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Sin centro asignado</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>

          {/* Offline PIN */}
          <label className="block mb-8">
            <span className="text-sm text-white/60 mb-1 block">PIN offline (opcional)</span>
            <input
              type="text"
              value={offlinePin}
              onChange={(e) => setOfflinePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN para fichajes sin conexión (4-6 dígitos)"
              maxLength={6}
              className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-500/50 tracking-widest"
            />
            <span className="text-xs text-white/30 mt-1 block">
              Se usará cuando el dispositivo no tenga conexión a internet
            </span>
          </label>

          <button
            onClick={handleRegister}
            disabled={loading || !nombre.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Monitor className="h-5 w-5" />
                Registrar dispositivo
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── DONE ──────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center mb-6">
          <Check className="h-10 w-10 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-semibold mb-2">Dispositivo registrado</h1>
        <p className="text-white/40 mb-6">
          El punto de fichaje está listo para usar
        </p>

        <div className="bg-white/5 rounded-lg p-4 mb-8 max-w-md w-full">
          <p className="text-xs text-white/30 mb-2">Token del dispositivo (guardado automáticamente)</p>
          <p className="text-xs text-white/50 font-mono break-all">{deviceToken}</p>
        </div>

        <a
          href="/kiosko"
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-lg transition-colors"
        >
          Ir al Punto de Fichaje
        </a>
      </div>
    );
  }

  return null;
}
