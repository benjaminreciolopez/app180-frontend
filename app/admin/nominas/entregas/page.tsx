"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showError } from "@/lib/toast"
import {
  ClipboardList, Loader2, ArrowLeft, Mail, CheckCircle, PenTool, Clock
} from "lucide-react"
import Link from "next/link"

type Entrega = {
  id: string
  nomina_id: string
  empleado_id: string
  estado: string
  fecha_envio: string | null
  fecha_recepcion: string | null
  fecha_firma: string | null
  hash_firma: string | null
  nombre?: string
  apellidos?: string
  anio?: number
  mes?: number
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
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
    enviada: "bg-blue-100 text-blue-700",
    recibida: "bg-yellow-100 text-yellow-700",
    firmada: "bg-green-100 text-green-700",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[estado] || "bg-gray-100 text-gray-500"}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

export default function EntregasPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState("")

  useEffect(() => {
    loadEntregas()
  }, [year, month])

  async function loadEntregas() {
    setLoading(true)
    try {
      const params: any = { anio: year }
      if (month) params.mes = month
      const res = await api.get("/api/admin/nominas/entregas", { params })
      if (res.data?.success) setEntregas(res.data.data || [])
    } catch {
      showError("Error cargando entregas")
    } finally {
      setLoading(false)
    }
  }

  const filtered = filtroEstado
    ? entregas.filter(e => e.estado === filtroEstado)
    : entregas

  const stats = {
    total: entregas.length,
    enviadas: entregas.filter(e => e.estado === "enviada").length,
    recibidas: entregas.filter(e => e.estado === "recibida").length,
    firmadas: entregas.filter(e => e.estado === "firmada").length,
  }

  function formatFecha(f: string | null) {
    if (!f) return "-"
    return new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-6 p-4 md:p-0 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/nominas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas de Nominas</h1>
          <p className="text-muted-foreground text-sm">Seguimiento de envio, recepcion y firma</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        <button onClick={() => setFiltroEstado("")} className={`p-3 rounded-xl border text-center transition-colors ${!filtroEstado ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-gray-500 font-medium">TOTAL</p>
        </button>
        <button onClick={() => setFiltroEstado("enviada")} className={`p-3 rounded-xl border text-center transition-colors ${filtroEstado === "enviada" ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
          <p className="text-2xl font-bold text-blue-600">{stats.enviadas}</p>
          <p className="text-[10px] text-blue-500 font-medium">ENVIADAS</p>
        </button>
        <button onClick={() => setFiltroEstado("recibida")} className={`p-3 rounded-xl border text-center transition-colors ${filtroEstado === "recibida" ? "border-yellow-300 bg-yellow-50" : "border-gray-200 hover:bg-gray-50"}`}>
          <p className="text-2xl font-bold text-yellow-600">{stats.recibidas}</p>
          <p className="text-[10px] text-yellow-500 font-medium">RECIBIDAS</p>
        </button>
        <button onClick={() => setFiltroEstado("firmada")} className={`p-3 rounded-xl border text-center transition-colors ${filtroEstado === "firmada" ? "border-green-300 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
          <p className="text-2xl font-bold text-green-600">{stats.firmadas}</p>
          <p className="text-[10px] text-green-500 font-medium">FIRMADAS</p>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month || ""} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm">
          <option value="">Todos</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No hay entregas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <EstadoIcon estado={e.estado} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{e.nombre} {e.apellidos}</p>
                    <EstadoBadge estado={e.estado} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {e.mes && e.anio ? `${MESES[(e.mes || 1) - 1]} ${e.anio}` : ""}
                  </p>
                </div>
                <div className="text-right text-[10px] text-gray-400 space-y-0.5 shrink-0">
                  {e.fecha_envio && <p>Enviada: {formatFecha(e.fecha_envio)}</p>}
                  {e.fecha_recepcion && <p>Recibida: {formatFecha(e.fecha_recepcion)}</p>}
                  {e.fecha_firma && <p>Firmada: {formatFecha(e.fecha_firma)}</p>}
                </div>
              </div>
              {e.hash_firma && (
                <p className="text-[9px] text-gray-300 mt-2 font-mono truncate">Hash: {e.hash_firma}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
