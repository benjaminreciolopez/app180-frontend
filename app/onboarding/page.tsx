"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { getUser, updateStoredUser } from "@/services/auth";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Check, Calendar, Mail, ArrowRight, Building2,
  User, Briefcase, Bot, Sparkles, Shield
} from "lucide-react";

type Modulos = {
  fichajes: boolean;
  worklogs: boolean;
  empleados: boolean;
  calendario: boolean;
  facturacion: boolean;
  pagos: boolean;
  clientes: boolean;
  fiscal: boolean;
};

const MODULE_LIST = [
  { key: "empleados", label: "Empleados", desc: "Gestion de empleados, ausencias, dispositivos", default: true },
  { key: "fichajes", label: "Fichajes", desc: "Control de entrada/salida, horas trabajadas", default: true },
  { key: "calendario", label: "Calendario", desc: "Festivos, cierres, planificacion", default: true },
  { key: "clientes", label: "Clientes", desc: "Base de datos de clientes, datos fiscales", default: true },
  { key: "facturacion", label: "Facturacion", desc: "Facturas, conceptos, IVA, VeriFactu", default: false },
  { key: "pagos", label: "Cobros y Pagos", desc: "Control de cobros y pagos de clientes", default: false },
  { key: "worklogs", label: "Trabajos / Partes", desc: "Partes de trabajo, asignaciones a clientes", default: false },
  { key: "fiscal", label: "Fiscal", desc: "Modelos 303, 130, 111 y libros registro", default: false },
];

