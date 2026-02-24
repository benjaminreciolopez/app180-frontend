"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import {
  Shield, CheckCircle, FileText, ArrowRight, Bot, Clock,
  Receipt, Users, Calculator, Calendar, Building2, QrCode,
  Lock, Sparkles, Eye, Zap
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

function FacturaDemoContent() {
  const params = useSearchParams()
  const sessionToken = params.get("s")
  const [vipActive, setVipActive] = useState(false)

  // Check if VIP activated
  useEffect(() => {
    if (!sessionToken) return
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/qr-session/${sessionToken}/status`)
        const json = await res.json()
        if (json.status === "activated") setVipActive(true)
      } catch (e) { /* silent */ }
    }
    check()
    const interval = setInterval(check, 3000)
    return () => clearInterval(interval)
  }, [sessionToken])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              CONTENDO
            </span>
          </div>
          <Link
            href="/setup"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Crear cuenta <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* VIP Banner */}
      {vipActive && sessionToken && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 px-4 text-center">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Acceso VIP activado por el creador de Contendo</span>
            </div>
            <Link
              href={`/setup?vip_token=${sessionToken}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 font-bold rounded-lg text-sm hover:bg-amber-50 transition-all"
            >
              Registrarme VIP <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Factura Verificada */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
            <Shield className="w-4 h-4" />
            Factura verificada con VeriFactu
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Factura Electronica Verificable
          </h1>
          <p className="text-gray-500 mt-2">
            Esta factura de ejemplo demuestra el sistema VeriFactu de CONTENDO GESTIONES
          </p>
        </div>

        {/* Factura Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          {/* VeriFactu Badge */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-semibold text-sm">VeriFactu Verificado</span>
            </div>
            <span className="text-xs text-green-100">Registro AEAT: VF-2026-00001</span>
          </div>

          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">F-2026-0001</h2>
                <p className="text-gray-500 text-sm mt-1">Fecha: 24 de febrero de 2026</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Validada
                </span>
              </div>
            </div>

            {/* Emisor / Receptor */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Emisor</p>
                <p className="font-bold text-gray-900">CONTENDO GESTIONES S.L.</p>
                <p className="text-sm text-gray-600">NIF: B12345678</p>
                <p className="text-sm text-gray-500">C/ Innovacion 42, Madrid 28001</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
                <p className="font-bold text-gray-900">DEMO EMPRESA S.L.</p>
                <p className="text-sm text-gray-600">NIF: A87654321</p>
                <p className="text-sm text-gray-500">Av. Ejemplo 10, Barcelona 08001</p>
              </div>
            </div>

            {/* Lineas */}
            <div className="border rounded-xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Concepto</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Ud.</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Precio</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Licencia Contendo Gestiones Pro</td>
                    <td className="px-4 py-3 text-center text-gray-600">1</td>
                    <td className="px-4 py-3 text-right text-gray-600">49,00 EUR</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">49,00 EUR</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-800">Soporte Premium - 1 mes</td>
                    <td className="px-4 py-3 text-center text-gray-600">1</td>
                    <td className="px-4 py-3 text-right text-gray-600">15,00 EUR</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">15,00 EUR</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Base imponible</span>
                  <span>64,00 EUR</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>IVA (21%)</span>
                  <span>13,44 EUR</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>77,44 EUR</span>
                </div>
              </div>
            </div>

            {/* VeriFactu Hash */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-600">Cadena de verificacion VeriFactu</p>
                  <p className="font-mono text-slate-400 break-all">
                    SHA-256: a3f8c1d7e2b9456f8a1c3d5e7f9b2d4a6c8e0f1a3b5c7d9e1f3a5b7c9d1e3f5
                  </p>
                  <p className="font-mono text-slate-400 break-all">
                    Hash anterior: 0000000000000000000000000000000000000000000000000000000000000000
                  </p>
                  <p className="text-slate-500 mt-1">
                    Esta factura forma parte de una cadena criptografica inalterable registrada
                    conforme al Reglamento VeriFactu (RD 1007/2023).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Esto es solo una factura. Imagina el resto.
          </h2>
          <p className="text-gray-500 text-sm">
            CONTENDO GESTIONES es una plataforma completa de gestion empresarial con IA
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: "Facturacion", desc: "VeriFactu + QR" },
            { icon: Bot, label: "IA (82 tools)", desc: "Asistente inteligente" },
            { icon: Clock, label: "Control Horario", desc: "Fichajes + GPS" },
            { icon: Receipt, label: "Gastos", desc: "OCR automatico" },
            { icon: Users, label: "Nominas", desc: "IRPF + SS" },
            { icon: Calculator, label: "Fiscal", desc: "303/130/111/115" },
            { icon: Calendar, label: "Calendario", desc: "Google Calendar" },
            { icon: Building2, label: "Banco", desc: "Matching facturas" },
          ].map((f) => (
            <div key={f.label} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-center hover:shadow-md transition-all">
              <f.icon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-semibold text-gray-800">{f.label}</p>
              <p className="text-xs text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pb-12">
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            <Zap className="w-5 h-5" />
            Empieza gratis ahora
          </Link>
          <p className="text-sm text-gray-400 mt-3">Sin tarjeta de credito. 10 consultas IA al dia.</p>
        </div>
      </div>
    </div>
  )
}

export default function FacturaDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>}>
      <FacturaDemoContent />
    </Suspense>
  )
}
