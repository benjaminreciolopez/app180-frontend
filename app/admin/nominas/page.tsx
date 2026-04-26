"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { showSuccess, showError } from "@/lib/toast"
import {
  FileText, Upload, Trash2, Loader2, Download, Search, Plus, X, Send,
  CheckSquare, Square, Mail, ClipboardList, BarChart3, ChevronDown, ChevronUp,
  Pencil, Building2, Ban
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
  estado: string | null
  estado_entrega: string | null
  motivo_anulacion: string | null
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
  const [formBaseCotizacion, setFormBaseCotizacion] = useState("")
  const [formContingencias, setFormContingencias] = useState("")
  const [formDesempleo, setFormDesempleo] = useState("")
  const [formFormacion, setFormFormacion] = useState("")
  const [formHorasExtra, setFormHorasExtra] = useState("")
  const [formComplementos, setFormComplementos] = useState("")
  const [showDesglose, setShowDesglose] = useState(false)
  const [showResumen, setShowResumen] = useState(false)
  const [resumenData, setResumenData] = useState<any>(null)
  const [loadingResumen, setLoadingResumen] = useState(false)
  // Edición
  const [editingId, setEditingId] = useState<string | null>(null)
  // Resumen empresario (modal)
  const [showEmpresario, setShowEmpresario] = useState(false)
  const [empresarioData, setEmpresarioData] = useState<any>(null)
  const [loadingEmpresario, setLoadingEmpresario] = useState(false)

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
      if (editingId) {
        // Editar (PUT JSON, sin archivo)
        const payload: any = {
          empleado_id: formEmpleado,
          anio: Number(formAnio),
          mes: Number(formMes),
          bruto: parseFloat(formBruto) || 0,
          seguridad_social_empresa: parseFloat(formSSEmpresa) || 0,
          seguridad_social_empleado: parseFloat(formSSEmpleado) || 0,
          irpf_retencion: parseFloat(formIRPF) || 0,
          liquido: parseFloat(formLiquido) || 0,
          base_cotizacion: parseFloat(formBaseCotizacion) || 0,
          tipo_contingencias_comunes: parseFloat(formContingencias) || 0,
          tipo_desempleo: parseFloat(formDesempleo) || 0,
          tipo_formacion: parseFloat(formFormacion) || 0,
          horas_extra: parseFloat(formHorasExtra) || 0,
          complementos: parseFloat(formComplementos) || 0,
        }
        const res = await api.put(`/api/admin/nominas/${editingId}`, payload)
        if (res.data?.success) {
          showSuccess("Nómina actualizada")
          resetForm()
          loadNominas()
        }
      } else {
        // Crear (POST multipart por si hay PDF)
        const formData = new FormData()
        formData.append("empleado_id", formEmpleado)
        formData.append("anio", String(formAnio))
        formData.append("mes", String(formMes))
        formData.append("bruto", formBruto)
        formData.append("seguridad_social_empresa", formSSEmpresa || "0")
        formData.append("seguridad_social_empleado", formSSEmpleado || "0")
        formData.append("irpf_retencion", formIRPF || "0")
        formData.append("liquido", formLiquido || "0")
        formData.append("base_cotizacion", formBaseCotizacion || "0")
        formData.append("tipo_contingencias_comunes", formContingencias || "0")
        formData.append("tipo_desempleo", formDesempleo || "0")
        formData.append("tipo_formacion", formFormacion || "0")
        formData.append("horas_extra", formHorasExtra || "0")
        formData.append("complementos", formComplementos || "0")
        if (formFile) formData.append("file", formFile)

        const res = await api.post("/api/admin/nominas", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        })
        if (res.data?.success) {
          if (res.data.warnings?.length) {
            showError(res.data.warnings[0])
          }
          showSuccess("Nómina creada correctamente")
          resetForm()
          loadNominas()
        }
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error guardando nómina")
    } finally {
      setSending(false)
    }
  }

  function handleEdit(n: Nomina) {
    setEditingId(n.id)
    setFormEmpleado(n.empleado_id || "")
    setFormAnio(n.anio)
    setFormMes(n.mes)
    setFormBruto(String(n.bruto || ""))
    setFormSSEmpresa(String(n.seguridad_social_empresa || ""))
    setFormSSEmpleado(String(n.seguridad_social_empleado || ""))
    setFormIRPF(String(n.irpf_retencion || ""))
    setFormLiquido(String(n.liquido || ""))
    setShowForm(true)
    setShowDesglose(true)
  }

  async function loadResumenEmpresario() {
    if (!month) {
      showError("Selecciona un mes para ver el resumen para el empresario")
      return
    }
    setLoadingEmpresario(true)
    setShowEmpresario(true)
    try {
      const res = await api.get("/api/admin/nominas/resumen-empresario", { params: { year, month } })
      if (res.data?.success) setEmpresarioData(res.data)
    } catch {
      showError("Error cargando resumen empresario")
    } finally {
      setLoadingEmpresario(false)
    }
  }

  function descargarResumenCSV() {
    if (!empresarioData) return
    const headers = ["Empleado", "Bruto", "IRPF", "SS empleado", "SS empresa", "Neto a pagar"]
    const rows = (empresarioData.empleados || []).map((e: any) => [
      e.nombre,
      e.bruto.toFixed(2),
      e.irpf.toFixed(2),
      e.ss_empleado.toFixed(2),
      e.ss_empresa.toFixed(2),
      e.neto_a_pagar.toFixed(2),
    ])
    const t = empresarioData.totales
    rows.push(["TOTAL", t.total_bruto.toFixed(2), t.total_irpf.toFixed(2), t.total_ss_empleado.toFixed(2), t.total_ss_empresa.toFixed(2), t.total_liquido.toFixed(2)])
    const csv = [headers, ...rows].map(row => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nominas_${empresarioData.year}_${String(empresarioData.month).padStart(2, "0")}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

  async function handleAnular(id: string) {
    const motivo = prompt("Motivo de la anulación (mínimo 3 caracteres):")
    if (!motivo || motivo.trim().length < 3) {
      if (motivo !== null) showError("Motivo demasiado corto")
      return
    }
    setDeleting(id)
    try {
      const res = await api.post(`/api/admin/nominas/${id}/anular`, { motivo: motivo.trim() })
      if (res.data?.success) {
        showSuccess("Nómina anulada")
        loadNominas()
      }
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error anulando nómina")
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
        setFormBaseCotizacion(String(d.base_cotizacion || ""))
        setFormContingencias(String(d.tipo_contingencias_comunes || ""))
        setFormDesempleo(String(d.tipo_desempleo || ""))
        setFormFormacion(String(d.tipo_formacion || ""))
        setFormHorasExtra(String(d.horas_extra || ""))
        setFormComplementos(String(d.complementos || ""))
        if (d.base_cotizacion > 0 || d.tipo_contingencias_comunes > 0) setShowDesglose(true)
        showSuccess("Datos extraidos del PDF con IA")
      }
    } catch {
      showError("Error procesando PDF con OCR")
    }
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setFormEmpleado("")
    setFormBruto("")
    setFormSSEmpresa("")
    setFormSSEmpleado("")
    setFormIRPF("")
    setFormLiquido("")
    setFormFile(null)
    setFormBaseCotizacion("")
    setFormContingencias("")
    setFormDesempleo("")
    setFormFormacion("")
    setFormHorasExtra("")
    setFormComplementos("")
    setShowDesglose(false)
  }

  async function loadResumenAnual() {
    setLoadingResumen(true)
    try {
      const res = await api.get("/api/admin/nominas/resumen-anual", { params: { year } })
      if (res.data?.success) setResumenData(res.data)
    } catch {
      showError("Error cargando resumen anual")
    } finally {
      setLoadingResumen(false)
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/nominas/entregas"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Entregas
          </Link>
          <button
            onClick={loadResumenEmpresario}
            disabled={loadingEmpresario}
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
            title={month ? "Resumen mensual para el empresario" : "Selecciona un mes primero"}
          >
            {loadingEmpresario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
            Resumen empresario
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva nómina
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

        <button
          onClick={() => {
            if (showResumen) { setShowResumen(false) } else { loadResumenAnual(); setShowResumen(true) }
          }}
          disabled={loadingResumen}
          className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50"
        >
          {loadingResumen ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
          Resumen anual
          {showResumen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

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

      {/* Resumen Anual */}
      {showResumen && resumenData && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="bg-purple-50 px-5 py-3 border-b border-purple-100">
            <h3 className="font-semibold text-sm text-purple-800">Resumen Anual {resumenData.year}</h3>
            <p className="text-xs text-purple-600">{resumenData.totals?.num_nominas || 0} nominas registradas</p>
          </div>

          {resumenData.empleados?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Empleado</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Nominas</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Bruto</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">Neto</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">IRPF</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">SS Empl.</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">SS Empr.</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-600">% IRPF</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenData.empleados.map((emp: any) => (
                    <tr key={emp.empleado_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{emp.nombre_empleado || "Sin asignar"}</td>
                      <td className="text-right px-3 py-2.5 text-gray-600">{emp.num_nominas}</td>
                      <td className="text-right px-3 py-2.5 font-medium text-gray-800">{Number(emp.total_bruto).toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 font-semibold text-green-700">{Number(emp.total_liquido).toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 text-red-600">{Number(emp.total_irpf).toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 text-gray-600">{Number(emp.total_ss_empleado).toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 text-gray-600">{Number(emp.total_ss_empresa).toFixed(2)}</td>
                      <td className="text-right px-3 py-2.5 text-orange-600">{Number(emp.tipo_irpf_medio).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr className="font-semibold">
                    <td className="px-4 py-2.5 text-gray-900">TOTAL</td>
                    <td className="text-right px-3 py-2.5 text-gray-700">{resumenData.totals?.num_nominas || 0}</td>
                    <td className="text-right px-3 py-2.5 text-gray-900">{Number(resumenData.totals?.total_bruto || 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-green-700">{Number(resumenData.totals?.total_liquido || 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-red-600">{Number(resumenData.totals?.total_irpf || 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-700">{Number(resumenData.totals?.total_ss_empleado || 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-700">{Number(resumenData.totals?.total_ss_empresa || 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-gray-400">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No hay datos de nominas para {resumenData.year}</div>
          )}
        </div>
      )}

      {/* Nota: La creación de nóminas está disponible solo para gestorías */}

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
                  {n.estado === "anulada" && (
                    <span title={n.motivo_anulacion || "Anulada"} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                      Anulada
                    </span>
                  )}
                  {/* Enviar (solo si no está anulada y no está enviada) */}
                  {n.estado !== "anulada" && (!n.estado_entrega || n.estado_entrega === "borrador") && (
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
                  {/* Editar (sólo si NO está aprobada/enviada/anulada) */}
                  {n.estado !== "anulada" && (!n.estado_entrega || n.estado_entrega === "borrador") && (
                    <button
                      onClick={() => handleEdit(n)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {/* Anular (cualquier estado excepto ya anulada) */}
                  {n.estado !== "anulada" && (
                    <button
                      onClick={() => handleAnular(n.id)}
                      disabled={deleting === n.id}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Anular con motivo"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  {/* Eliminar (solo borrador) */}
                  {(!n.estado || n.estado === "borrador") && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={deleting === n.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar borrador"
                    >
                      {deleting === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === Modal Crear/Editar Nómina === */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">{editingId ? "Editar nómina" : "Nueva nómina"}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* OCR + PDF (solo en crear) */}
              {!editingId && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Subir PDF (extracción IA opcional)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null
                        setFormFile(f)
                        if (f) handleOCR(f)
                      }}
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Empleado *</label>
                  <select
                    value={formEmpleado}
                    onChange={(e) => setFormEmpleado(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    required
                  >
                    <option value="">— selecciona —</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Año</label>
                    <input
                      type="number"
                      value={formAnio}
                      onChange={(e) => setFormAnio(Number(e.target.value))}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Mes</label>
                    <select
                      value={formMes}
                      onChange={(e) => setFormMes(Number(e.target.value))}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    >
                      {MESES.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bruto *</label>
                  <input type="number" step="0.01" value={formBruto} onChange={(e) => setFormBruto(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Líquido (neto)</label>
                  <input type="number" step="0.01" value={formLiquido} onChange={(e) => setFormLiquido(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">IRPF retención</label>
                  <input type="number" step="0.01" value={formIRPF} onChange={(e) => setFormIRPF(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SS empleado</label>
                  <input type="number" step="0.01" value={formSSEmpleado} onChange={(e) => setFormSSEmpleado(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SS empresa</label>
                  <input type="number" step="0.01" value={formSSEmpresa} onChange={(e) => setFormSSEmpresa(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDesglose(!showDesglose)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {showDesglose ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Desglose detallado (base cotización, contingencias, formación, horas extra…)
              </button>

              {showDesglose && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Base cotización</label>
                    <input type="number" step="0.01" value={formBaseCotizacion} onChange={(e) => setFormBaseCotizacion(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Contingencias comunes</label>
                    <input type="number" step="0.01" value={formContingencias} onChange={(e) => setFormContingencias(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Desempleo</label>
                    <input type="number" step="0.01" value={formDesempleo} onChange={(e) => setFormDesempleo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Formación</label>
                    <input type="number" step="0.01" value={formFormacion} onChange={(e) => setFormFormacion(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Horas extra</label>
                    <input type="number" step="0.01" value={formHorasExtra} onChange={(e) => setFormHorasExtra(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Complementos</label>
                    <input type="number" step="0.01" value={formComplementos} onChange={(e) => setFormComplementos(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={sending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Guardar cambios" : "Crear nómina"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === Modal Resumen Empresario === */}
      {showEmpresario && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold">Resumen para el empresario</h2>
                {empresarioData && (
                  <p className="text-xs text-muted-foreground">
                    {MESES[(empresarioData.month || 1) - 1]} {empresarioData.year} — {empresarioData.num_nominas} nóminas
                  </p>
                )}
              </div>
              <button onClick={() => { setShowEmpresario(false); setEmpresarioData(null) }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingEmpresario && (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
            )}

            {empresarioData && !loadingEmpresario && (
              <>
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-[10px] text-blue-600 uppercase tracking-wide font-semibold">A empleados (transferencias)</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">{Number(empresarioData.totales.transferencias_a_empleados).toFixed(2)} €</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-[10px] text-red-600 uppercase tracking-wide font-semibold">A AEAT (modelo 111)</p>
                    <p className="text-lg font-bold text-red-900 mt-1">{Number(empresarioData.totales.a_pagar_a_aeat).toFixed(2)} €</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[10px] text-amber-700 uppercase tracking-wide font-semibold">A Seg. Social (TC1+TC2)</p>
                    <p className="text-lg font-bold text-amber-900 mt-1">{Number(empresarioData.totales.a_pagar_a_seg_social).toFixed(2)} €</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <p className="text-[10px] text-purple-600 uppercase tracking-wide font-semibold">Coste total empresa</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">{Number(empresarioData.totales.coste_total_empresa).toFixed(2)} €</p>
                  </div>
                </div>

                <div className="px-5 pb-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Empleado</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Bruto</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">IRPF</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">SS empl.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">SS empr.</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Neto a pagar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(empresarioData.empleados || []).map((e: any) => (
                        <tr key={e.nomina_id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{e.nombre}</td>
                          <td className="text-right px-3 py-2">{e.bruto.toFixed(2)}</td>
                          <td className="text-right px-3 py-2 text-red-600">{e.irpf.toFixed(2)}</td>
                          <td className="text-right px-3 py-2">{e.ss_empleado.toFixed(2)}</td>
                          <td className="text-right px-3 py-2">{e.ss_empresa.toFixed(2)}</td>
                          <td className="text-right px-3 py-2 font-semibold text-green-700">{e.neto_a_pagar.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 font-semibold">
                      <tr>
                        <td className="px-3 py-2">TOTAL</td>
                        <td className="text-right px-3 py-2">{Number(empresarioData.totales.total_bruto).toFixed(2)}</td>
                        <td className="text-right px-3 py-2 text-red-600">{Number(empresarioData.totales.total_irpf).toFixed(2)}</td>
                        <td className="text-right px-3 py-2">{Number(empresarioData.totales.total_ss_empleado).toFixed(2)}</td>
                        <td className="text-right px-3 py-2">{Number(empresarioData.totales.total_ss_empresa).toFixed(2)}</td>
                        <td className="text-right px-3 py-2 text-green-700">{Number(empresarioData.totales.total_liquido).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end gap-2 px-5 pb-5 pt-2 border-t flex-wrap">
                  <button onClick={() => { setShowEmpresario(false); setEmpresarioData(null) }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                    Cerrar
                  </button>
                  <button onClick={descargarResumenCSV} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Descargar CSV
                  </button>
                  <a
                    href={`/api/admin/nominas/sepa?year=${empresarioData?.year}&month=${empresarioData?.month}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    title="Genera el XML SEPA para subir al banco y pagar las nóminas"
                  >
                    <Download className="w-4 h-4" />
                    Descargar SEPA (banco)
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
