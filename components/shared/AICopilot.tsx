"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  MessageCircle,
  Trash2,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"

interface Mensaje {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const STORAGE_KEY = "contendo_chat_history"

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 🆕 Cargar historial de localStorage al montar
  useEffect(() => {
    try {
      const historialGuardado = localStorage.getItem(STORAGE_KEY)
      if (historialGuardado) {
        const mensajesGuardados = JSON.parse(historialGuardado)
        if (Array.isArray(mensajesGuardados) && mensajesGuardados.length > 0) {
          setMensajes(mensajesGuardados)
        }
      }
    } catch (error) {
      console.error("Error cargando historial:", error)
    }
  }, [])

  // 🆕 Guardar historial en localStorage cuando cambian los mensajes
  useEffect(() => {
    if (mensajes.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes))
      } catch (error) {
        console.error("Error guardando historial:", error)
      }
    }
  }, [mensajes])

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  // Mensaje de bienvenida cuando se abre por primera vez
  useEffect(() => {
    if (isOpen && mensajes.length === 0) {
      setMensajes([
        {
          role: "assistant",
          content: "👋 ¡Hola! Soy **CONTENDO**, tu asistente de gestión empresarial.\n\nPuedo ayudarte con:\n- 📊 Consultar facturas y estadísticas\n- 👥 Información de empleados y clientes\n- 💰 Trabajos pendientes de facturar\n- 📈 Análisis de facturación\n\n¿En qué puedo ayudarte hoy?",
          timestamp: new Date().toISOString()
        }
      ])
    }
  }, [isOpen, mensajes.length])

  const enviarMensaje = async () => {
    if (!inputValue.trim() || isLoading) return

    const mensajeUsuario = inputValue.trim()
    setInputValue("")

    // Agregar mensaje del usuario
    const nuevoMensajeUsuario: Mensaje = {
      role: "user",
      content: mensajeUsuario,
      timestamp: new Date().toISOString()
    }

    setMensajes(prev => [...prev, nuevoMensajeUsuario])
    setIsLoading(true)

    try {
      // Preparar historial para el backend (últimos 10 mensajes)
      const historial = mensajes.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await api.post("/admin/ai/chat", {
        mensaje: mensajeUsuario,
        historial
      })

      const mensajeAsistente: Mensaje = {
        role: "assistant",
        content: response.data.mensaje,
        timestamp: response.data.timestamp
      }

      setMensajes(prev => [...prev, mensajeAsistente])

      // Si CONTENDO ejecutó una acción de escritura, refrescar datos del dashboard
      if (response.data.accion_realizada) {
        window.dispatchEvent(new Event("data-updated"))
      }
    } catch (error: any) {
      console.error("Error al chatear con IA:", error)

      const mensajeError: Mensaje = {
        role: "assistant",
        content: `❌ **Error**: ${error.response?.data?.error || "No pude procesar tu mensaje. Intenta de nuevo."}`,
        timestamp: new Date().toISOString()
      }

      setMensajes(prev => [...prev, mensajeError])
      toast.error("Error al comunicar con el asistente")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  const mostrarAyuda = () => {
    const ayuda: Mensaje = {
      role: "assistant",
      content: `## Esto es lo que puedo hacer por ti:

### Consultas
- **Facturas**: "Facturas pendientes", "Facturas de este mes"
- **Clientes**: "Top 5 clientes", "Clientes en riesgo"
- **Deuda**: "Quien me debe?", "Morosos"
- **Pagos**: "Pagos recibidos este mes"
- **Empleados**: "Horas trabajadas", "Fichajes de hoy"
- **Ausencias**: "Vacaciones de Juan", "Resumen ausencias"
- **Calendario**: "Festivos del mes"

### Analisis
- **Resumen**: "Como va el negocio?"
- **Comparar**: "Este mes vs el anterior"
- **Tendencia**: "Tendencia de facturacion"
- **Alertas**: "Algun problema?" o "Que tengo pendiente?"
- **Cierre**: "Cierre del mes"
- **Productividad**: "Productividad del equipo"

### Acciones
- **Facturas**: "Crea factura para [cliente]", "Valida factura X"
- **Auto-facturar**: "Factura los trabajos de [cliente]"
- **Clientes**: "Crea cliente nuevo"
- **Pagos**: "Registra pago de [cliente]"
- **Trabajos**: "Registra trabajo de 2h para [cliente]"
- **Ausencias**: "Pon vacaciones a [empleado]"
- **Calendario**: "Crea evento festivo el [fecha]"

Preguntame lo que necesites.`,
      timestamp: new Date().toISOString()
    }
    setMensajes(prev => [...prev, ayuda])
  }

  const limpiarHistorial = () => {
    toast("¿Eliminar todo el historial?", {
      action: {
        label: "Sí, eliminar",
        onClick: () => {
          setMensajes([])
          localStorage.removeItem(STORAGE_KEY)
          toast.success("Historial limpiado")
        }
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {}
      }
    })
  }

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-2xl hover:shadow-blue-500/50 transition-all"
            >
              <div className="relative">
                <Bot className="h-7 w-7 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ventana de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.3 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full h-full sm:w-[420px] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">CONTENDO</h3>
                  <p className="text-xs text-blue-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    En línea
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={mostrarAyuda}
                  className="text-white hover:bg-white/20"
                  title="Que puedo hacer"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarHistorial}
                  className="text-white hover:bg-white/20"
                  title="Limpiar historial"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {mensajes.map((mensaje, index) => (
                <div
                  key={index}
                  className={`flex ${mensaje.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {mensaje.role === "assistant" && (
                    <div className="flex-shrink-0 mr-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 ${
                      mensaje.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-200 text-slate-900"
                    }`}
                  >
                    {mensaje.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{mensaje.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{mensaje.content}</p>
                    )}
                  </div>

                  {mensaje.role === "user" && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {mensajes.length <= 1 && !isLoading && (
              <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 shrink-0">
                <p className="text-xs text-slate-500 mb-2">Prueba estas consultas:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { emoji: "📊", text: "Como va el negocio?", query: "Dame un resumen ejecutivo del negocio" },
                    { emoji: "🏦", text: "Quien me debe?", query: "Quien me debe dinero? Facturas vencidas" },
                    { emoji: "📈", text: "Tendencia", query: "Tendencia de facturacion de los ultimos 6 meses" },
                    { emoji: "⚠️", text: "Algun problema?", query: "Hay algun problema o alerta en el negocio?" },
                    { emoji: "👥", text: "Top clientes", query: "Quienes son mis top 5 clientes?" },
                    { emoji: "⏱️", text: "Horas equipo", query: "Resumen de horas trabajadas del equipo este mes" },
                  ].map((action) => (
                    <button
                      key={action.text}
                      disabled={isLoading}
                      onClick={() => {
                        setInputValue(action.query)
                        setTimeout(() => enviarMensaje(), 100)
                      }}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {action.emoji} {action.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0 safe-area-bottom">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={enviarMensaje}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Powered by IA · CONTENDO
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