const TOTAL_STEPS = 5;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVip = searchParams.get("vip") === "1";
  const [step, setStep] = useState(1);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [tipoContribuyente, setTipoContribuyente] = useState<"autonomo" | "sociedad">("autonomo");
  const [modulos, setModulos] = useState<Modulos>({
    fichajes: isVip,
    worklogs: isVip,
    empleados: isVip,
    calendario: isVip,
    facturacion: isVip,
    pagos: isVip,
    clientes: isVip,
    fiscal: isVip,
  });
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const domain = user.email?.split("@")[1]?.split(".")[0] || "";
    setEmpresaNombre(domain.charAt(0).toUpperCase() + domain.slice(1));
  }, [router]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "oauth-success") {
        setGoogleConnected(true);
        showSuccess("Google Calendar y Gmail conectados");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function toggleModule(key: string) {
    setModulos((prev) => ({ ...prev, [key]: !prev[key as keyof Modulos] }));
  }

  async function handleConnectGoogle() {
    setLoading(true);
    try {
      const res = await api.post("/auth/google/complete-setup", {
        empresa_nombre: empresaNombre,
      });
      const { authUrl } = res.data;
      window.open(
        authUrl,
        "Google Setup",
        "width=500,height=700,scrollbars=yes,resizable=yes,left=200,top=100"
      );
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error conectando con Google");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      // 1. Update empresa name + tipo_contribuyente
      if (empresaNombre) {
        await api.post("/auth/google/complete-setup", {
          empresa_nombre: empresaNombre,
        }).catch(() => {});
      }

      // 2. Save tipo_contribuyente
      await api.put("/admin/empresa/tipo-contribuyente", {
        tipo_contribuyente: tipoContribuyente
      }).catch(() => {});

      // 3. Save modules
      await api.put("/admin/configuracion", { modulos });

      // 4. Refresh user data
      const me = await api.get("/auth/me");
      updateStoredUser(me.data);
      localStorage.setItem("user", JSON.stringify(me.data));
      window.dispatchEvent(new Event("session-updated"));

      showSuccess("Configuracion completada");
      router.replace("/admin/dashboard");
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error guardando configuracion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step 1: Empresa name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold">Nombre de tu empresa</h1>
                <p className="text-gray-500 text-sm">
                  Puedes cambiarlo mas adelante en Configuracion
                </p>
              </div>

              <input
                type="text"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                placeholder="Mi Empresa SL"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />

              <Button
                onClick={() => setStep(2)}
                disabled={!empresaNombre.trim()}
                className="w-full py-6 text-base font-semibold"
              >
                Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Tipo de contribuyente */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Briefcase className="w-7 h-7 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold">Tipo de contribuyente</h1>
                <p className="text-gray-500 text-sm">
                  Necesario para calcular los plazos de VeriFactu y modelos fiscales
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setTipoContribuyente("autonomo")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    tipoContribuyente === "autonomo"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tipoContribuyente === "autonomo" ? "bg-blue-500" : "bg-gray-200"
                  }`}>
                    <User className={`w-5 h-5 ${tipoContribuyente === "autonomo" ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className="font-semibold">Autonomo / Persona fisica</p>
                    <p className="text-xs text-gray-500">Tributas por IRPF. VeriFactu obligatorio desde el 1 de julio de 2027.</p>
                  </div>
                  {tipoContribuyente === "autonomo" && <Check className="w-5 h-5 text-blue-500 ml-auto shrink-0" />}
                </button>

                <button
                  onClick={() => setTipoContribuyente("sociedad")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    tipoContribuyente === "sociedad"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tipoContribuyente === "sociedad" ? "bg-blue-500" : "bg-gray-200"
                  }`}>
                    <Building2 className={`w-5 h-5 ${tipoContribuyente === "sociedad" ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className="font-semibold">Sociedad (SL, SA, etc.)</p>
                    <p className="text-xs text-gray-500">Tributas por Impuesto de Sociedades. VeriFactu obligatorio desde el 1 de enero de 2027.</p>
                  </div>
                  {tipoContribuyente === "sociedad" && <Check className="w-5 h-5 text-blue-500 ml-auto shrink-0" />}
                </button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-5">
                  Atras
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 py-5 font-semibold">
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Connect Google services */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                  {googleConnected ? (
                    <Check className="w-7 h-7 text-green-600" />
                  ) : (
                    <Calendar className="w-7 h-7 text-green-600" />
                  )}
                </div>
                <h1 className="text-2xl font-bold">Conectar servicios Google</h1>
                <p className="text-gray-500 text-sm">
                  Conecta tu cuenta de Google para sincronizar Calendar y enviar emails
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Google Calendar</p>
                    <p className="text-xs text-gray-500">Sincroniza festivos, cierres y eventos automaticamente</p>
                  </div>
                  {googleConnected && <Check className="w-5 h-5 text-green-500 ml-auto mt-0.5" />}
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <Mail className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Gmail</p>
                    <p className="text-xs text-gray-500">Envia facturas, invitaciones y notificaciones</p>
                  </div>
                  {googleConnected && <Check className="w-5 h-5 text-green-500 ml-auto mt-0.5" />}
                </div>
              </div>

              {googleConnected ? (
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-700">Servicios conectados correctamente</p>
                </div>
              ) : (
                <Button
                  onClick={handleConnectGoogle}
                  disabled={loading}
                  className="w-full py-6 text-base font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? "Conectando..." : "Autorizar con Google"}
                </Button>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 py-5">
                  Atras
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 py-5 font-semibold">
                  {googleConnected ? "Continuar" : "Omitir por ahora"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Choose modules */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Elige tus modulos</h1>
                <p className="text-gray-500 text-sm">
                  {isVip
                    ? "Como usuario VIP tienes todos los modulos incluidos."
                    : "Activa solo los que necesites. Puedes cambiarlos en cualquier momento."
                  }
                </p>
                {isVip && (
                  <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    VIP - Todos incluidos
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {MODULE_LIST.map((mod) => (
                  <button
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      modulos[mod.key as keyof Modulos]
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      modulos[mod.key as keyof Modulos]
                        ? "bg-blue-500"
                        : "bg-gray-200"
                    }`}>
                      {modulos[mod.key as keyof Modulos] && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{mod.label}</p>
                      <p className="text-xs text-gray-500">{mod.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 py-5">
                  Atras
                </Button>
                <Button onClick={() => setStep(5)} className="flex-1 py-5 font-semibold">
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Welcome / Ready */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Todo listo</h1>
                <p className="text-gray-500 text-sm">
                  Tu asistente CONTENDO esta preparado para ayudarte
                </p>
              </div>

              <div className={`rounded-xl p-5 space-y-3 border ${
                isVip
                  ? "bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100"
              }`}>
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                  {isVip ? <Shield className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {isVip ? "Plan VIP - Cortesia del creador" : "Plan gratuito incluido"}
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    10 consultas IA diarias con CONTENDO
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    300 consultas mensuales
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    Todos los modulos activados
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    VeriFactu y auditoria incluidos
                  </li>
                </ul>
                <p className="text-xs text-gray-400">
                  {isVip
                    ? "Los limites de IA (10/dia, 300/mes) aplican igual. Puedes recargar creditos desde configuracion."
                    : "Puedes recargar creditos IA en cualquier momento desde la configuracion."
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1 py-5">
                  Atras
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-5 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? "Guardando..." : "Ir al dashboard"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
