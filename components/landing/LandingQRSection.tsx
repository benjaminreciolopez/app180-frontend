"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Shield, FileText, QrCode, Loader2, CheckCircle, ArrowRight, Eye } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export default function LandingQRSection() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "pending" | "activated" | "registered" | "expired">("loading")
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const createSession = useCallback(async () => {
    try {
      setStatus("loading")
      const res = await fetch(`${API_URL}/api/public/qr-session`, { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setQrDataUrl(json.qr_data_url)
        setSessionToken(json.session_token)
        setExpiresAt(json.expires_at)
        setStatus("pending")
      }
    } catch (e) {
      console.error("Error creating QR session:", e)
    }
  }, [])

  useEffect(() => {
    createSession()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [createSession])

  // Polling
  useEffect(() => {
    if (!sessionToken || status !== "pending") return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/qr-session/${sessionToken}/status`)
        const json = await res.json()
        if (json.status === "activated") {
          setStatus("activated")
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (json.status === "expired") {
          setStatus("expired")
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch (e) { /* silent */ }
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [sessionToken, status])

  // Auto-renew on expire
  useEffect(() => {
    if (status === "expired") {
      const t = setTimeout(() => createSession(), 2000)
      return () => clearTimeout(t)
    }
  }, [status, createSession])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: VeriFactu info */}
            <div>
              <Shield className="h-12 w-12 text-blue-200 mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Cumplimiento legal automatico</h2>
              <p className="text-blue-100 mb-6 leading-relaxed">
                VeriFactu integrado, cadena de hashes SHA-256, auditoria completa y
                exportacion XML para la AEAT. Tu negocio siempre al dia con la normativa.
              </p>
              <ul className="space-y-2 text-blue-100 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Codigo QR verificable en cada factura
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Hash encadenado SHA-256 inalterable
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Exportacion AEAT en formato oficial
                </li>
              </ul>
              <a
                href="/setup"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              >
                Empieza gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            {/* Right: Factura ficticia con QR */}
            <div className="flex justify-center">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-gray-900 relative overflow-hidden">
                {/* Header factura */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Factura</p>
                    <p className="font-bold text-lg text-gray-900">F-2026-0001</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">24/02/2026</p>
                    <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full mt-1">
                      <CheckCircle className="w-3 h-3" />
                      VeriFactu
                    </div>
                  </div>
                </div>

                {/* Emisor / Receptor */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <p className="text-gray-400">Emisor</p>
                    <p className="font-semibold text-gray-800">CONTENDO GESTIONES</p>
                    <p className="text-gray-500">B12345678</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cliente</p>
                    <p className="font-semibold text-gray-800">DEMO EMPRESA SL</p>
                    <p className="text-gray-500">A87654321</p>
                  </div>
                </div>

                {/* Lineas */}
                <div className="border-t border-b border-gray-100 py-3 mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Concepto</span>
                    <span>Importe</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Licencia Contendo Pro</span>
                    <span className="font-semibold">49,00 EUR</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-700">Soporte Premium 1 mes</span>
                    <span className="font-semibold">15,00 EUR</span>
                  </div>
                </div>

                {/* Totales */}
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between text-gray-500">
                    <span>Base imponible</span>
                    <span>64,00 EUR</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IVA 21%</span>
                    <span>13,44 EUR</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>77,44 EUR</span>
                  </div>
                </div>

                {/* QR VeriFactu */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {status === "loading" ? (
                    <div className="w-20 h-20 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                    </div>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR VeriFactu"
                      className="w-20 h-20 rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-600" />
                      QR VeriFactu
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      Escanea con tu camara para verificar esta factura
                    </p>
                    {status === "activated" && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-full animate-pulse">
                        VIP Activado
                      </div>
                    )}
                  </div>
                </div>

                {/* Hash chain */}
                <div className="mt-3 text-[9px] text-gray-300 font-mono truncate">
                  SHA-256: a3f8c1d7e2b94...cadena verificable
                </div>

                {/* VIP activation overlay */}
                {status === "activated" && sessionToken && (
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-600/95 to-indigo-600/95 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Acceso VIP Activado</h3>
                    <p className="text-blue-100 text-sm mb-6">
                      El creador de Contendo te ha concedido acceso VIP con todos los modulos incluidos
                    </p>
                    <a
                      href={`/setup?vip_token=${sessionToken}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
                    >
                      Registrarme como VIP
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
