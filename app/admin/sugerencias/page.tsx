"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showSuccess, showError } from "@/lib/toast"
import {
  MessageSquarePlus, Send, Loader2, CheckCircle,
  Clock, MessageCircle, Lightbulb, Bug, Wrench, HelpCircle
} from "lucide-react"

type Sugerencia = {
  id: string
  titulo: string
  descripcion: string
  categoria: string
  estado: string
  respuesta: string | null
  respondida_at: string | null
  created_at: string
}

const CATEGORIAS = [
  { value: "general", label: "General", icon: HelpCircle },
  { value: "mejora", label: "Mejora", icon: Lightbulb },
  { value: "modulo", label: "Modulo", icon: Wrench },
  { value: "bug", label: "Bug / Error", icon: Bug },
  { value: "otra", label: "Otra", icon: MessageCircle },
]

function getEstadoBadge(estado: string) {
  switch (estado) {
    case "nueva":
      return { label: "Enviada", color: "bg-blue-100 text-blue-700", icon: Clock }
    case "leida":
      return { label: "Leida", color: "bg-amber-100 text-amber-700", icon: Clock }
    case "respondida":
      return { label: "Respondida", color: "bg-green-100 text-green-700", icon: CheckCircle }
    case "cerrada":
      return { label: "Cerrada", color: "bg-gray-100 text-gray-500", icon: CheckCircle }
    default:
      return { label: estado, color: "bg-gray-100 text-gray-500", icon: Clock }
  }
}

export default function SugerenciasPage() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoria, setCategoria] = useState("general")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadSugerencias()
  }, [])

  async function loadSugerencias() {
    try {
      const res = await api.get("/admin/sugerencias")
      if (res.data?.success) setSugerencias(res.data.data || [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !descripcion.trim()) {
      showError("Titulo y descripcion son obligatorios")
      return
    }

    setSending(true)
    try {
      const res = await api.post("/admin/sugerencias", { titulo, descripcion, categoria })
      if (res.data?.success) {
        showSuccess("Sugerencia enviada al creador de Contendo")
        setTitulo("")
        setDescripcion("")
        setCategoria("general")
        setShowForm(false)
        loadSugerencias()
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error enviando sugerencia")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-0 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sugerencias</h1>
          <p className="text-muted-foreground text-sm">
            Envia tus ideas y sugerencias al creador de Contendo
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumen de tu sugerencia"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoria(cat.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      categoria === cat.value
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                        : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe tu idea con todo el detalle que quieras..."
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Enviando..." : "Enviar sugerencia"}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : sugerencias.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No has enviado sugerencias todavia</p>
          <p className="text-gray-400 text-xs mt-1">Pulsa "Nueva" para enviar tu primera idea</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sugerencias.map((s) => {
            const badge = getEstadoBadge(s.estado)
            const BadgeIcon = badge.icon
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm">{s.titulo}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.descripcion}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(s.created_at).toLocaleDateString("es-ES")}
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {CATEGORIAS.find(c => c.value === s.categoria)?.label || s.categoria}
                        </span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Respuesta del fabricante */}
                {s.respuesta && (
                  <div className="bg-green-50 border-t border-green-100 px-4 py-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Respuesta del creador:</p>
                    <p className="text-sm text-green-800">{s.respuesta}</p>
                    {s.respondida_at && (
                      <p className="text-[10px] text-green-500 mt-1">
                        {new Date(s.respondida_at).toLocaleDateString("es-ES")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
