"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, X, ExternalLink } from "lucide-react"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  accion_url: string | null
  accion_label: string | null
  created_at: string
  metadata: any
}

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotificaciones = async () => {
    try {
      const res = await api.get("/admin/notificaciones?limit=10")
      setNotificaciones(res.data.notificaciones || [])
      setNoLeidas(res.data.no_leidas || 0)
    } catch (err) {
      console.error("Error cargando notificaciones:", err)
    }
  }

  useEffect(() => {
    fetchNotificaciones()
    // Polling cada 30 segundos
    const interval = setInterval(fetchNotificaciones, 30000)
    return () => clearInterval(interval)
  }, [])

  const marcarLeida = async (id: string) => {
    try {
      await api.put(`/admin/notificaciones/${id}/marcar-leida`)
      fetchNotificaciones()
    } catch (err) {
      console.error("Error marcando notificación:", err)
    }
  }

  const marcarTodasLeidas = async () => {
    setLoading(true)
    try {
      await api.put("/admin/notificaciones/marcar-todas-leidas")
      await fetchNotificaciones()
    } catch (err) {
      console.error("Error marcando todas leídas:", err)
    } finally {
      setLoading(false)
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "error": return "text-red-600 bg-red-50 border-red-200"
      case "warning": return "text-amber-600 bg-amber-50 border-amber-200"
      case "verifactu_deadline": return "text-orange-600 bg-orange-50 border-orange-200"
      case "limite_ia": return "text-blue-600 bg-blue-50 border-blue-200"
      case "config_change": return "text-purple-600 bg-purple-50 border-purple-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <h3 className="font-semibold text-sm">Notificaciones</h3>
                  {noLeidas > 0 && (
                    <span className="text-xs text-slate-500">({noLeidas} sin leer)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {noLeidas > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={marcarTodasLeidas}
                      disabled={loading}
                      className="h-7 text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="flex-1 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notificaciones.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-slate-50 transition-colors ${
                          !notif.leida ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            notif.leida ? "bg-slate-300" : "bg-blue-500"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-1 ${getTipoColor(notif.tipo)}`}>
                              {notif.tipo.replace(/_/g, " ")}
                            </div>
                            <p className="font-medium text-sm text-slate-900 mb-1">
                              {notif.titulo}
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {notif.mensaje}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-slate-400">
                                {new Date(notif.created_at).toLocaleString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              {!notif.leida && (
                                <button
                                  onClick={() => marcarLeida(notif.id)}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                                >
                                  <Check className="h-3 w-3" />
                                  Marcar leída
                                </button>
                              )}
                              {notif.accion_url && notif.accion_label && (
                                <Link
                                  href={notif.accion_url}
                                  onClick={() => {
                                    marcarLeida(notif.id)
                                    setIsOpen(false)
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 ml-auto"
                                >
                                  {notif.accion_label}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
