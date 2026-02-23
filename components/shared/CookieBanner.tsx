"use client";

import { useState, useEffect } from "react";
import { X, Cookie, Settings, Check } from "lucide-react";
import Link from "next/link";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Siempre activadas
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Verificar si el usuario ya ha dado consentimiento
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Mostrar banner después de 1 segundo
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Cargar preferencias guardadas
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        console.error("Error loading cookie preferences");
      }
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted));
    setShowBanner(false);
    setShowSettings(false);

    // Aquí puedes inicializar scripts de analytics, etc.
    initializeScripts(allAccepted);
  };

  const acceptNecessary = () => {
    const necessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setPreferences(necessary);
    localStorage.setItem("cookie-consent", JSON.stringify(necessary));
    setShowBanner(false);
    setShowSettings(false);
  };

  const savePreferences = () => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
    initializeScripts(preferences);
  };

  const initializeScripts = (prefs: CookiePreferences) => {
    // Aquí inicializar Google Analytics, etc. según preferencias
    if (prefs.analytics) {
      console.log("Analytics habilitado");
      // window.gtag(...);
    }
    if (prefs.marketing) {
      console.log("Marketing habilitado");
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay oscuro */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Banner principal */}
      {!showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-slate-200 shadow-2xl p-4 md:p-6 animate-slide-up">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-4">
              <Cookie className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  🍪 Este sitio usa cookies
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido.
                  Al hacer clic en "Aceptar todas", aceptas el uso de todas las cookies.{" "}
                  <Link href="/privacidad" className="text-blue-600 hover:underline font-medium">
                    Más información
                  </Link>
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    ✓ Aceptar todas
                  </button>

                  <button
                    onClick={acceptNecessary}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors text-sm"
                  >
                    Solo necesarias
                  </button>

                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm flex items-center gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    Personalizar
                  </button>
                </div>
              </div>

              <button
                onClick={acceptNecessary}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de configuración */}
      {showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-slate-200 shadow-2xl p-6 md:p-8 max-h-[80vh] overflow-y-auto animate-slide-up">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" />
                Configuración de Cookies
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Cookies necesarias */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">Cookies necesarias</h4>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                    SIEMPRE ACTIVAS
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Estas cookies son esenciales para el funcionamiento básico del sitio web (autenticación, sesión, seguridad).
                </p>
              </div>

              {/* Cookies analíticas */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">Cookies analíticas</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-slate-600">
                  Nos ayudan a entender cómo los visitantes interactúan con el sitio web (Google Analytics).
                </p>
              </div>

              {/* Cookies de marketing */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">Cookies de marketing</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-slate-600">
                  Se utilizan para mostrar anuncios relevantes y medir la efectividad de campañas publicitarias.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={savePreferences}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="h-5 w-5" />
                Guardar preferencias
              </button>

              <button
                onClick={acceptAll}
                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
              >
                Aceptar todas
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Puedes cambiar tus preferencias en cualquier momento desde el pie de página.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
