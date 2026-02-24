"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { authenticatedFetch } from "@/utils/api"
import { toast } from "sonner"
import {
  QrCode, CheckCircle, XCircle, Loader2, ScanLine,
  Camera, CameraOff, Clock, User, Shield,
  MessageCircle, Send, Lightbulb, Bug, Wrench, HelpCircle
} from "lucide-react"

export default function FabricantePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<any>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activations, setActivations] = useState<any[]>([])
  const [sugerencias, setSugerencias] = useState<any[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respuestaText, setRespuestaText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [loading, setLoading] = useState(true)
  const scannerRef = useRef<HTMLDivElement>(null)

  // Check auth via es_fabricante del backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authenticatedFetch("/auth/me")
        if (res.ok) {
          const json = await res.json()
          const email = json.user?.email || json.email
          const esFabricante = json.user?.es_fabricante || json.es_fabricante
          setUserEmail(email)
          if (esFabricante) {
            setAuthorized(true)
            loadActivations()
            loadSugerencias()
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const loadActivations = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fabricante/activations")
      if (res.ok) {
        const json = await res.json()
        if (json.success) setActivations(json.data || [])
      }
    } catch (e) { /* silent */ }
  }

  const loadSugerencias = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fabricante/sugerencias")
      if (res.ok) {
        const json = await res.json()
        if (json.success) setSugerencias(json.data || [])
      }
    } catch (e) { /* silent */ }
  }

  const handleResponder = async (id: string) => {
    if (!respuestaText.trim()) return
    setSendingReply(true)
    try {
      const res = await authenticatedFetch(`/api/admin/fabricante/sugerencias/${id}/responder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: respuestaText }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Respuesta enviada")
        setRespondingId(null)
        setRespuestaText("")
        loadSugerencias()
      } else {
        toast.error(json.error || "Error")
      }
    } catch {
      toast.error("Error de conexion")
    } finally {
      setSendingReply(false)
    }
  }

  const startScanner = useCallback(async () => {
    if (scanning) return
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const html5QrCode = new Html5Qrcode("qr-reader")
      setScanner(html5QrCode)
      setScanning(true)
      setLastResult(null)

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText: string) => {
          // Extract session token from URL
          const match = decodedText.match(/\/qr\/([a-f0-9]{64})/)
          if (!match) {
            setLastResult({ success: false, message: "QR no reconocido como sesion Contendo" })
            return
          }

          const sessionToken = match[1]

          // Stop scanner before API call
          try { await html5QrCode.stop() } catch (e) { /* ok */ }
          setScanning(false)

          // Activate VIP
          try {
            const res = await authenticatedFetch("/api/admin/fabricante/activate-qr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_token: sessionToken }),
            })
            const json = await res.json()

            if (json.success) {
              setLastResult({ success: true, message: "VIP activado correctamente" })
              toast.success("VIP activado")
              // Vibrate on success
              if (navigator.vibrate) navigator.vibrate([100, 50, 100])
              loadActivations()
            } else {
              setLastResult({ success: false, message: json.error || "Error al activar" })
              toast.error(json.error || "Error")
            }
          } catch (e) {
            setLastResult({ success: false, message: "Error de conexion" })
            toast.error("Error de conexion")
          }
        },
        () => { /* ignore errors during scanning */ }
      )
    } catch (e: any) {
      console.error("Error starting scanner:", e)
      setScanning(false)
      toast.error("No se pudo acceder a la camara")
    }
  }, [scanning])

  const stopScanner = useCallback(async () => {
    if (scanner) {
      try { await scanner.stop() } catch (e) { /* ok */ }
      setScanner(null)
    }
    setScanning(false)
  }, [scanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanner) {
        try { scanner.stop() } catch (e) { /* ok */ }
      }
    }
  }, [scanner])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
        <p className="text-gray-500 text-sm">
          Este modulo es exclusivo para el fabricante de Contendo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fabricante</h1>
        <p className="text-muted-foreground text-sm">
          Escanea el QR del landing para activar acceso VIP
        </p>
      </div>

      {/* Scanner Area */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <QrCode className="w-5 h-5" />
              <span className="font-semibold">Escaner QR VIP</span>
            </div>
            {scanning ? (
              <button
                onClick={stopScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <CameraOff className="w-4 h-4" />
                Parar
              </button>
            ) : (
              <button
                onClick={startScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 text-sm rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Escanear
              </button>
            )}
          </div>

          {/* Camera viewfinder */}
          <div className="relative aspect-square max-h-80 mx-auto bg-black rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full h-full" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80">
                <ScanLine className="w-16 h-16 text-slate-500 mb-3" />
                <p className="text-slate-400 text-sm">Pulsa "Escanear" para activar la camara</p>
              </div>
            )}
          </div>

          {/* Result feedback */}
          {lastResult && (
            <div className={`mt-3 p-3 rounded-xl flex items-center gap-3 ${
              lastResult.success
                ? "bg-green-500/20 text-green-300"
                : "bg-red-500/20 text-red-300"
            }`}>
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm">{lastResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activations */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Activaciones Recientes
        </h2>

        {activations.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin activaciones todavia</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activations.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    a.status === "registered"
                      ? "bg-green-100 text-green-600"
                      : a.status === "activated"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {a.status === "registered" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {a.registered_nombre || a.registered_email || "Pendiente de registro"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.activated_at ? new Date(a.activated_at).toLocaleString("es-ES") : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  a.status === "registered"
                    ? "bg-green-100 text-green-700"
                    : a.status === "activated"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {a.status === "registered" ? "Registrado" : a.status === "activated" ? "Activado" : a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sugerencias de usuarios */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          Sugerencias
          {sugerencias.filter(s => s.estado === "nueva").length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {sugerencias.filter(s => s.estado === "nueva").length}
            </span>
          )}
        </h2>

        {sugerencias.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin sugerencias todavia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sugerencias.map((s: any) => {
              const catIcons: Record<string, any> = {
                mejora: Lightbulb, bug: Bug, modulo: Wrench, general: HelpCircle, otra: MessageCircle
              }
              const CatIcon = catIcons[s.categoria] || HelpCircle
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CatIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          <h3 className="font-medium text-gray-900 text-sm">{s.titulo}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{s.descripcion}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="font-medium text-gray-600">{s.user_nombre}</span>
                          <span>({s.empresa_nombre})</span>
                          <span>{new Date(s.created_at).toLocaleDateString("es-ES")}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        s.estado === "nueva" ? "bg-blue-100 text-blue-700"
                        : s.estado === "respondida" ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {s.estado === "nueva" ? "Nueva" : s.estado === "respondida" ? "Respondida" : s.estado}
                      </span>
                    </div>

                    {/* Respuesta existente */}
                    {s.respuesta && (
                      <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="text-xs font-semibold text-green-700 mb-1">Tu respuesta:</p>
                        <p className="text-sm text-green-800">{s.respuesta}</p>
                      </div>
                    )}

                    {/* Boton/form responder */}
                    {s.estado !== "respondida" && respondingId !== s.id && (
                      <button
                        onClick={() => { setRespondingId(s.id); setRespuestaText("") }}
                        className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Send className="w-3 h-3" />
                        Responder
                      </button>
                    )}

                    {respondingId === s.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={respuestaText}
                          onChange={(e) => setRespuestaText(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={3}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRespondingId(null)}
                            className="flex-1 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleResponder(s.id)}
                            disabled={sendingReply || !respuestaText.trim()}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
