"use client"

import { useEffect, useState, useCallback } from "react"
import { authenticatedFetch } from "@/utils/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import {
  Upload, FileText, User, FolderOpen, Trash2, Eye, Plus, X,
  Loader2, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Building, Wallet, Users, Home, Heart, PiggyBank, Calculator
} from "lucide-react"

type Tab = "historial" | "datos" | "dossier"

function safeJsonArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string") {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
}

export default function RentaPage() {
  const [tab, setTab] = useState<Tab>("historial")
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear() - 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Declaracion de la Renta</h1>
          <p className="text-muted-foreground text-sm">
            Dossier pre-renta con datos de CONTENDO + rentas anteriores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ejercicio.toString()} onValueChange={(v) => setEjercicio(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ejercicio" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 - i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {[
          { id: "historial" as Tab, label: "Rentas Anteriores", icon: FolderOpen },
          { id: "datos" as Tab, label: "Datos Personales", icon: User },
          { id: "dossier" as Tab, label: "Dossier Pre-Renta", icon: Calculator },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "historial" && <HistorialTab ejercicio={ejercicio} />}
      {tab === "datos" && <DatosPersonalesTab />}
      {tab === "dossier" && <DossierTab ejercicio={ejercicio} />}
    </div>
  )
}

// =============================================
// TAB 1: Historial de Rentas + Upload PDF
// =============================================
function HistorialTab({ ejercicio }: { ejercicio: number }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [detalle, setDetalle] = useState<any>(null)
  const [editForm, setEditForm] = useState<Record<string, number | string>>({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadHistorial = useCallback(async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/renta/historial")
      if (res.ok) {
        const json = await res.json()
        if (json.success) setHistorial(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistorial() }, [loadHistorial])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Solo se permiten archivos PDF")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("ejercicio", ejercicio.toString())

      const res = await authenticatedFetch("/api/admin/fiscal/renta/upload-pdf", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()

      if (json.success) {
        const dpMsg = json.extraccion.datos_personales_extraidos
          ? " + datos personales actualizados"
          : ""
        toast.success(`Renta ${ejercicio} importada (confianza: ${(json.extraccion.confianza * 100).toFixed(0)}%)${dpMsg}`)
        loadHistorial()
      } else {
        toast.error(json.error || "Error al procesar el PDF")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al subir el PDF")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = async (ej: number) => {
    if (!confirm(`Eliminar la renta del ejercicio ${ej}?`)) return
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/renta/historial/${ej}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Renta eliminada")
        loadHistorial()
        if (detalle?.ejercicio === ej) setDetalle(null)
      }
    } catch (e) {
      toast.error("Error al eliminar")
    }
  }

  const handleVerDetalle = async (ej: number) => {
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/renta/historial/${ej}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setDetalle(json.data)
          setEditing(false)
          setEditForm({
            rendimientos_trabajo: parseFloat(json.data.rendimientos_trabajo) || 0,
            rendimientos_capital_mob: parseFloat(json.data.rendimientos_capital_mob) || 0,
            rendimientos_capital_inmob: parseFloat(json.data.rendimientos_capital_inmob) || 0,
            rendimientos_actividades: parseFloat(json.data.rendimientos_actividades) || 0,
            casilla_505: parseFloat(json.data.casilla_505) || 0,
            casilla_510: parseFloat(json.data.casilla_510) || 0,
            casilla_595: parseFloat(json.data.casilla_595) || 0,
            casilla_600: parseFloat(json.data.casilla_600) || 0,
            casilla_610: parseFloat(json.data.casilla_610) || 0,
            casilla_611: parseFloat(json.data.casilla_611) || 0,
            retenciones_trabajo: parseFloat(json.data.retenciones_trabajo) || 0,
            retenciones_actividades: parseFloat(json.data.retenciones_actividades) || 0,
            pagos_fraccionados: parseFloat(json.data.pagos_fraccionados) || 0,
            resultado_declaracion: parseFloat(json.data.resultado_declaracion) || 0,
            tipo_declaracion: json.data.tipo_declaracion || "individual",
            ganancias_patrimoniales: parseFloat(json.data.ganancias_patrimoniales) || 0,
          })
        }
      }
    } catch (e) {
      toast.error("Error al cargar detalle")
    }
  }

  const handleSaveEdit = async () => {
    if (!detalle) return
    setSaving(true)
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/renta/historial/${detalle.ejercicio}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Casillas actualizadas correctamente")
        setDetalle(json.data)
        setEditing(false)
        loadHistorial()
      } else {
        toast.error(json.error || "Error al guardar")
      }
    } catch (e) {
      toast.error("Error al guardar cambios")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-blue-100 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Importar Declaracion de la Renta</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sube el PDF de tu declaracion del ejercicio <strong>{ejercicio}</strong>.
                CONTENDO extraera automaticamente las casillas clave.
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <div className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                uploading
                  ? "bg-slate-300 text-slate-500"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }`}>
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando con IA...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Subir PDF Renta {ejercicio}</>
                )}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Rentas Importadas
          </CardTitle>
          <CardDescription>Historial de declaraciones de la renta procesadas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No hay rentas importadas todavia</p>
              <p className="text-xs mt-1">Sube el PDF de tu declaracion para empezar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold">Ejercicio {r.ejercicio}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{r.tipo_declaracion}</span>
                        <span>|</span>
                        <span>Resultado: <strong className={parseFloat(r.resultado_declaracion) >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(Math.abs(parseFloat(r.resultado_declaracion)))}
                          {parseFloat(r.resultado_declaracion) >= 0 ? ' a ingresar' : ' a devolver'}
                        </strong></span>
                      </div>
                      {r.pdf_nombre_archivo && (
                        <div className="text-xs text-slate-400 mt-0.5">{r.pdf_nombre_archivo}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={parseFloat(r.confianza_extraccion) >= 0.7 ? "default" : "secondary"} className="text-xs">
                      {(parseFloat(r.confianza_extraccion) * 100).toFixed(0)}% confianza
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleVerDetalle(r.ejercicio)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(r.ejercicio)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle */}
      {detalle && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Detalle Renta {detalle.ejercicio}</CardTitle>
                <CardDescription>
                  {editing ? "Editando casillas — modifica los valores y guarda" : "Casillas extraidas del PDF"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <FileText className="w-4 h-4 mr-1" /> Editar
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Guardar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setDetalle(null); setEditing(false) }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CasillaItem label="Rend. Trabajo (003)" field="rendimientos_trabajo" value={detalle.rendimientos_trabajo} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Rend. Capital Mob. (027)" field="rendimientos_capital_mob" value={detalle.rendimientos_capital_mob} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Rend. Capital Inmob. (063)" field="rendimientos_capital_inmob" value={detalle.rendimientos_capital_inmob} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Rend. Actividades (109)" field="rendimientos_actividades" value={detalle.rendimientos_actividades} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Base Imp. General (505)" field="casilla_505" value={detalle.casilla_505} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Base Imp. Ahorro (510)" field="casilla_510" value={detalle.casilla_510} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Cuota Int. Estatal (595)" field="casilla_595" value={detalle.casilla_595} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Cuota Int. Autonomica (600)" field="casilla_600" value={detalle.casilla_600} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Cuota Liquida (610)" field="casilla_610" value={detalle.casilla_610} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Deducciones (611)" field="casilla_611" value={detalle.casilla_611} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Retenciones Trabajo" field="retenciones_trabajo" value={detalle.retenciones_trabajo} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Retenciones Actividades" field="retenciones_actividades" value={detalle.retenciones_actividades} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Pagos Fraccionados" field="pagos_fraccionados" value={detalle.pagos_fraccionados} editing={editing} editForm={editForm} setEditForm={setEditForm} />
              <CasillaItem label="Ganancias Patrimoniales" field="ganancias_patrimoniales" value={detalle.ganancias_patrimoniales} editing={editing} editForm={editForm} setEditForm={setEditForm} />
            </div>
            <div className="mt-4 p-4 rounded-lg bg-white border flex items-center justify-between">
              <span className="font-semibold text-lg">Resultado Declaracion</span>
              {editing ? (
                <Input
                  type="number"
                  step="0.01"
                  className="w-48 text-right font-bold text-lg"
                  value={editForm.resultado_declaracion}
                  onChange={e => setEditForm(p => ({ ...p, resultado_declaracion: parseFloat(e.target.value) || 0 }))}
                />
              ) : (
                <span className={`text-xl font-bold ${parseFloat(detalle.resultado_declaracion) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(parseFloat(detalle.resultado_declaracion))}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CasillaItem({ label, field, value, editing, editForm, setEditForm }: {
  label: string; field: string; value: any;
  editing: boolean; editForm: Record<string, number | string>;
  setEditForm: React.Dispatch<React.SetStateAction<Record<string, number | string>>>;
}) {
  const num = parseFloat(value) || 0
  return (
    <div className={`p-3 rounded-lg border ${editing ? "bg-blue-50/50 border-blue-200" : "bg-white"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {editing ? (
        <Input
          type="number"
          step="0.01"
          className="mt-1 h-8 text-sm font-semibold"
          value={editForm[field] ?? 0}
          onChange={e => setEditForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))}
        />
      ) : (
        <div className="font-semibold mt-1">{formatCurrency(num)}</div>
      )}
    </div>
  )
}

// =============================================
// TAB 2: Datos Personales / Familiares
// =============================================
function DatosPersonalesTab() {
  const [datos, setDatos] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    estado_civil: "soltero",
    fecha_nacimiento: "",
    discapacidad_porcentaje: 0,
    conyuge_nif: "",
    conyuge_nombre: "",
    conyuge_fecha_nacimiento: "",
    conyuge_rendimientos: 0,
    conyuge_discapacidad: 0,
    descendientes: [] as any[],
    ascendientes: [] as any[],
    vivienda_tipo: "propiedad",
    vivienda_referencia_catastral: "",
    alquiler_anual: 0,
    hipoteca_anual: 0,
    hipoteca_fecha_compra: "",
    aportacion_plan_pensiones: 0,
    donaciones_ong: 0,
    donaciones_otras: 0,
    tipo_declaracion_preferida: "individual",
  })

  useEffect(() => {
    loadDatos()
  }, [])

  const loadDatos = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/renta/datos-personales")
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setDatos(json.data)
          setForm({
            estado_civil: json.data.estado_civil || "soltero",
            fecha_nacimiento: json.data.fecha_nacimiento?.split("T")[0] || "",
            discapacidad_porcentaje: json.data.discapacidad_porcentaje || 0,
            conyuge_nif: json.data.conyuge_nif || "",
            conyuge_nombre: json.data.conyuge_nombre || "",
            conyuge_fecha_nacimiento: json.data.conyuge_fecha_nacimiento?.split("T")[0] || "",
            conyuge_rendimientos: json.data.conyuge_rendimientos || 0,
            conyuge_discapacidad: json.data.conyuge_discapacidad || 0,
            descendientes: safeJsonArray(json.data.descendientes),
            ascendientes: safeJsonArray(json.data.ascendientes),
            vivienda_tipo: json.data.vivienda_tipo || "propiedad",
            vivienda_referencia_catastral: json.data.vivienda_referencia_catastral || "",
            alquiler_anual: json.data.alquiler_anual || 0,
            hipoteca_anual: json.data.hipoteca_anual || 0,
            hipoteca_fecha_compra: json.data.hipoteca_fecha_compra?.split("T")[0] || "",
            aportacion_plan_pensiones: json.data.aportacion_plan_pensiones || 0,
            donaciones_ong: json.data.donaciones_ong || 0,
            donaciones_otras: json.data.donaciones_otras || 0,
            tipo_declaracion_preferida: json.data.tipo_declaracion_preferida || "individual",
          })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/renta/datos-personales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Datos personales guardados")
        setDatos(json.data)
      } else {
        toast.error(json.error || "Error al guardar")
      }
    } catch (e) {
      toast.error("Error al guardar datos personales")
    } finally {
      setSaving(false)
    }
  }

  const addDescendiente = () => {
    setForm(prev => ({
      ...prev,
      descendientes: [...prev.descendientes, { nombre: "", fecha_nacimiento: "", discapacidad_porcentaje: 0, convivencia: true }]
    }))
  }

  const removeDescendiente = (idx: number) => {
    setForm(prev => ({
      ...prev,
      descendientes: prev.descendientes.filter((_, i) => i !== idx)
    }))
  }

  const updateDescendiente = (idx: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      descendientes: prev.descendientes.map((d, i) => i === idx ? { ...d, [field]: value } : d)
    }))
  }

  const addAscendiente = () => {
    setForm(prev => ({
      ...prev,
      ascendientes: [...prev.ascendientes, { nombre: "", fecha_nacimiento: "", discapacidad_porcentaje: 0, convivencia: true }]
    }))
  }

  const removeAscendiente = (idx: number) => {
    setForm(prev => ({
      ...prev,
      ascendientes: prev.ascendientes.filter((_, i) => i !== idx)
    }))
  }

  const updateAscendiente = (idx: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      ascendientes: prev.ascendientes.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    }))
  }

  const showConyuge = form.estado_civil === "casado" || form.estado_civil === "pareja_hecho"

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6">
      {/* Datos del declarante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Datos del Declarante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Estado Civil</Label>
              <Select value={form.estado_civil} onValueChange={v => setForm(p => ({ ...p, estado_civil: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soltero">Soltero/a</SelectItem>
                  <SelectItem value="casado">Casado/a</SelectItem>
                  <SelectItem value="pareja_hecho">Pareja de hecho</SelectItem>
                  <SelectItem value="viudo">Viudo/a</SelectItem>
                  <SelectItem value="separado">Separado/a</SelectItem>
                  <SelectItem value="divorciado">Divorciado/a</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Nacimiento</Label>
              <Input type="date" value={form.fecha_nacimiento} onChange={e => setForm(p => ({ ...p, fecha_nacimiento: e.target.value }))} />
            </div>
            <div>
              <Label>Discapacidad (%)</Label>
              <Select value={form.discapacidad_porcentaje.toString()} onValueChange={v => setForm(p => ({ ...p, discapacidad_porcentaje: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin discapacidad</SelectItem>
                  <SelectItem value="33">33% o superior</SelectItem>
                  <SelectItem value="65">65% o superior</SelectItem>
                  <SelectItem value="75">75% o superior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Declaracion Preferida</Label>
              <Select value={form.tipo_declaracion_preferida} onValueChange={v => setForm(p => ({ ...p, tipo_declaracion_preferida: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="conjunta">Conjunta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conyuge */}
      {showConyuge && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" /> Datos del Conyuge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>NIF Conyuge</Label>
                <Input value={form.conyuge_nif} onChange={e => setForm(p => ({ ...p, conyuge_nif: e.target.value }))} placeholder="12345678A" />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input value={form.conyuge_nombre} onChange={e => setForm(p => ({ ...p, conyuge_nombre: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha Nacimiento</Label>
                <Input type="date" value={form.conyuge_fecha_nacimiento} onChange={e => setForm(p => ({ ...p, conyuge_fecha_nacimiento: e.target.value }))} />
              </div>
              <div>
                <Label>Rendimientos anuales</Label>
                <Input type="number" step="0.01" value={form.conyuge_rendimientos} onChange={e => setForm(p => ({ ...p, conyuge_rendimientos: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descendientes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Descendientes (Hijos)</CardTitle>
            <Button size="sm" variant="outline" onClick={addDescendiente}>
              <Plus className="w-4 h-4 mr-1" /> Anadir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {form.descendientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin descendientes registrados</p>
          ) : (
            <div className="space-y-3">
              {form.descendientes.map((d: any, i: number) => (
                <div key={i} className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={d.nombre} onChange={e => updateDescendiente(i, "nombre", e.target.value)} placeholder="Nombre completo" />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Fecha Nac.</Label>
                    <Input type="date" value={d.fecha_nacimiento} onChange={e => updateDescendiente(i, "fecha_nacimiento", e.target.value)} />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Discapacidad</Label>
                    <Select value={(d.discapacidad_porcentaje || 0).toString()} onValueChange={v => updateDescendiente(i, "discapacidad_porcentaje", parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No</SelectItem>
                        <SelectItem value="33">33%+</SelectItem>
                        <SelectItem value="65">65%+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeDescendiente(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ascendientes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Ascendientes a Cargo</CardTitle>
            <Button size="sm" variant="outline" onClick={addAscendiente}>
              <Plus className="w-4 h-4 mr-1" /> Anadir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {form.ascendientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin ascendientes registrados</p>
          ) : (
            <div className="space-y-3">
              {form.ascendientes.map((a: any, i: number) => (
                <div key={i} className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={a.nombre} onChange={e => updateAscendiente(i, "nombre", e.target.value)} placeholder="Nombre completo" />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Fecha Nac.</Label>
                    <Input type="date" value={a.fecha_nacimiento} onChange={e => updateAscendiente(i, "fecha_nacimiento", e.target.value)} />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Discapacidad</Label>
                    <Select value={(a.discapacidad_porcentaje || 0).toString()} onValueChange={v => updateAscendiente(i, "discapacidad_porcentaje", parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No</SelectItem>
                        <SelectItem value="33">33%+</SelectItem>
                        <SelectItem value="65">65%+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeAscendiente(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vivienda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Home className="w-5 h-5" /> Vivienda Habitual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Vivienda</Label>
              <Select value={form.vivienda_tipo} onValueChange={v => setForm(p => ({ ...p, vivienda_tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="propiedad">En propiedad</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ref. Catastral</Label>
              <Input value={form.vivienda_referencia_catastral} onChange={e => setForm(p => ({ ...p, vivienda_referencia_catastral: e.target.value }))} placeholder="0000000AA0000A0000AA" />
            </div>
            {form.vivienda_tipo === "alquiler" && (
              <div>
                <Label>Alquiler anual</Label>
                <Input type="number" step="0.01" value={form.alquiler_anual} onChange={e => setForm(p => ({ ...p, alquiler_anual: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
            {form.vivienda_tipo === "propiedad" && (
              <>
                <div>
                  <Label>Hipoteca anual (pre-2013)</Label>
                  <Input type="number" step="0.01" value={form.hipoteca_anual} onChange={e => setForm(p => ({ ...p, hipoteca_anual: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Fecha compra vivienda</Label>
                  <Input type="date" value={form.hipoteca_fecha_compra} onChange={e => setForm(p => ({ ...p, hipoteca_fecha_compra: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deducciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PiggyBank className="w-5 h-5" /> Deducciones y Aportaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Plan de Pensiones (anual)</Label>
              <Input type="number" step="0.01" value={form.aportacion_plan_pensiones} onChange={e => setForm(p => ({ ...p, aportacion_plan_pensiones: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Donaciones ONG</Label>
              <Input type="number" step="0.01" value={form.donaciones_ong} onChange={e => setForm(p => ({ ...p, donaciones_ong: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Otras Donaciones</Label>
              <Input type="number" step="0.01" value={form.donaciones_otras} onChange={e => setForm(p => ({ ...p, donaciones_otras: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {saving ? "Guardando..." : "Guardar Datos Personales"}
        </Button>
      </div>
    </div>
  )
}

// =============================================
// TAB 3: Dossier Pre-Renta
// =============================================
function DossierTab({ ejercicio }: { ejercicio: number }) {
  const [dossier, setDossier] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadDossier = async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/renta/dossier/${ejercicio}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setDossier(json.data)
      }
    } catch (e) {
      toast.error("Error al generar el dossier")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-semibold">Dossier Pre-Renta {ejercicio}</h3>
              <p className="text-sm text-muted-foreground">
                Genera un resumen completo con datos de facturas, gastos, nominas, retenciones y pagos fraccionados del ejercicio.
              </p>
            </div>
            <Button onClick={loadDossier} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              {loading ? "Generando..." : "Generar Dossier"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {dossier && (
        <>
          {/* Empresa Info */}
          <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl">
            <Building className="w-5 h-5 text-slate-600" />
            <div>
              <span className="font-semibold">{dossier.empresa.nombre}</span>
              <span className="text-muted-foreground ml-2">NIF: {dossier.empresa.nif}</span>
            </div>
            <Badge variant="outline" className="ml-auto">Ejercicio {dossier.ejercicio}</Badge>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Ingresos Actividad"
              value={formatCurrency(dossier.rendimientos_actividades.ingresos)}
              icon={TrendingUp}
              subtext={`${dossier.rendimientos_actividades.num_facturas} facturas`}
              color="green"
            />
            <KpiCard
              title="Gastos Deducibles"
              value={formatCurrency(dossier.rendimientos_actividades.gastos_deducibles)}
              icon={TrendingDown}
              subtext={`${dossier.rendimientos_actividades.num_gastos} gastos`}
              color="red"
            />
            <KpiCard
              title="Rendimiento Neto"
              value={formatCurrency(dossier.rendimientos_actividades.rendimiento_neto)}
              icon={Wallet}
              subtext="Ingresos - Gastos"
              color={dossier.rendimientos_actividades.rendimiento_neto >= 0 ? "blue" : "red"}
            />
            <KpiCard
              title="Total Anticipado"
              value={formatCurrency(dossier.retenciones_y_pagos.total_anticipado)}
              icon={PiggyBank}
              subtext="Retenciones + Pagos 130"
              color="purple"
            />
          </div>

          {/* Detalle Rendimientos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="w-4 h-4" /> Rendimientos de Actividades Economicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Ingresos (Base facturada)" value={dossier.rendimientos_actividades.ingresos} positive />
              <Row label="Gastos: Compras y servicios" value={dossier.rendimientos_actividades.detalle_gastos.compras_servicios} negative />
              <Row label="Gastos: Nominas" value={dossier.rendimientos_actividades.detalle_gastos.nominas} negative />
              <Row label="Gastos: SS Empresa" value={dossier.rendimientos_actividades.detalle_gastos.seguridad_social_empresa} negative />
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Rendimiento Neto</span>
                <span className={dossier.rendimientos_actividades.rendimiento_neto >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(dossier.rendimientos_actividades.rendimiento_neto)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Retenciones y Pagos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="w-4 h-4" /> Retenciones y Pagos a Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Retenciones de clientes (fact. emitidas)" value={dossier.retenciones_y_pagos.retenciones_clientes} />
              <Row label="Retenciones actividades (gastos con ret.)" value={dossier.retenciones_y_pagos.retenciones_actividades} />
              <Row label="Pagos fraccionados (Mod. 130)" value={dossier.retenciones_y_pagos.pagos_fraccionados} />
              {dossier.retenciones_y_pagos.detalle_130?.length > 0 && (
                <div className="pl-4 space-y-1">
                  {dossier.retenciones_y_pagos.detalle_130.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>T{p.trimestre}</span>
                      <span>{formatCurrency(parseFloat(p.importe))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Anticipado a Hacienda</span>
                <span>{formatCurrency(dossier.retenciones_y_pagos.total_anticipado)}</span>
              </div>
            </CardContent>
          </Card>

          {/* IVA Anual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" /> Resumen IVA Anual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="IVA Repercutido (ventas)" value={dossier.iva_anual.repercutido} positive />
              <Row label="IVA Soportado (compras)" value={dossier.iva_anual.soportado} negative />
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Diferencia IVA</span>
                <span>{formatCurrency(dossier.iva_anual.diferencia)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Personal */}
          {dossier.personal.num_empleados > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4" /> Costes de Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label={`Nominas (${dossier.personal.num_empleados} empleados aprox.)`} value={dossier.personal.coste_nominas} />
                <Row label="SS Empresa" value={dossier.personal.ss_empresa} />
                <Row label="IRPF Retenido nominas" value={dossier.personal.irpf_retenido_nominas} />
              </CardContent>
            </Card>
          )}

          {/* Renta Anterior */}
          {dossier.renta_anterior && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="w-4 h-4" /> Renta Anterior ({dossier.renta_anterior.ejercicio})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Base Imponible General (505)" value={dossier.renta_anterior.casilla_505} />
                <Row label="Cuota Liquida (610)" value={dossier.renta_anterior.casilla_610} />
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Resultado {dossier.renta_anterior.ejercicio}</span>
                  <span className={dossier.renta_anterior.resultado >= 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(dossier.renta_anterior.resultado)}
                    {dossier.renta_anterior.resultado >= 0 ? " a ingresar" : " a devolver"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Datos Personales Summary */}
          {dossier.datos_personales && (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" /> Situacion Personal/Familiar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado civil:</span>
                  <span className="font-medium capitalize">{dossier.datos_personales.estado_civil}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descendientes:</span>
                  <span className="font-medium">{dossier.datos_personales.descendientes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ascendientes a cargo:</span>
                  <span className="font-medium">{dossier.datos_personales.ascendientes?.length || 0}</span>
                </div>
                {dossier.datos_personales.aportacion_plan_pensiones > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan pensiones:</span>
                    <span className="font-medium">{formatCurrency(dossier.datos_personales.aportacion_plan_pensiones)}</span>
                  </div>
                )}
                {(dossier.datos_personales.donaciones_ong > 0 || dossier.datos_personales.donaciones_otras > 0) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Donaciones:</span>
                    <span className="font-medium">{formatCurrency((dossier.datos_personales.donaciones_ong || 0) + (dossier.datos_personales.donaciones_otras || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo declaracion:</span>
                  <span className="font-medium capitalize">{dossier.datos_personales.tipo_declaracion_preferida}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nota Resumen */}
          <Card className="bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Nota del Dossier</h4>
                  <p className="text-sm text-slate-300">{dossier.resumen.nota}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Este dossier es orientativo. Los calculos definitivos dependen de la legislacion vigente,
                    minimos personales y familiares, y otras circunstancias personales que puede evaluar CONTENDO o tu asesor fiscal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Helper Components
function KpiCard({ title, value, icon: Icon, subtext, color }: any) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-full ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <h3 className="text-xl font-bold">{value}</h3>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${positive ? "text-green-600" : ""} ${negative ? "text-red-600" : ""}`}>
        {negative ? "-" : ""}{formatCurrency(Math.abs(value || 0))}
      </span>
    </div>
  )
}
