"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showError, showSuccess } from "@/lib/toast"
import {
  FileText, Download, Loader2, Calendar,
  Mail, CheckCircle, PenTool, Clock, Check, ShieldCheck
} from "lucide-react"
import FirmaDigitalModal from "@/components/empleado/FirmaDigitalModal"

type Nomina = {
  id: string
  anio: number
  mes: number
  bruto: number
  seguridad_social_empleado: number
  irpf_retencion: number
  liquido: number
  pdf_path: string | null
  created_at: string
  estado_entrega?: string
  fecha_envio?: string | null
  fecha_recepcion?: string | null
  fecha_firma?: string | null
  hash_firma?: string | null
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

function EstadoIcon({ estado }: { estado: string }) {
  switch (estado) {
    case "enviada": return <Mail className="w-4 h-4 text-blue-500" />
    case "recibida": return <CheckCircle className="w-4 h-4 text-yellow-500" />
    case "firmada": return <PenTool className="w-4 h-4 text-green-500" />
    default: return <Clock className="w-4 h-4 text-gray-400" />
  }
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-600",
    enviada: "bg-blue-100 text-blue-700",
    recibida: "bg-yellow-100 text-yellow-700",
    firmada: "bg-green-100 text-green-700",
  }
  const labels: Record<string, string> = {
    borrador: "Pendiente",
    enviada: "Enviada",
    recibida: "Recibida",
    firmada: "Firmada",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[estado] || "bg-gray-100 text-gray-500"}`}>
      {labels[estado] || estado}
    </span>
  )
}

export default function EmpleadoNominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [firmaModal, setFirmaModal] = useState<Nomina | null>(null)

  useEffect(() => {
    loadNominas()
  }, [year])

  async function loadNominas() {
    setLoading(true)
    try {
      const res = await api.get("/empleado/nominas", { params: { year } })
      if (res.data?.success) setNominas(res.data.data || [])
    } catch {
      showError("Error cargando nominas")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmarRecepcion(id: string) {
    setConfirmingId(id)
    try {
      const res = await api.post(`/empleado/nominas/${id}/confirmar-recepcion`)
      if (res.data?.success) {
        showSuccess("Recepcion confirmada")
        loadNominas()
      }
    } catch {
      showError("Error al confirmar recepcion")
    } finally {
      setConfirmingId(null)
    }
  }

  const totalAnual = nominas.reduce((sum, n) => sum + Number(n.liquido), 0)

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Nominas</h1>
        <p className="text-gray-500 text-sm">Consulta, confirma y firma tus nominas</p>
      </div>

      {/* Filtro anio */}
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-400" />
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {nominas.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            Total neto anual: <span className="font-bold text-green-700">{totalAnual.toFixed(2)} EUR</span>
          </span>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : nominas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No tienes nominas en {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {nominas.map((n) => {
            const estado = n.estado_entrega || "borrador"
            return (
              <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <EstadoIcon estado={estado} />
                        <h3 className="font-medium text-gray-900 text-sm">
                          {MESES[(n.mes || 1) - 1]} {n.anio}
                        </h3>
                        <EstadoBadge estado={estado} />
                      </div>

                      {/* Desglose */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bruto</span>
                          <span className="font-medium text-gray-700">{Number(n.bruto).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">SS Empleado</span>
                          <span className="text-orange-600">-{Number(n.seguridad_social_empleado).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">IRPF</span>
                          <span className="text-red-600">-{Number(n.irpf_retencion).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Neto</span>
                          <span className="font-bold text-green-700">{Number(n.liquido).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Fechas de entrega */}
                      {(n.fecha_envio || n.fecha_recepcion || n.fecha_firma) && (
                        <div className="mt-2 space-y-0.5">
                          {n.fecha_envio && (
                            <p className="text-[10px] text-gray-400">
                              Enviada: {new Date(n.fecha_envio).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {n.fecha_recepcion && (
                            <p className="text-[10px] text-gray-400">
                              Recibida: {new Date(n.fecha_recepcion).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {n.fecha_firma && (
                            <p className="text-[10px] text-gray-400">
                              Firmada: {new Date(n.fecha_firma).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Hash de firma */}
                      {n.hash_firma && (
                        <p className="text-[9px] text-gray-300 mt-1 font-mono truncate">Hash: {n.hash_firma}</p>
                      )}
                    </div>

                    {/* Acciones a la derecha */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {/* Descargar PDF */}
                      {n.pdf_path ? (
                        <a
                          href={n.pdf_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          <span className="text-[10px] font-medium">PDF</span>
                        </a>
                      ) : (
                        <div className="flex flex-col items-center gap-1 px-3 py-2 bg-gray-50 text-gray-400 rounded-xl">
                          <FileText className="w-5 h-5" />
                          <span className="text-[10px]">Sin PDF</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de accion */}
                  {(estado === "enviada" || estado === "recibida") && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      {estado === "enviada" && (
                        <button
                          onClick={() => handleConfirmarRecepcion(n.id)}
                          disabled={confirmingId === n.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
                        >
                          {confirmingId === n.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Confirmar recepcion
                        </button>
                      )}
                      <button
                        onClick={() => setFirmaModal(n)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Firmar nomina
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de firma digital */}
      {firmaModal && (
        <FirmaDigitalModal
          nominaId={firmaModal.id}
          mes={MESES[(firmaModal.mes || 1) - 1]}
          anio={firmaModal.anio}
          onClose={() => setFirmaModal(null)}
          onFirmada={() => {
            setFirmaModal(null)
            showSuccess("Nomina firmada correctamente")
            loadNominas()
          }}
        />
      )}
    </div>
  )
}
