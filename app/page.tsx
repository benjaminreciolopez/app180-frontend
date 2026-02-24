"use client";

import Link from "next/link";
import {
  ArrowRight, FileText, Bot, Clock, Receipt,
  Users, Calculator, Calendar, Building2, Shield,
  CheckCircle, Sparkles
} from "lucide-react";
import LandingQRSection from "@/components/landing/LandingQRSection";

const modules = [
  {
    icon: FileText,
    title: "Facturacion y VeriFactu",
    description: "Facturas electronicas con codigo QR, cumplimiento legal automatico y envio directo a la AEAT.",
    color: "blue"
  },
  {
    icon: Bot,
    title: "Asistente IA (CONTENDO)",
    description: "82 herramientas inteligentes: analiza documentos, calcula modelos fiscales y gestiona tu negocio por ti.",
    color: "indigo"
  },
  {
    icon: Clock,
    title: "Control Horario",
    description: "Fichajes con geolocalizacion, plantillas de jornada, partes de dia y validacion automatica.",
    color: "emerald"
  },
  {
    icon: Receipt,
    title: "Gestion de Gastos",
    description: "OCR de tickets, importacion bancaria (CSV/PDF) y categorizacion automatica de gastos.",
    color: "amber"
  },
  {
    icon: Users,
    title: "Nominas y Empleados",
    description: "Registro de nominas, calculo de IRPF, productividad por empleado y gestion documental.",
    color: "violet"
  },
  {
    icon: Calculator,
    title: "Fiscal Automatico",
    description: "Modelos 303, 130, 111, 115 y 349 generados automaticamente por IA a partir de tus datos.",
    color: "rose"
  },
  {
    icon: Calendar,
    title: "Calendario y Ausencias",
    description: "Vacaciones, bajas, festivos y sincronizacion con Google Calendar para todo el equipo.",
    color: "cyan"
  },
  {
    icon: Building2,
    title: "Banco y Reconciliacion",
    description: "Importa extractos bancarios y el matching automatico cruza movimientos con facturas pendientes.",
    color: "teal"
  }
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    ring: "ring-blue-200" },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-600",  ring: "ring-indigo-200" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-200" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-600",   ring: "ring-amber-200" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-600",  ring: "ring-violet-200" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-600",    ring: "ring-rose-200" },
  cyan:    { bg: "bg-cyan-100",    text: "text-cyan-600",    ring: "ring-cyan-200" },
  teal:    { bg: "bg-teal-100",    text: "text-teal-600",    ring: "ring-teal-200" },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* HEADER */}
      <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CONTENDO GESTIONES
              </span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#modulos" className="text-gray-600 hover:text-blue-600 transition-colors">Modulos</a>
              <a href="#ia" className="text-gray-600 hover:text-blue-600 transition-colors">IA</a>
              <Link href="/privacidad" className="text-gray-600 hover:text-blue-600 transition-colors">Privacidad</Link>
              <Link href="/terminos" className="text-gray-600 hover:text-blue-600 transition-colors">Terminos</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:block"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/setup"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Empieza gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Bot className="h-4 w-4" />
            Asistente IA con 82 herramientas integradas
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Gestiona tu negocio con{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              inteligencia artificial
            </span>
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-500 mb-10 leading-relaxed">
            Facturacion, nominas, control horario, gastos y fiscal. Todo en una sola plataforma
            con un asistente IA que trabaja por ti.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/setup"
              className="px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              Empieza gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 text-base font-semibold rounded-xl text-gray-700 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 shadow-sm transition-all"
            >
              Iniciar sesion
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">Sin tarjeta de credito. 10 consultas IA gratis al dia.</p>
        </div>
      </section>

      {/* MODULES GRID */}
      <section id="modulos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Todo lo que tu negocio necesita
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              8 modulos integrados que cubren cada aspecto de la gestion empresarial,
              desde la facturacion hasta la reconciliacion bancaria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((mod) => {
              const colors = colorMap[mod.color];
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="group p-6 bg-gray-50 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 border border-transparent hover:border-gray-200"
                >
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4 ${colors.text} ring-1 ${colors.ring}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{mod.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{mod.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section id="ia" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Inteligencia artificial
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                CONTENDO: tu asistente que entiende tu negocio
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Habla con CONTENDO en lenguaje natural. Pregunta por tus facturas pendientes,
                pide que cree una factura, analiza la rentabilidad de un cliente o genera un
                borrador del modelo 303. Todo sin salir del chat.
              </p>
              <ul className="space-y-3">
                {[
                  "82 herramientas de lectura y escritura",
                  "Analiza documentos PDF con OCR y QR",
                  "Calcula modelos fiscales automaticamente",
                  "Crea facturas, registra pagos y fichajes",
                  "Matching automatico banco-facturas",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">CONTENDO</p>
                  <p className="text-xs text-green-500">En linea</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-2 ml-auto max-w-[80%] w-fit">
                  Quien me debe dinero?
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-2 max-w-[85%]">
                  <p className="text-gray-700">Tienes <strong>3 facturas vencidas</strong> por un total de <strong>4.350,00 EUR</strong>:</p>
                  <ul className="mt-2 text-gray-600 space-y-1">
                    <li>- Empresa ABC: 2.100,00 EUR (vencida hace 15 dias)</li>
                    <li>- Lopez SL: 1.500,00 EUR (vencida hace 8 dias)</li>
                    <li>- Garcia & Hijos: 750,00 EUR (vencida hace 3 dias)</li>
                  </ul>
                </div>
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-2 ml-auto max-w-[80%] w-fit">
                  Crea factura para Lopez SL
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-2 max-w-[85%]">
                  <p className="text-gray-700">Factura <strong>F-2026-0047</strong> creada para Lopez SL por 1.500,00 EUR con IVA 21%.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VERIFACTU + QR FABRICANTE */}
      <LandingQRSection />

      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="font-bold text-gray-900 text-lg">CONTENDO GESTIONES</span>
              <p className="text-gray-500 text-sm mt-1">&copy; {new Date().getFullYear()} Todos los derechos reservados. Hecho en Espana.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/privacidad" className="text-gray-500 hover:text-gray-900 text-sm">
                Politica de Privacidad
              </Link>
              <Link href="/terminos" className="text-gray-500 hover:text-gray-900 text-sm">
                Terminos y Condiciones
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
