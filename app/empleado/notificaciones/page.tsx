"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showError } from "@/lib/toast"
import {
  Bell, Check, CheckCheck, Loader2, ArrowLeft, ExternalLink
} from "lucide-react"
import Link from "next/link"

type Notificacion = {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  accion_url: string | null
  accion_label: string | null
  created_at: string
}

function getTipoColor(tipo: string) {
  switch (tipo) {
    case "error": return "text-red-600 bg-red-50"
    case "warning": return "text-amber-600 bg-amber-50"
    case "nomina": return "text-green-600 bg-green-50"
    case "ausencia": return "text-indigo-600 bg-indigo-50"
    default: return "text-gray-600 bg-gray-50"
  }
}

export default function EmpleadoNotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [noLeidas, setNoLeidas] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    loadNotificaciones()
  }, [])

  async function loadNotificaciones() {
    setLoading(true)
    try {
      const res = await api.get("/empleado/notificaciones?limit=50")
      setNotificaciones(res.data.notificaciones || [])
      setNoLeidas(res.data.no_leidas || 0)
    } catch {
      showError("Error cargando notificaciones")
    } finally {
      setLoading(false)
    }
  }

  async function marcarLeida(id: string) {
    try {
      await api.put(`/empleado/notificaciones/${id}/marcar-leida`)
      loadNotificaciones()
    } catch {
      showError("Error marcando notificacion")
    }
  }

  async function marcarTodasLeidas() {
    setMarkingAll(true)
    try {
      await api.put("/empleado/notificaciones/marcar-todas-leidas")
      await loadNotificaciones()
    } catch {
      showError("Error marcando todas leidas")
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/empleado/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-gray-500 text-sm">
            {noLeidas > 0 ? `${noLeidas} sin leer` : "Todas leidas"}
          </p>
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Marcar todas
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : notificaciones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border shadow-sm p-4 transition-colors ${
                !n.leida ? "border-blue-200 bg-blue-50/20" : "border-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  n.leida ? "bg-gray-300" : "bg-blue-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${getTipoColor(n.tipo)}`}>
                      {n.tipo.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(n.created_at).toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-gray-900">{n.titulo}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.mensaje}</p>

                  <div className="flex items-center gap-3 mt-2">
                    {!n.leida && (
                      <button
                        onClick={() => marcarLeida(n.id)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Marcar leida
                      </button>
                    )}
                    {n.accion_url && n.accion_label && (
                      <Link
                        href={n.accion_url}
                        onClick={() => marcarLeida(n.id)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 ml-auto"
                      >
                        {n.accion_label}
                        <ExternalLink className="w-3 h-3" />
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
  )
}
