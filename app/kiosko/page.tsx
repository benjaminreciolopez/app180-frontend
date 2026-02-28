"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { kioskFetch, getKioskToken } from "@/lib/kioskFetch";
import { queueOfflineFichaje, getPendingCount } from "@/lib/offlineQueue";
import { initOfflineSync, onSync, onPendingCountChange } from "@/lib/offlineSync";
import { Delete, LogIn, LogOut, Coffee, Play, Pause, ChevronLeft, Check, X, Wifi, WifiOff, Clock, Search, Utensils, Route, Mail, Smartphone, RefreshCw, CloudOff, Undo2 } from "lucide-react";
import CameraCapture from "@/components/kiosk/CameraCapture";
import { removeOfflineFichaje } from "@/lib/offlineQueue";

// ─── Types ──────────────────────────────────────────────────

type KioskScreen = "loading" | "setup_needed" | "idle" | "identify" | "confirm" | "otp" | "subtipo" | "camera" | "processing" | "success" | "error";

interface KioskConfig {
  empresa_nombre: string;
  logo_url: string | null;
  centro_nombre: string | null;
  device_nombre: string;
  auth_method: string;
  idle_timeout: number;
  show_photo: boolean;
  has_offline_pin: boolean;
}

interface Employee {
  id: string;
  nombre: string;
  codigo_empleado: string | null;
  foto_url: string | null;
}

interface EstadoFichaje {
  empleado_id: string;
  nombre: string;
  estado: "fuera" | "dentro" | "descanso";
  accion: string;
  acciones_posibles: string[];
  ultimo_fichaje: any;
}

// ─── Helpers ────────────────────────────────────────────────

const SUBTIPO_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pausa_corta: { label: "Pausa corta", icon: <Coffee className="h-8 w-8" />, color: "bg-amber-600 hover:bg-amber-500" },
  comida: { label: "Comida", icon: <Utensils className="h-8 w-8" />, color: "bg-orange-600 hover:bg-orange-500" },
  trayecto: { label: "Desplazamiento", icon: <Route className="h-8 w-8" />, color: "bg-blue-600 hover:bg-blue-500" },
};

function ActionIcon({ accion }: { accion: string }) {
  switch (accion) {
    case "entrada": return <LogIn className="h-10 w-10" />;
    case "salida": return <LogOut className="h-10 w-10" />;
    case "descanso_inicio": return <Pause className="h-10 w-10" />;
    case "descanso_fin": return <Play className="h-10 w-10" />;
    default: return <Clock className="h-10 w-10" />;
  }
}

function actionLabel(accion: string) {
  switch (accion) {
    case "entrada": return "Fichar Entrada";
    case "salida": return "Fichar Salida";
    case "descanso_inicio": return "Iniciar Descanso";
    case "descanso_fin": return "Finalizar Descanso";
    default: return "Fichar";
  }
}

function actionColor(accion: string) {
  switch (accion) {
    case "entrada": return "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700";
    case "salida": return "bg-red-600 hover:bg-red-500 active:bg-red-700";
    case "descanso_inicio": return "bg-amber-600 hover:bg-amber-500 active:bg-amber-700";
    case "descanso_fin": return "bg-blue-600 hover:bg-blue-500 active:bg-blue-700";
    default: return "bg-slate-600";
  }
}

// ─── Main Component ─────────────────────────────────────────

