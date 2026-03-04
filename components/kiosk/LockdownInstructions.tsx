"use client";

import { useState, useEffect } from "react";
import { Tablet, Smartphone, ChevronRight, ExternalLink, Lock, Plus } from "lucide-react";

interface LockdownInstructionsProps {
  onContinue: () => void;
}

const STEPS_HOMESCREEN_IPAD = [
  "Abre Safari en el iPad y navega a la direccion del punto de fichaje",
  'Pulsa el icono de compartir (cuadrado con flecha hacia arriba)',
  'Desplazate y selecciona "Anadir a pantalla de inicio"',
  'Pulsa "Anadir" — se creara un icono en la pantalla de inicio',
  "Abre la app desde el nuevo icono (se abrira a pantalla completa)",
];

const STEPS_GUIDED_IPAD = [
  'Abre "Ajustes" > "Accesibilidad" > "Acceso Guiado"',
  "Activa el Acceso Guiado y configura un codigo de acceso",
  "Abre la app del punto de fichaje desde el icono de inicio",
  "Pulsa 3 veces el boton lateral (o el boton de inicio)",
  'Pulsa "Iniciar" en la esquina superior derecha',
  "El iPad quedara bloqueado en la aplicacion",
];

const STEPS_HOMESCREEN_ANDROID = [
  "Abre Chrome en la tablet y navega a la direccion del punto de fichaje",
  "Pulsa el menu (3 puntos arriba a la derecha)",
  'Selecciona "Anadir a pantalla de inicio" o "Instalar aplicacion"',
  'Confirma pulsando "Anadir"',
  "Abre la app desde el nuevo icono en la pantalla de inicio",
];

const STEPS_PINNING_ANDROID = [
  'Abre "Ajustes" > "Seguridad" (o "Seguridad y privacidad")',
  'Busca "Fijacion de pantalla" y activala',
  'Activa tambien "Solicitar PIN para desfijar" (recomendado)',
  "Abre la app del punto de fichaje desde el icono de inicio",
  "Abre las aplicaciones recientes (boton cuadrado)",
  'Toca el icono de la aplicacion > "Fijar" o "Fijar pantalla"',
];

export default function LockdownInstructions({ onContinue }: LockdownInstructionsProps) {
  const [activeTab, setActiveTab] = useState<"ipad" | "android">("ipad");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) setActiveTab("android");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
            <Lock className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Configurar como kiosco</h1>
          <p className="text-slate-400 text-sm">
            Sigue estos pasos para que la tablet funcione exclusivamente como punto de fichaje
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("ipad")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "ipad"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Tablet className="h-4 w-4" />
            iPad
          </button>
          <button
            onClick={() => setActiveTab("android")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "android"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Android
          </button>
        </div>

        {/* Step 1: Add to Home Screen */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
              1
            </div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Crear acceso directo
            </h2>
          </div>
          <div className="space-y-2 ml-9">
            {(activeTab === "ipad" ? STEPS_HOMESCREEN_IPAD : STEPS_HOMESCREEN_ANDROID).map(
              (step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/5 rounded-lg p-3"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Step 2: Lock down */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
              2
            </div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              {activeTab === "ipad" ? "Activar Acceso Guiado" : "Activar Fijacion de pantalla"}
            </h2>
          </div>
          <div className="space-y-2 ml-9">
            {(activeTab === "ipad" ? STEPS_GUIDED_IPAD : STEPS_PINNING_ANDROID).map(
              (step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white/5 rounded-lg p-3"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* How to exit */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-slate-300 mb-1">
            Para desbloquear:
          </p>
          <p className="text-sm text-slate-400">
            {activeTab === "ipad"
              ? "Pulsa 3 veces el boton lateral e introduce tu codigo de acceso"
              : "Manten pulsados los botones Atras y Vista general a la vez, luego introduce tu PIN"}
          </p>
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
        >
          Entendido, ir al Punto de Fichaje
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
