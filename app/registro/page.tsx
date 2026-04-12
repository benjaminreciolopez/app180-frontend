"use client";

import { useState, useEffect, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Briefcase,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Calendar,
  ReceiptEuro,
  Wallet,
  ClipboardList,
  CalendarClock,
  BarChart3,
  Calculator,
  Scale,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Modo = "empresa" | "asesoria" | null;

type ModuloConfig = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultOn: boolean;
};

const MODULOS_DISPONIBLES: ModuloConfig[] = [
  {
    key: "empleados",
    label: "Empleados",
    description: "Gestion de personal y RRHH",
    icon: <Users className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "fichajes",
    label: "Fichajes",
    description: "Control horario y asistencia",
    icon: <Clock className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "calendario",
    label: "Calendario",
    description: "Planificacion y turnos",
    icon: <Calendar className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "calendario_import",
    label: "Importar Calendario",
    description: "Importar festivos y eventos",
    icon: <CalendarClock className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "clientes",
    label: "Clientes",
    description: "Base de datos de clientes",
    icon: <ClipboardList className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "worklogs",
    label: "Partes de Trabajo",
    description: "Registro de trabajos diarios",
    icon: <BarChart3 className="w-4 h-4" />,
    defaultOn: true,
  },
  {
    key: "facturacion",
    label: "Facturacion",
    description: "Facturas y VeriFactu",
    icon: <ReceiptEuro className="w-4 h-4" />,
    defaultOn: false,
  },
  {
    key: "pagos",
    label: "Pagos",
    description: "Gestion de cobros y pagos",
    icon: <Wallet className="w-4 h-4" />,
    defaultOn: false,
  },
  {
    key: "contable",
    label: "Contabilidad",
    description: "Asientos, balance, PyG y plan de cuentas",
    icon: <Calculator className="w-4 h-4" />,
    defaultOn: false,
  },
  {
    key: "fiscal",
    label: "Fiscal",
    description: "Modelos fiscales, IVA y alertas",
    icon: <Scale className="w-4 h-4" />,
    defaultOn: false,
  },
];

const EMPRESA_DEFAULTS: Record<string, boolean> = {
  empleados: true,
  fichajes: true,
  calendario: true,
  calendario_import: true,
  clientes: true,
  worklogs: true,
  facturacion: false,
  pagos: false,
  contable: false,
  fiscal: false,
};

const ASESORIA_DEFAULTS: Record<string, boolean> = {
  empleados: true,
  fichajes: true,
  calendario: true,
  calendario_import: true,
  clientes: true,
  worklogs: true,
  facturacion: true,
  pagos: true,
  contable: true,
  fiscal: true,
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Debil", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Regular", color: "bg-orange-500" };
  if (score <= 3) return { score: 3, label: "Buena", color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: "Fuerte", color: "bg-green-500" };
  return { score: 5, label: "Muy fuerte", color: "bg-emerald-500" };
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroPageInner />
    </Suspense>
  );
}