export default function KioskoPage() {
  const [screen, setScreen] = useState<KioskScreen>("loading");
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  // Identify
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Confirm
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [estadoFichaje, setEstadoFichaje] = useState<EstadoFichaje | null>(null);
  const [selectedAccion, setSelectedAccion] = useState<string>("");
  const [selectedSubtipo, setSelectedSubtipo] = useState<string | null>(null);

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpDestino, setOtpDestino] = useState("");
  const [otpTipo, setOtpTipo] = useState<"email" | "sms">("email");
  const [otpSending, setOtpSending] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [pendingAccion, setPendingAccion] = useState("");
  const [pendingSubtipo, setPendingSubtipo] = useState<string | null>(null);

  // Camera (offline verification)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Result & Undo
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastFichajeId, setLastFichajeId] = useState<string | null>(null);
  const [lastFichajeLocalId, setLastFichajeLocalId] = useState<string | null>(null);
  const [isOfflineFichaje, setIsOfflineFichaje] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(0);

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const otpCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Clock ──────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Online/Offline ─────────────────────────────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ─── OTP resend cooldown ───────────────────────────────
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    otpCooldownRef.current = setTimeout(() => {
      setOtpResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => {
      if (otpCooldownRef.current) clearTimeout(otpCooldownRef.current);
    };
  }, [otpResendCooldown]);

  // ─── Undo countdown ───────────────────────────────────
  useEffect(() => {
    if (undoCountdown <= 0) return;
    undoTimerRef.current = setTimeout(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          goToIdle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [undoCountdown]);

  // ─── Init: Offline sync ────────────────────────────────
  useEffect(() => {
    const cleanup = initOfflineSync();
    onPendingCountChange((count) => setOfflinePendingCount(count));
    onSync((result) => {
      if (result.aceptados > 0) {
        console.log(`✅ Sincronizados ${result.aceptados} fichajes offline`);
      }
    });
    // Load initial count
    getPendingCount().then(setOfflinePendingCount);
    return cleanup;
  }, []);

  // ─── Init: Load config ─────────────────────────────────
  useEffect(() => {
    const token = getKioskToken();
    if (!token) {
      setScreen("setup_needed");
      return;
    }
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await kioskFetch<KioskConfig>("/api/kiosk/config");
      setConfig(cfg);
      setScreen("idle");
    } catch (err: any) {
      if (err.message === "KIOSK_NOT_CONFIGURED" || err.message === "KIOSK_UNAUTHORIZED") {
        setScreen("setup_needed");
      } else {
        setErrorMessage(err.message);
        setScreen("error");
      }
    }
  };

  // ─── Idle timeout: return to idle after inactivity ──────
  const resetIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    const timeout = (config?.idle_timeout || 30) * 1000;
    idleTimeoutRef.current = setTimeout(() => {
      goToIdle();
    }, timeout);
  }, [config]);

  const goToIdle = () => {
    setScreen("idle");
    setSearchQuery("");
    setEmployees([]);
    setSelectedEmployee(null);
    setEstadoFichaje(null);
    setSelectedAccion("");
    setSelectedSubtipo(null);
    setOtpCode("");
    setOtpDestino("");
    setOtpSending(false);
    setOtpResendCooldown(0);
    setPendingAccion("");
    setPendingSubtipo(null);
    setCapturedPhoto(null);
    setResultMessage("");
    setErrorMessage("");
    setLastFichajeId(null);
    setLastFichajeLocalId(null);
    setIsOfflineFichaje(false);
    setUndoCountdown(0);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  // ─── Search employees (debounced) ──────────────────────
  useEffect(() => {
    if (screen !== "identify") return;
    if (!searchQuery.trim()) {
      setEmployees([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await kioskFetch<Employee[]>("/api/kiosk/identify", {
          method: "POST",
          body: JSON.stringify({ query: searchQuery.trim() }),
        });
        setEmployees(results);
      } catch {
        setEmployees([]);
      }
      setSearchLoading(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, screen]);

  // ─── Select employee → get estado ──────────────────────
  const selectEmployee = async (emp: Employee) => {
    setSelectedEmployee(emp);
    resetIdleTimeout();

    try {
      const estado = await kioskFetch<EstadoFichaje>("/api/kiosk/estado", {
        method: "POST",
        body: JSON.stringify({ empleado_id: emp.id }),
      });
      setEstadoFichaje(estado);
      setSelectedAccion(estado.accion);
      setScreen("confirm");
    } catch (err: any) {
      setErrorMessage(err.message);
      setScreen("error");
    }
  };

  // ─── Request OTP ──────────────────────────────────────
  const requestOTPCode = async () => {
    if (!selectedEmployee) return;
    setOtpSending(true);

    try {
      const result = await kioskFetch<{ sent: boolean; tipo: string; destino_parcial: string }>(
        "/api/kiosk/otp/request",
        {
          method: "POST",
          body: JSON.stringify({ empleado_id: selectedEmployee.id }),
        }
      );
      setOtpTipo(result.tipo as "email" | "sms");
      setOtpDestino(result.destino_parcial);
      setOtpResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message);
      setScreen("error");
    }

    setOtpSending(false);
  };

  // ─── Perform fichaje ──────────────────────────────────
  const doFichaje = async (accion: string, subtipo?: string, otpOverride?: string) => {
    if (!selectedEmployee) return;
    setScreen("processing");
    resetIdleTimeout();

    // Offline mode: queue locally
    if (!navigator.onLine) {
      try {
        // If OTP is required and we're offline, redirect to camera for verification
        if (isOTPRequired() && !capturedPhoto) {
          setPendingAccion(accion);
          setPendingSubtipo(subtipo || null);
          setScreen("camera");
          return;
        }

        const entry = await queueOfflineFichaje({
          empleado_id: selectedEmployee.id,
          empleado_nombre: selectedEmployee.nombre,
          tipo: accion as any,
          subtipo: subtipo || null,
          timestamp: new Date().toISOString(),
          foto_base64: capturedPhoto || undefined,
        });
        const count = await getPendingCount();
        setOfflinePendingCount(count);

        setLastFichajeLocalId(entry.id);
        setIsOfflineFichaje(true);
        setResultMessage(`${actionLabel(accion)} guardado (pendiente de sincronización)`);
        setScreen("success");
        setUndoCountdown(15);
      } catch (err: any) {
        setErrorMessage("Error al guardar fichaje offline");
        setScreen("error");
      }
      return;
    }

    // Online mode: send to server
    try {
      const result = await kioskFetch<{ success: boolean; fichaje?: { id: string }; message?: string }>("/api/kiosk/fichaje", {
        method: "POST",
        body: JSON.stringify({
          empleado_id: selectedEmployee.id,
          tipo: accion,
          subtipo: subtipo || undefined,
          otp_code: otpOverride || undefined,
        }),
      });

      setLastFichajeId(result?.fichaje?.id || null);
      setIsOfflineFichaje(false);
      setResultMessage(`${actionLabel(accion)} registrado correctamente`);
      setScreen("success");
      setUndoCountdown(15);
    } catch (err: any) {
      // If the request fails due to network, fallback to offline queue
      if (!navigator.onLine || err.message?.includes("fetch")) {
        try {
          const entry = await queueOfflineFichaje({
            empleado_id: selectedEmployee.id,
            empleado_nombre: selectedEmployee.nombre,
            tipo: accion as any,
            subtipo: subtipo || null,
            timestamp: new Date().toISOString(),
            foto_base64: capturedPhoto || undefined,
          });
          const count = await getPendingCount();
          setOfflinePendingCount(count);

          setLastFichajeLocalId(entry.id);
          setIsOfflineFichaje(true);
          setResultMessage(`${actionLabel(accion)} guardado (pendiente de sincronización)`);
          setScreen("success");
          setUndoCountdown(15);
        } catch {
          setErrorMessage("Error al guardar fichaje");
          setScreen("error");
        }
      } else {
        setErrorMessage(err.message);
        setScreen("error");
      }
    }
  };

  // ─── Undo fichaje ──────────────────────────────────
  const handleUndo = async () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoCountdown(0);

    if (isOfflineFichaje && lastFichajeLocalId) {
      // Remove from offline queue
      try {
        await removeOfflineFichaje(lastFichajeLocalId);
        const count = await getPendingCount();
        setOfflinePendingCount(count);
      } catch {}
    } else if (lastFichajeId && navigator.onLine) {
      // Void on server
      try {
        await kioskFetch("/api/kiosk/void", {
          method: "POST",
          body: JSON.stringify({
            fichaje_id: lastFichajeId,
            motivo: "Deshecho por el empleado (botón deshacer)",
          }),
        });
      } catch {}
    }

    setResultMessage("Fichaje deshecho correctamente");
    setTimeout(() => goToIdle(), 2000);
  };

  // ─── Check if OTP is required ──────────────────────────
  const isOTPRequired = () => {
    if (!config) return false;
    return config.auth_method.startsWith("otp_");
  };

  // ─── Start OTP flow for a given action ────────────────
  const startOTPFlow = async (accion: string, subtipo?: string | null) => {
    setPendingAccion(accion);
    setPendingSubtipo(subtipo || null);
    setOtpCode("");
    setScreen("otp");
    await requestOTPCode();
  };

  // ─── Submit OTP and proceed with fichaje ──────────────
  const submitOTP = async () => {
    if (otpCode.length !== 6) return;
    resetIdleTimeout();
    doFichaje(pendingAccion, pendingSubtipo || undefined, otpCode);
  };

  // ─── Handle camera capture result ─────────────────────
  const handleCameraCapture = (base64: string) => {
    setCapturedPhoto(base64);
    // Proceed with the queued offline fichaje
    doFichaje(pendingAccion, pendingSubtipo || undefined);
  };

  const handleCameraCancel = () => {
    // Continue without photo
    setCapturedPhoto(null);
    doFichaje(pendingAccion, pendingSubtipo || undefined);
  };

  // ─── Handle confirm action ─────────────────────────────
  const handleConfirmAction = (accion: string) => {
    resetIdleTimeout();
    if (accion === "descanso_inicio") {
      // Mostrar pantalla de subtipos
      setSelectedAccion(accion);
      setScreen("subtipo");
    } else if (isOTPRequired() && navigator.onLine) {
      // OTP solo cuando hay conexión; offline salta OTP
      startOTPFlow(accion);
    } else {
      doFichaje(accion);
    }
  };

  // ─── Numpad for code entry ─────────────────────────────
  const handleNumpadDigit = (digit: string) => {
    resetIdleTimeout();
    setSearchQuery((prev) => prev + digit);
  };

  const handleNumpadDelete = () => {
    resetIdleTimeout();
    setSearchQuery((prev) => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    resetIdleTimeout();
    setSearchQuery("");
  };

  // ─── Time display ──────────────────────────────────────
  const timeStr = currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // ═══════════════════════════════════════════════════════
  // RENDER SCREENS
  // ═══════════════════════════════════════════════════════

  // Loading
  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white/50" />
      </div>
    );
  }

  // Setup needed
  if (screen === "setup_needed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <Clock className="h-10 w-10 text-white/50" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Dispositivo no configurado</h1>
        <p className="text-white/50 mb-8 max-w-md">
          Este dispositivo necesita ser registrado como punto de fichaje.
          Accede a la configuración desde el panel de administración.
        </p>
        <a
          href="/kiosko/setup"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
        >
          Configurar dispositivo
        </a>
      </div>
    );
  }

  // ─── IDLE SCREEN ────────────────────────────────────────
  if (screen === "idle") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={() => { setScreen("identify"); resetIdleTimeout(); }}
      >
        {/* Online/Offline indicator + pending count */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {offlinePendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-600/20 px-3 py-1 rounded-full">
              <CloudOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{offlinePendingCount} pendientes</span>
            </div>
          )}
          {isOnline ? (
            <Wifi className="h-5 w-5 text-emerald-400/60" />
          ) : (
            <div className="flex items-center gap-2 bg-amber-600/20 px-3 py-1 rounded-full">
              <WifiOff className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400">Sin conexión</span>
            </div>
          )}
        </div>

        {/* Company branding */}
        {config?.logo_url && (
          <img src={config.logo_url} alt="Logo" className="h-16 w-auto mb-8 opacity-60" />
        )}

        {/* Clock */}
        <p className="text-8xl md:text-9xl font-thin text-white/90 tracking-wider mb-2">
          {timeStr.split(":").slice(0, 2).join(":")}
        </p>
        <p className="text-xl text-white/40 capitalize mb-2">{dateStr}</p>

        {/* Company info */}
        <div className="mt-8 text-center">
          <p className="text-lg text-white/30">{config?.empresa_nombre}</p>
          {config?.centro_nombre && (
            <p className="text-sm text-white/20">{config.centro_nombre}</p>
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 animate-pulse">
          <p className="text-white/30 text-lg">Toca la pantalla para fichar</p>
        </div>
      </div>
    );
  }

  // ─── IDENTIFY SCREEN ───────────────────────────────────
  if (screen === "identify") {
    return (
      <div className="min-h-screen flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={goToIdle} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <p className="text-white/40 text-sm">{timeStr}</p>
          <div className="w-10" />
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">Identifícate</h2>
        <p className="text-white/40 text-center mb-6">Introduce tu código de empleado o busca por nombre</p>

        {/* Search input */}
        <div className="relative max-w-md mx-auto w-full mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetIdleTimeout(); }}
            placeholder="Código o nombre..."
            className="w-full pl-10 pr-4 py-4 bg-white/10 rounded-xl text-lg text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-500/50"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-w-md mx-auto w-full flex-1 overflow-y-auto">
          {searchLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white/30" />
            </div>
          )}

          {!searchLoading && employees.length === 0 && searchQuery.trim() && (
            <p className="text-center text-white/30 py-8">No se encontraron empleados</p>
          )}

          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => selectEmployee(emp)}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors mb-2"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold flex-shrink-0 overflow-hidden">
                {emp.foto_url ? (
                  <img src={emp.foto_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  emp.nombre.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-left">
                <p className="text-lg font-medium">{emp.nombre}</p>
                {emp.codigo_empleado && (
                  <p className="text-sm text-white/40">{emp.codigo_empleado}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="max-w-[280px] mx-auto mt-4">
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "C") handleNumpadClear();
                  else if (key === "⌫") handleNumpadDelete();
                  else handleNumpadDigit(key);
                }}
                className={`h-14 rounded-xl flex items-center justify-center text-xl font-light transition-colors ${
                  key === "C" || key === "⌫"
                    ? "bg-white/5 hover:bg-white/10 text-white/50"
                    : "bg-white/10 hover:bg-white/20 active:bg-white/30"
                }`}
              >
                {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIRM SCREEN ────────────────────────────────────
  if (screen === "confirm" && selectedEmployee && estadoFichaje) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        {/* Back */}
        <button
          onClick={() => { setScreen("identify"); setSearchQuery(""); resetIdleTimeout(); }}
          className="absolute top-6 left-6 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <p className="text-white/40 text-sm mb-8">{timeStr}</p>

        {/* Employee info */}
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-3xl font-semibold mb-4 overflow-hidden">
          {selectedEmployee.foto_url ? (
            <img src={selectedEmployee.foto_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            selectedEmployee.nombre.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="text-2xl font-semibold mb-1">{selectedEmployee.nombre}</h2>
        {selectedEmployee.codigo_empleado && (
          <p className="text-white/40 mb-2">{selectedEmployee.codigo_empleado}</p>
        )}

        {/* Current state */}
        <div className={`px-4 py-1.5 rounded-full text-sm font-medium mb-8 ${
          estadoFichaje.estado === "dentro" ? "bg-emerald-600/20 text-emerald-400" :
          estadoFichaje.estado === "descanso" ? "bg-amber-600/20 text-amber-400" :
          "bg-slate-600/20 text-slate-400"
        }`}>
          {estadoFichaje.estado === "dentro" ? "Trabajando" :
           estadoFichaje.estado === "descanso" ? "En descanso" :
           "Fuera de jornada"}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {estadoFichaje.acciones_posibles.map((accion) => (
            <button
              key={accion}
              onClick={() => handleConfirmAction(accion)}
              className={`flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-xl font-medium transition-colors ${actionColor(accion)}`}
            >
              <ActionIcon accion={accion} />
              {actionLabel(accion)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── SUBTIPO SCREEN (break type selection) ─────────────
  if (screen === "subtipo") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <button
          onClick={() => { setScreen("confirm"); resetIdleTimeout(); }}
          className="absolute top-6 left-6 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-semibold mb-2">Tipo de descanso</h2>
        <p className="text-white/40 mb-8">Selecciona el tipo de pausa</p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          {Object.entries(SUBTIPO_LABELS).map(([key, { label, icon, color }]) => (
            <button
              key={key}
              onClick={() => {
                if (isOTPRequired() && navigator.onLine) {
                  startOTPFlow("descanso_inicio", key);
                } else {
                  doFichaje("descanso_inicio", key);
                }
              }}
              className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xl font-medium transition-colors ${color}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── OTP SCREEN ──────────────────────────────────────
  if (screen === "otp" && selectedEmployee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        {/* Back */}
        <button
          onClick={() => { setScreen("confirm"); setOtpCode(""); resetIdleTimeout(); }}
          className="absolute top-6 left-6 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <p className="text-white/40 text-sm mb-6">{timeStr}</p>

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-6">
          {otpTipo === "sms" ? (
            <Smartphone className="h-10 w-10 text-blue-400" />
          ) : (
            <Mail className="h-10 w-10 text-blue-400" />
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-2">Código de verificación</h2>
        <p className="text-white/40 text-center mb-2 max-w-sm">
          {otpSending ? "Enviando código..." : (
            otpDestino
              ? `Código enviado a ${otpDestino}`
              : "Introduce el código de verificación"
          )}
        </p>
        <p className="text-white/30 text-sm mb-8">{selectedEmployee.nombre}</p>

        {/* OTP digit display */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-semibold transition-colors ${
                otpCode[i]
                  ? "bg-blue-600/30 text-white border-2 border-blue-500/50"
                  : "bg-white/10 text-white/30 border-2 border-white/10"
              }`}
            >
              {otpCode[i] || ""}
            </div>
          ))}
        </div>

        {/* Numpad */}
        <div className="max-w-[280px] w-full">
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => {
              if (key === "") return <div key="empty" />;
              return (
                <button
                  key={key}
                  onClick={() => {
                    resetIdleTimeout();
                    if (key === "⌫") {
                      setOtpCode((prev) => prev.slice(0, -1));
                    } else if (otpCode.length < 6) {
                      const newCode = otpCode + key;
                      setOtpCode(newCode);
                      // Auto-submit when 6 digits entered
                      if (newCode.length === 6) {
                        setTimeout(() => {
                          doFichaje(pendingAccion, pendingSubtipo || undefined, newCode);
                        }, 300);
                      }
                    }
                  }}
                  className={`h-14 rounded-xl flex items-center justify-center text-xl font-light transition-colors ${
                    key === "⌫"
                      ? "bg-white/5 hover:bg-white/10 text-white/50"
                      : "bg-white/10 hover:bg-white/20 active:bg-white/30"
                  }`}
                >
                  {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resend */}
        <button
          onClick={() => {
            if (otpResendCooldown > 0 || otpSending) return;
            requestOTPCode();
          }}
          disabled={otpResendCooldown > 0 || otpSending}
          className="mt-6 flex items-center gap-2 text-sm text-white/40 hover:text-white/60 disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${otpSending ? "animate-spin" : ""}`} />
          {otpResendCooldown > 0
            ? `Reenviar en ${otpResendCooldown}s`
            : otpSending
            ? "Enviando..."
            : "Reenviar código"}
        </button>
      </div>
    );
  }

  // ─── CAMERA SCREEN (offline verification) ──────────────
  if (screen === "camera") {
    return (
      <CameraCapture
        title={`Foto de verificación — ${selectedEmployee?.nombre || ""}`}
        onCapture={handleCameraCapture}
        onCancel={handleCameraCancel}
      />
    );
  }

  // ─── PROCESSING SCREEN ─────────────────────────────────
  if (screen === "processing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white/50 mb-6" />
        <p className="text-xl text-white/50">Registrando fichaje...</p>
      </div>
    );
  }

  // ─── SUCCESS SCREEN (with undo window) ─────────────────
  if (screen === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-emerald-600/20 flex items-center justify-center mb-6">
          <Check className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Fichaje registrado</h2>
        <p className="text-white/50 text-lg text-center">{resultMessage}</p>
        {selectedEmployee && (
          <p className="text-white/30 mt-4">{selectedEmployee.nombre}</p>
        )}

        {/* Undo button with countdown */}
        {undoCountdown > 0 && (
          <button
            onClick={handleUndo}
            className="mt-8 flex items-center gap-3 px-8 py-4 bg-red-600/20 hover:bg-red-600/40 border-2 border-red-500/40 rounded-2xl text-red-400 font-medium text-lg transition-colors"
          >
            <Undo2 className="h-6 w-6" />
            No soy yo / Deshacer ({undoCountdown}s)
          </button>
        )}

        <p className="text-white/20 mt-6 text-sm">
          {undoCountdown > 0
            ? "Pulsa si te has equivocado"
            : "Volviendo a la pantalla principal..."}
        </p>
      </div>
    );
  }

  // ─── ERROR SCREEN ──────────────────────────────────────
  if (screen === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-red-600/20 flex items-center justify-center mb-6">
          <X className="h-12 w-12 text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Error</h2>
        <p className="text-white/50 text-lg text-center max-w-md">{errorMessage}</p>
        <button
          onClick={goToIdle}
          className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // Fallback
  return null;
}
