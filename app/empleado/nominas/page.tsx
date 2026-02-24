"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showError } from "@/lib/toast"
import { FileText, Download, Loader2, Calendar } from "lucide-react"

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
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export default function EmpleadoNominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

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

  const totalAnual = nominas.reduce((sum, n) => sum + Number(n.liquido), 0)

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis Nominas</h1>
        <p className="text-gray-500 text-sm">Consulta y descarga tus nominas</p>
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
          {nominas.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <h3 className="font-medium text-gray-900 text-sm">
                        {MESES[(n.mes || 1) - 1]} {n.anio}
                      </h3>
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
                  </div>

                  {/* Descargar */}
                  {n.pdf_path ? (
                    <a
                      href={n.pdf_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors shrink-0"
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-[10px] font-medium">PDF</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-3 py-2 bg-gray-50 text-gray-400 rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                      <span className="text-[10px]">Sin PDF</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
