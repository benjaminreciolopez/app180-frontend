"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showSuccess, showError } from "@/lib/toast"
import {
  FileText, Upload, Trash2, Loader2, Download, Search, Plus, X, Send,
  CheckSquare, Square, Mail, ClipboardList
} from "lucide-react"
import Link from "next/link"

type Nomina = {
  id: string
  empleado_id: string | null
  anio: number
  mes: number
  bruto: number
  seguridad_social_empresa: number
  seguridad_social_empleado: number
  irpf_retencion: number
  liquido: number
  pdf_path: string | null
  estado_entrega: string | null
  created_at: string
  nombre?: string
  apellidos?: string
}

type Empleado = {
  id: string
  nombre: string
  email: string
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado || estado === "borrador") return (
    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">Borrador</span>
  )
  const map: Record<string, string> = {
    enviada: "bg-blue-100 text-blue-700",
    recibida: "bg-yellow-100 text-yellow-700",
    firmada: "bg-green-100 text-green-700",
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[estado] || "bg-gray-100 text-gray-500"}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

export default function AdminNominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sendingLote, setSendingLote] = useState(false)

  // Form state
  const [formEmpleado, setFormEmpleado] = useState("")
  const [formMes, setFormMes] = useState(new Date().getMonth() + 1)
  const [formAnio, setFormAnio] = useState(new Date().getFullYear())
  const [formBruto, setFormBruto] = useState("")
  const [formSSEmpresa, setFormSSEmpresa] = useState("")
  const [formSSEmpleado, setFormSSEmpleado] = useState("")
  const [formIRPF, setFormIRPF] = useState("")
  const [formLiquido, setFormLiquido] = useState("")
  const [formFile, setFormFile] = useState<File | null>(null)

  useEffect(() => {
    loadNominas()
    loadEmpleados()
  }, [year, month])

  async function loadNominas() {
    setLoading(true)
    try {
      const params: any = { year }
      if (month) params.month = month
      const res = await api.get("/api/admin/nominas", { params })
      if (res.data?.success) setNominas(res.data.data || [])
    } catch {
      showError("Error cargando nominas")
    } finally {
      setLoading(false)
      setSelected(new Set())
    }
  }

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees")
      if (Array.isArray(res.data)) setEmpleados(res.data)
      else if (res.data?.data) setEmpleados(res.data.data)
    } catch { /* silent */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formEmpleado) { showError("Selecciona un empleado"); return }
    if (!formBruto) { showError("Bruto es obligatorio"); return }

    setSending(true)
    try {
      const formData = new FormData()
      formData.append("empleado_id", formEmpleado)
      formData.append("anio", String(formAnio))
      formData.append("mes", String(formMes))
      formData.append("bruto", formBruto)
      formData.append("seguridad_social_empresa", formSSEmpresa || "0")
      formData.append("seguridad_social_empleado", formSSEmpleado || "0")
      formData.append("irpf_retencion", formIRPF || "0")
      formData.append("liquido", formLiquido || "0")
      if (formFile) formData.append("file", formFile)

      const res = await api.post("/api/admin/nominas", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      if (res.data?.success) {
        showSuccess("Nomina creada correctamente")
        resetForm()
        loadNominas()
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error creando nomina")
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta nomina?")) return
    setDeleting(id)
    try {
      const res = await api.delete(`/api/admin/nominas/${id}`)
      if (res.data?.success) {
        showSuccess("Nomina eliminada")
        loadNominas()
      }
    } catch {
      showError("Error eliminando nomina")
    } finally {
      setDeleting(null)
    }
  }

  async function handleEnviar(id: string) {
    setSendingId(id)
    try {
      const res = await api.post(`/api/admin/nominas/${id}/enviar`)
      if (res.data?.success) {
        showSuccess("Nomina enviada al empleado")
        loadNominas()
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error enviando nomina")
    } finally {
      setSendingId(null)
    }
  }

  async function handleEnviarLote() {
    if (selected.size === 0) { showError("Selecciona al menos una nomina"); return }
    if (!confirm(`Enviar ${selected.size} nominas a los empleados?`)) return
    setSendingLote(true)
    try {
      const res = await api.post("/api/admin/nominas/enviar-lote", {
        nomina_ids: Array.from(selected)
      })
      if (res.data) {
        const { enviadas, errores } = res.data
        showSuccess(`${enviadas} nominas enviadas${errores > 0 ? `, ${errores} errores` : ""}`)
        loadNominas()
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error en envio masivo")
    } finally {
      setSendingLote(false)
    }
  }

  async function handleOCR(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await api.post("/api/admin/nominas/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      if (res.data?.success && res.data.data) {
        const d = res.data.data
        setFormAnio(d.anio || formAnio)
        setFormMes(d.mes || formMes)
        setFormBruto(String(d.bruto || ""))
        setFormSSEmpresa(String(d.seguridad_social_empresa || ""))
        setFormSSEmpleado(String(d.seguridad_social_empleado || ""))
        setFormIRPF(String(d.irpf_retencion || ""))
        setFormLiquido(String(d.liquido || ""))
        showSuccess("Datos extraidos del PDF con IA")
      }
    } catch {
      showError("Error procesando PDF con OCR")
    }
  }

  function resetForm() {
    setShowForm(false)
    setFormEmpleado("")
    setFormBruto("")
    setFormSSEmpresa("")
    setFormSSEmpleado("")
    setFormIRPF("")
    setFormLiquido("")
    setFormFile(null)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === nominas.length) setSelected(new Set())
    else setSelected(new Set(nominas.map(n => n.id)))
  }

  return (
    <div className="space-y-6 p-4 md:p-0 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nominas</h1>
          <p className="text-muted-foreground text-sm">Gestion de nominas de empleados</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/nominas/entregas"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Entregas
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cerrar" : "Nueva"}
          </button>
        </div>
      </div>

      {/* Filtros + acciones lote */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={month || ""}
          onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        {selected.size > 0 && (
          <button
            onClick={handleEnviarLote}
            disabled={sendingLote}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 ml-auto"
          >
            {sendingLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enviar {selected.size} seleccionadas
          </button>
        )}
      </div>

      {/* Formulario nueva nomina */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700">Nueva nomina</h2>

          {/* Empleado */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empleado</label>
            <select
              value={formEmpleado}
              onChange={(e) => setFormEmpleado(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">Seleccionar...</option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.email})</option>
              ))}
            </select>
          </div>

          {/* Periodo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
              <select value={formMes} onChange={(e) => setFormMes(Number(e.target.value))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Anio</label>
              <input type="number" value={formAnio} onChange={(e) => setFormAnio(Number(e.target.value))} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          {/* PDF upload + OCR */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PDF de la nomina (opcional)</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFormFile(f)
                    handleOCR(f)
                  }
                }}
                className="flex-1 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium file:text-xs"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Sube el PDF y los datos se extraen automaticamente con IA</p>
          </div>

          {/* Importes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bruto</label>
              <input type="number" step="0.01" value={formBruto} onChange={(e) => setFormBruto(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Liquido (neto)</label>
              <input type="number" step="0.01" value={formLiquido} onChange={(e) => setFormLiquido(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SS Empresa</label>
              <input type="number" step="0.01" value={formSSEmpresa} onChange={(e) => setFormSSEmpresa(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SS Empleado</label>
              <input type="number" step="0.01" value={formSSEmpleado} onChange={(e) => setFormSSEmpleado(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">IRPF Retencion</label>
              <input type="number" step="0.01" value={formIRPF} onChange={(e) => setFormIRPF(e.target.value)} placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Guardando..." : "Guardar nomina"}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : nominas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No hay nominas para {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 px-1">
            {selected.size === nominas.length ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            {selected.size === nominas.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>

          {nominas.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-colors ${selected.has(n.id) ? "border-blue-300 bg-blue-50/30" : "border-gray-100"}`}>
              <div className="flex items-center justify-between gap-3">
                {/* Checkbox */}
                <button onClick={() => toggleSelect(n.id)} className="shrink-0">
                  {selected.has(n.id)
                    ? <CheckSquare className="w-5 h-5 text-blue-600" />
                    : <Square className="w-5 h-5 text-gray-300" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <h3 className="font-medium text-gray-900 text-sm">
                      {MESES[(n.mes || 1) - 1]} {n.anio}
                    </h3>
                    {n.pdf_path && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">PDF</span>
                    )}
                    <EstadoBadge estado={n.estado_entrega} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {n.nombre || "Sin asignar"} {n.apellidos || ""}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="text-gray-400">Bruto: <span className="font-medium text-gray-700">{Number(n.bruto).toFixed(2)}</span></span>
                    <span className="text-gray-400">Neto: <span className="font-semibold text-green-700">{Number(n.liquido).toFixed(2)}</span></span>
                    <span className="text-gray-400">IRPF: <span className="text-red-600">{Number(n.irpf_retencion).toFixed(2)}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Enviar */}
                  {(!n.estado_entrega || n.estado_entrega === "borrador") && (
                    <button
                      onClick={() => handleEnviar(n.id)}
                      disabled={sendingId === n.id}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Enviar al empleado"
                    >
                      {sendingId === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    </button>
                  )}
                  {n.pdf_path && (
                    <a
                      href={n.pdf_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={deleting === n.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    {deleting === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