function RegistroPageInner() {
  const searchParams = useSearchParams();
  const modoParam = searchParams.get("modo") as Modo;
  const modoInicial = modoParam === "empresa" || modoParam === "asesoria" ? modoParam : null;

  const [step, setStep] = useState(modoInicial ? 2 : 1);
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [modulos, setModulos] = useState<Record<string, boolean>>(() => {
    const defaults = modoInicial === "asesoria" ? ASESORIA_DEFAULTS : modoInicial === "empresa" ? EMPRESA_DEFAULTS : {};
    if (modoInicial) return { ...defaults };
    const initial: Record<string, boolean> = {};
    MODULOS_DISPONIBLES.forEach((m) => {
      initial[m.key] = m.defaultOn;
    });
    return initial;
  });

  // Common fields
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Empresa fields
  const [empresaNombre, setEmpresaNombre] = useState("");

  // Asesoria fields
  const [asesoriaNombre, setAsesoriaNombre] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [cif, setCif] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP verification states
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [destinoParcial, setDestinoParcial] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passwordStrength = password ? getPasswordStrength(password) : null;

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function selectModo(m: Modo) {
    setModo(m);
    const defaults = m === "asesoria" ? ASESORIA_DEFAULTS : EMPRESA_DEFAULTS;
    setModulos({ ...defaults });
  }

  function toggleModulo(key: string) {
    setModulos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function canAdvance(): boolean {
    if (step === 1) return modo !== null;
    if (step === 2) return Object.values(modulos).some(Boolean);
    return true;
  }

  function nextStep() {
    if (canAdvance()) setStep((s) => s + 1);
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1));
  }

  function validateStep3(): boolean {
    if (!nombre.trim() || !email.trim() || !password) {
      setError("Todos los campos obligatorios deben estar completos");
      return false;
    }
    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return false;
    }
    if (modo === "empresa" && !empresaNombre.trim()) {
      setError("El nombre de la empresa es obligatorio");
      return false;
    }
    if (modo === "asesoria") {
      if (!asesoriaNombre.trim()) {
        setError("El nombre de la asesoria es obligatorio");
        return false;
      }
      if (!emailContacto.trim()) {
        setError("El email de contacto de la asesoria es obligatorio");
        return false;
      }
    }
    return true;
  }

  async function handleSendOtp() {
    if (!validateStep3()) return;
    setSendingOtp(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error enviando codigo");
        setSendingOtp(false);
        return;
      }
      setDestinoParcial(data.destino_parcial);
      setOtpSent(true);
      setOtpCode(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setStep(4);
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
    } finally {
      setSendingOtp(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(""));
      otpInputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const code = otpCode.join("");
    if (code.length !== 6) {
      setError("Introduce el codigo de 6 digitos");
      return;
    }

    setLoading(true);
    setError("");

    // Verify OTP first
    try {
      const verifyRes = await fetch(`${API_BASE}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Codigo incorrecto o expirado");
        setLoading(false);
        return;
      }
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
      setLoading(false);
      return;
    }

    try {
      let res: Response;

      if (modo === "empresa") {
        res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            nombre: nombre.trim(),
            empresa_nombre: empresaNombre.trim(),
            modulos,
          }),
        });
      } else {
        res = await fetch(`${API_BASE}/asesor/registro`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: asesoriaNombre.trim(),
            email_contacto: emailContacto.trim().toLowerCase(),
            cif: cif.trim().toUpperCase() || undefined,
            telefono: telefono.trim() || undefined,
            direccion: direccion.trim() || undefined,
            user_nombre: nombre.trim(),
            user_email: email.trim().toLowerCase(),
            user_password: password,
            modulos,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la cuenta");
        setLoading(false);
        return;
      }

      // Store auth data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on mode
      if (modo === "asesoria") {
        window.location.href = "/asesor/dashboard";
      } else {
        window.location.href = "/admin/dashboard";
      }
    } catch {
      setError("Error de conexion. Intentalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-white rounded-2xl px-8 py-6 shadow-lg">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-600">Creando cuenta...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">CONTENDO GESTIONES</h1>
          <p className="text-sm text-gray-500 mt-1">Crear nueva cuenta</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s === step
                    ? "bg-blue-600 text-white"
                    : s < step
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-8 h-0.5 ${
                    s < step ? "bg-blue-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            {/* STEP 1: Mode selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">Tipo de cuenta</h2>
                  <p className="text-sm text-gray-500">Selecciona como vas a usar Contendo</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => selectModo("empresa")}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      modo === "empresa"
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        modo === "empresa" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Empresa</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Gestiona empleados, fichajes, facturas y mas. Ideal para empresas y autonomos.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectModo("asesoria")}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      modo === "asesoria"
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        modo === "asesoria"
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Asesoria / Gestoria</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Gestiona multiples empresas cliente. Para asesorias fiscales, laborales y contables.
                      </p>
                    </div>
                  </button>
                </div>

                <Button
                  onClick={nextStep}
                  disabled={!canAdvance()}
                  className="w-full mt-4"
                  size="lg"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <p className="text-sm text-center text-gray-500">
                  Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-blue-600 font-medium hover:underline">
                    Iniciar sesion
                  </Link>
                </p>
              </div>
            )}

            {/* STEP 2: Module selection */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">Modulos activos</h2>
                  <p className="text-sm text-gray-500">
                    Selecciona los modulos que necesitas. Puedes cambiarlos despues.
                  </p>
                </div>

                <div className="space-y-2">
                  {MODULOS_DISPONIBLES.map((m) => (
                    <div
                      key={m.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                        modulos[m.key]
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={() => toggleModulo(m.key)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            modulos[m.key]
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {m.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.label}</p>
                          <p className="text-xs text-gray-500">{m.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={modulos[m.key]}
                        onCheckedChange={() => toggleModulo(m.key)}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button onClick={nextStep} disabled={!canAdvance()} className="flex-1">
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Registration form */}
            {step === 3 && (
              <div className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Mode-specific fields */}
                {modo === "empresa" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide">Empresa</h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nombre de la empresa *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Mi Empresa SL"
                          value={empresaNombre}
                          onChange={(e) => setEmpresaNombre(e.target.value)}
                          className="pl-9"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide">Asesoria</h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nombre de la asesoria *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Asesoria Fiscal Garcia SL"
                          value={asesoriaNombre}
                          onChange={(e) => setAsesoriaNombre(e.target.value)}
                          className="pl-9"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email de contacto *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="info@asesoria.com"
                          value={emailContacto}
                          onChange={(e) => setEmailContacto(e.target.value)}
                          className="pl-9"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>CIF</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="B12345678"
                            value={cif}
                            onChange={(e) => setCif(e.target.value)}
                            className="pl-9 uppercase"
                            maxLength={9}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Telefono</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="tel"
                            placeholder="912345678"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            className="pl-9"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Direccion</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Calle Mayor 1, Madrid"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          className="pl-9"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* User account fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Tu cuenta</h3>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Nombre completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Juan Garcia"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Contrasena *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Seguridad: {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Confirmar contrasena *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Repite la contrasena"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                      />
                    </div>
                    {confirmPassword && password && (
                      <div className="flex items-center gap-1">
                        {confirmPassword === password ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <p className="text-[11px] text-green-600">Las contrasenas coinciden</p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <p className="text-[11px] text-red-500">Las contrasenas no coinciden</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button type="button" onClick={handleSendOtp} disabled={sendingOtp} className="flex-1">
                    {sendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1" />
                        Verificar email
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-gray-400">
                  Al registrarte, aceptas los{" "}
                  <a href="/terminos" className="underline hover:text-gray-600">
                    terminos
                  </a>{" "}
                  y la{" "}
                  <a href="/privacidad" className="underline hover:text-gray-600">
                    politica de privacidad
                  </a>
                </p>
              </div>
            )}

            {/* STEP 4: OTP Verification */}
            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold">Verifica tu email</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Hemos enviado un codigo de 6 digitos a
                  </p>
                  <p className="text-sm font-medium text-gray-700">{destinoParcial}</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* OTP Input */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Resend */}
                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <p className="text-xs text-gray-400">
                      Reenviar codigo en {resendCooldown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {sendingOtp ? "Enviando..." : "Reenviar codigo"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setStep(3); setError(""); }} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Atras
                  </Button>
                  <Button type="submit" disabled={loading || otpCode.join("").length !== 6} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        Crear cuenta
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
