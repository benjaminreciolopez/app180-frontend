"use client"

import { useEffect, useState, useCallback } from "react"
import { authenticatedFetch } from "@/utils/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { toast } from "sonner"
import {
  Settings, Copy, Trash2, Pencil, Plus, RefreshCw, Search,
  ChevronDown, ChevronRight, CheckCircle2, XCircle, FlaskConical,
  Database, Regex, Zap, Calendar, BarChart3, Save, RotateCcw
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================
interface FiscalRegla {
  id: string
  ejercicio: number
  categoria: string
  clave: string
  valor: any
  descripcion: string
  activo: boolean
  created_at: string
  updated_at: string
}

interface CasillaPattern {
  id: string
  casilla: string
  concepto: string
  seccion: string
  regex_pattern: string
  grupo_valor: number
  formato_origen: string
  prioridad: number
  activo: boolean
  aciertos: number
  fallos: number
  created_at: string
  updated_at: string
}

interface Ejercicio {
  ejercicio: number
  total_reglas: string
  reglas_activas: string
  primera_regla: string
  ultima_actualizacion: string
}

// ============================================================
// CATEGORY LABELS & COLORS
// ============================================================
const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  tramos_irpf: { label: "Tramos IRPF", color: "bg-blue-100 text-blue-800", icon: "📊" },
  minimos_personales: { label: "Minimos Personales", color: "bg-green-100 text-green-800", icon: "👤" },
  deducciones: { label: "Deducciones", color: "bg-purple-100 text-purple-800", icon: "💰" },
  iva: { label: "IVA", color: "bg-orange-100 text-orange-800", icon: "🧾" },
  retenciones: { label: "Retenciones", color: "bg-red-100 text-red-800", icon: "✂️" },
  modelo_130: { label: "Modelo 130", color: "bg-amber-100 text-amber-800", icon: "📋" },
  paises_ue: { label: "Paises UE", color: "bg-indigo-100 text-indigo-800", icon: "🇪🇺" },
  casillas_modelo100: { label: "Casillas M100", color: "bg-teal-100 text-teal-800", icon: "🔢" },
}

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || { label: cat, color: "bg-slate-100 text-slate-800", icon: "📄" }
}

// ============================================================
// HELPER: Format JSON value for display
// ============================================================
function formatValor(valor: any): string {
  if (valor === null || valor === undefined) return "null"
  if (typeof valor === "number") return valor.toLocaleString("es-ES")
  if (typeof valor === "string") return valor
  if (typeof valor === "boolean") return valor ? "Si" : "No"
  if (Array.isArray(valor)) {
    if (valor.length <= 3) return JSON.stringify(valor)
    return `[${valor.length} elementos]`
  }
  if (typeof valor === "object") {
    const keys = Object.keys(valor)
    if (keys.length <= 3) return JSON.stringify(valor)
    return `{${keys.length} campos}`
  }
  return String(valor)
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function ReglasPage() {
  const [activeTab, setActiveTab] = useState("reglas")
  const currentYear = new Date().getFullYear()

  // ---- Reglas State ----
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [reglas, setReglas] = useState<FiscalRegla[]>([])
  const [reglasGrouped, setReglasGrouped] = useState<Record<string, FiscalRegla[]>>({})
  const [loadingReglas, setLoadingReglas] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [searchRegla, setSearchRegla] = useState("")

  // ---- Patterns State ----
  const [patterns, setPatterns] = useState<CasillaPattern[]>([])
  const [patternStats, setPatternStats] = useState<any>(null)
  const [loadingPatterns, setLoadingPatterns] = useState(false)
  const [searchPattern, setSearchPattern] = useState("")

  // ---- Edit Dialog ----
  const [editDialog, setEditDialog] = useState(false)
  const [editingRegla, setEditingRegla] = useState<FiscalRegla | null>(null)
  const [editValorStr, setEditValorStr] = useState("")
  const [editDescripcion, setEditDescripcion] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  // ---- Copy Dialog ----
  const [copyDialog, setCopyDialog] = useState(false)
  const [copyTo, setCopyTo] = useState("")
  const [copyingRules, setCopyingRules] = useState(false)

  // ---- Test Pattern Dialog ----
  const [testDialog, setTestDialog] = useState(false)
  const [testRegex, setTestRegex] = useState("")
  const [testTexto, setTestTexto] = useState("")
  const [testGrupo, setTestGrupo] = useState("1")
  const [testResult, setTestResult] = useState<any>(null)
  const [testingPattern, setTestingPattern] = useState(false)

  // ---- New Rule Dialog ----
  const [newRuleDialog, setNewRuleDialog] = useState(false)
  const [newRule, setNewRule] = useState({ categoria: "", clave: "", valor: "", descripcion: "" })
  const [savingNewRule, setSavingNewRule] = useState(false)

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadEjercicios = useCallback(async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/reglas")
      if (res.ok) {
        const json = await res.json()
        setEjercicios(json.ejercicios || [])
      }
    } catch (e) {
      console.error("Error loading ejercicios:", e)
    }
  }, [])

  const loadReglas = useCallback(async (year: string) => {
    setLoadingReglas(true)
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/reglas/${year}`)
      if (res.ok) {
        const json = await res.json()
        setReglas(json.reglas || [])
        setReglasGrouped(json.porCategoria || {})
        // Auto-expand all categories
        setExpandedCats(new Set(Object.keys(json.porCategoria || {})))
      }
    } catch (e) {
      console.error("Error loading reglas:", e)
    } finally {
      setLoadingReglas(false)
    }
  }, [])

  const loadPatterns = useCallback(async () => {
    setLoadingPatterns(true)
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/reglas/patterns")
      if (res.ok) {
        const json = await res.json()
        setPatterns(json.patterns || [])
        setPatternStats(json.stats || null)
      }
    } catch (e) {
      console.error("Error loading patterns:", e)
    } finally {
      setLoadingPatterns(false)
    }
  }, [])

  useEffect(() => {
    loadEjercicios()
  }, [loadEjercicios])

  useEffect(() => {
    if (selectedYear) loadReglas(selectedYear)
  }, [selectedYear, loadReglas])

  useEffect(() => {
    if (activeTab === "patterns") loadPatterns()
  }, [activeTab, loadPatterns])

  // ============================================================
  // HANDLERS
  // ============================================================
  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const openEditDialog = (regla: FiscalRegla) => {
    setEditingRegla(regla)
    setEditValorStr(typeof regla.valor === "object" ? JSON.stringify(regla.valor, null, 2) : String(regla.valor))
    setEditDescripcion(regla.descripcion || "")
    setEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingRegla) return
    setSavingEdit(true)
    try {
      let parsedVal: any
      try {
        parsedVal = JSON.parse(editValorStr)
      } catch {
        // Si no es JSON valido, usar como string
        parsedVal = editValorStr
      }

      const res = await authenticatedFetch(`/api/admin/fiscal/reglas/${editingRegla.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: parsedVal, descripcion: editDescripcion }),
      })

      if (res.ok) {
        toast.success("Regla actualizada correctamente")
        setEditDialog(false)
        loadReglas(selectedYear)
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al actualizar")
      }
    } catch (e) {
      toast.error("Error de conexion")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggleRegla = async (regla: FiscalRegla) => {
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/reglas/${regla.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !regla.activo }),
      })
      if (res.ok) {
        toast.success(regla.activo ? "Regla desactivada" : "Regla activada")
        loadReglas(selectedYear)
      }
    } catch (e) {
      toast.error("Error al cambiar estado")
    }
  }

  const handleCopyRules = async () => {
    if (!copyTo) return
    setCopyingRules(true)
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/reglas/copiar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde: parseInt(selectedYear), hasta: parseInt(copyTo) }),
      })
      if (res.ok) {
        const json = await res.json()
        toast.success(json.message || "Reglas copiadas")
        setCopyDialog(false)
        loadEjercicios()
        setSelectedYear(copyTo)
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al copiar")
      }
    } catch (e) {
      toast.error("Error de conexion")
    } finally {
      setCopyingRules(false)
    }
  }

  const handleInvalidateCache = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/reglas/invalidar-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) toast.success("Cache invalidada correctamente")
    } catch (e) {
      toast.error("Error al invalidar cache")
    }
  }

  const handleTestPattern = async () => {
    if (!testRegex || !testTexto) return
    setTestingPattern(true)
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/reglas/test-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regex_pattern: testRegex, texto: testTexto, grupo_valor: parseInt(testGrupo) }),
      })
      if (res.ok) {
        const json = await res.json()
        setTestResult(json)
      } else {
        const err = await res.json()
        toast.error(err.error || "Error en test")
      }
    } catch (e) {
      toast.error("Error de conexion")
    } finally {
      setTestingPattern(false)
    }
  }

  const handleTogglePattern = async (pattern: CasillaPattern) => {
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/reglas/patterns/${pattern.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !pattern.activo }),
      })
      if (res.ok) {
        toast.success(pattern.activo ? "Pattern desactivado" : "Pattern activado")
        loadPatterns()
      }
    } catch (e) {
      toast.error("Error al cambiar estado")
    }
  }

  const handleResetPatternStats = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/reglas/patterns/${id}/reset-stats`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success("Estadisticas reseteadas")
        loadPatterns()
      }
    } catch (e) {
      toast.error("Error al resetear")
    }
  }

  const handleCreateRule = async () => {
    if (!newRule.categoria || !newRule.clave || !newRule.valor) {
      toast.error("Categoria, clave y valor son obligatorios")
      return
    }
    setSavingNewRule(true)
    try {
      let parsedVal: any
      try { parsedVal = JSON.parse(newRule.valor) } catch { parsedVal = newRule.valor }

      const res = await authenticatedFetch("/api/admin/fiscal/reglas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ejercicio: parseInt(selectedYear),
          categoria: newRule.categoria,
          clave: newRule.clave,
          valor: parsedVal,
          descripcion: newRule.descripcion,
        }),
      })
      if (res.ok) {
        toast.success("Regla creada correctamente")
        setNewRuleDialog(false)
        setNewRule({ categoria: "", clave: "", valor: "", descripcion: "" })
        loadReglas(selectedYear)
        loadEjercicios()
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al crear")
      }
    } catch (e) {
      toast.error("Error de conexion")
    } finally {
      setSavingNewRule(false)
    }
  }

  // ============================================================
  // FILTERING
  // ============================================================
  const filteredReglas = searchRegla
    ? reglas.filter(r =>
        r.categoria.toLowerCase().includes(searchRegla.toLowerCase()) ||
        r.clave.toLowerCase().includes(searchRegla.toLowerCase()) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(searchRegla.toLowerCase()))
      )
    : reglas

  const filteredGrouped = searchRegla
    ? Object.entries(reglasGrouped).reduce((acc, [cat, rules]) => {
        const filtered = rules.filter(r =>
          r.categoria.toLowerCase().includes(searchRegla.toLowerCase()) ||
          r.clave.toLowerCase().includes(searchRegla.toLowerCase()) ||
          (r.descripcion && r.descripcion.toLowerCase().includes(searchRegla.toLowerCase()))
        )
        if (filtered.length > 0) acc[cat] = filtered
        return acc
      }, {} as Record<string, FiscalRegla[]>)
    : reglasGrouped

  const filteredPatterns = searchPattern
    ? patterns.filter(p =>
        p.casilla.toLowerCase().includes(searchPattern.toLowerCase()) ||
        p.concepto.toLowerCase().includes(searchPattern.toLowerCase()) ||
        p.seccion.toLowerCase().includes(searchPattern.toLowerCase())
      )
    : patterns

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7" /> Reglas Fiscales
          </h1>
          <p className="text-muted-foreground text-sm">
            Configura tramos IRPF, deducciones, minimos y patrones de extraccion por ejercicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleInvalidateCache} title="Limpiar cache">
            <RefreshCw className="w-4 h-4 mr-1" /> Cache
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="reglas" className="gap-1.5 whitespace-nowrap">
              <Database className="w-4 h-4" /> Reglas por Ejercicio
            </TabsTrigger>
            <TabsTrigger value="patterns" className="gap-1.5 whitespace-nowrap">
              <Regex className="w-4 h-4" /> Regex Patterns
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================ */}
        {/* TAB: REGLAS POR EJERCICIO                                    */}
        {/* ============================================================ */}
        <TabsContent value="reglas" className="space-y-4 mt-4">
          {/* Year selector + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ejercicio" />
                </SelectTrigger>
                <SelectContent>
                  {ejercicios.length > 0
                    ? ejercicios.map(e => (
                        <SelectItem key={e.ejercicio} value={e.ejercicio.toString()}>
                          {e.ejercicio} ({e.reglas_activas})
                        </SelectItem>
                      ))
                    : Array.from({ length: 5 }, (_, i) => currentYear - i + 1).map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar regla..."
                  value={searchRegla}
                  onChange={e => setSearchRegla(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNewRuleDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nueva Regla
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setCopyTo((parseInt(selectedYear) + 1).toString()); setCopyDialog(true) }}>
                <Copy className="w-4 h-4 mr-1" /> Copiar a...
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          {ejercicios.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ejercicios.slice(0, 4).map(e => (
                <Card
                  key={e.ejercicio}
                  className={`cursor-pointer transition-all ${e.ejercicio.toString() === selectedYear ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                  onClick={() => setSelectedYear(e.ejercicio.toString())}
                >
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{e.ejercicio}</div>
                    <div className="text-xs text-muted-foreground">{e.reglas_activas} reglas activas</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rules by category */}
          {loadingReglas ? (
            <LoadingSpinner />
          ) : Object.keys(filteredGrouped).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay reglas para el ejercicio {selectedYear}. Usa "Copiar a..." para crear reglas desde otro ejercicio.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {Object.entries(filteredGrouped).map(([cat, rules]) => {
                const meta = getCategoryMeta(cat)
                const isExpanded = expandedCats.has(cat)
                return (
                  <Card key={cat}>
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-t-lg"
                      onClick={() => toggleCategory(cat)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{meta.icon}</span>
                        <span className="font-semibold">{meta.label}</span>
                        <Badge variant="secondary" className={`text-xs ${meta.color}`}>
                          {rules.length} reglas
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-2 px-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[180px]">Clave</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                              <TableHead className="w-[80px] text-center">Activo</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rules.map(regla => (
                              <TableRow key={regla.id} className={!regla.activo ? "opacity-50" : ""}>
                                <TableCell className="font-mono text-xs">{regla.clave}</TableCell>
                                <TableCell className="font-mono text-xs max-w-[300px] truncate" title={JSON.stringify(regla.valor)}>
                                  {formatValor(regla.valor)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                                  {regla.descripcion || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={regla.activo}
                                    onCheckedChange={() => handleToggleRegla(regla)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(regla)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB: REGEX PATTERNS                                          */}
        {/* ============================================================ */}
        <TabsContent value="patterns" className="space-y-4 mt-4">
          {/* Stats + Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {patternStats && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{patternStats.total}</span>
                  <span className="text-muted-foreground">patterns</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{patternStats.totalAciertos}</span>
                  <span className="text-muted-foreground">aciertos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">{patternStats.totalFallos}</span>
                  <span className="text-muted-foreground">fallos</span>
                </div>
                <Badge variant={patternStats.tasaExito >= 70 ? "default" : "destructive"} className="text-xs">
                  {patternStats.tasaExito}% exito
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <div className="relative max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar casilla..."
                  value={searchPattern}
                  onChange={e => setSearchPattern(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setTestRegex(""); setTestTexto(""); setTestResult(null); setTestDialog(true) }}>
                <FlaskConical className="w-4 h-4 mr-1" /> Probar Regex
              </Button>
            </div>
          </div>

          {/* Patterns table */}
          {loadingPatterns ? (
            <LoadingSpinner />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Casilla</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="hidden lg:table-cell">Regex</TableHead>
                      <TableHead className="w-[60px] text-center">Prior.</TableHead>
                      <TableHead className="w-[100px] text-center">Aciertos</TableHead>
                      <TableHead className="w-[100px] text-center">Fallos</TableHead>
                      <TableHead className="w-[80px] text-center">Activo</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatterns.map(p => {
                      const total = (p.aciertos || 0) + (p.fallos || 0)
                      const pct = total > 0 ? Math.round((p.aciertos || 0) / total * 100) : -1
                      return (
                        <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {p.casilla}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{p.concepto || "-"}</div>
                            {p.seccion && <div className="text-xs text-muted-foreground">{p.seccion}</div>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded max-w-[300px] block truncate">
                              {p.regex_pattern}
                            </code>
                          </TableCell>
                          <TableCell className="text-center text-sm">{p.prioridad}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600 font-medium">{p.aciertos || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600 font-medium">{p.fallos || 0}</span>
                            {pct >= 0 && (
                              <div className="text-xs text-muted-foreground">({pct}%)</div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={p.activo}
                              onCheckedChange={() => handleTogglePattern(p)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => { setTestRegex(p.regex_pattern); setTestGrupo(String(p.grupo_valor)); setTestResult(null); setTestDialog(true) }}
                                title="Probar este regex"
                              >
                                <FlaskConical className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleResetPatternStats(p.id)}
                                title="Resetear estadisticas"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* DIALOGS                                                       */}
      {/* ============================================================ */}

      {/* Edit Rule Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Regla</DialogTitle>
            <DialogDescription>
              {editingRegla && (
                <span className="font-mono text-xs">
                  {editingRegla.categoria} / {editingRegla.clave}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (JSON o texto)</Label>
              <textarea
                className="w-full mt-1 p-3 rounded-md border text-sm font-mono min-h-[120px] resize-y focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                value={editValorStr}
                onChange={e => setEditValorStr(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Acepta numeros, texto, arrays y objetos JSON.
              </p>
            </div>
            <div>
              <Label>Descripcion</Label>
              <Input
                value={editDescripcion}
                onChange={e => setEditDescripcion(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Rules Dialog */}
      <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Copiar Reglas</DialogTitle>
            <DialogDescription>
              Copiar todas las reglas de {selectedYear} a otro ejercicio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedYear}</div>
                <div className="text-xs text-muted-foreground">Origen</div>
              </div>
              <span className="text-muted-foreground text-xl">→</span>
              <div>
                <Input
                  type="number"
                  value={copyTo}
                  onChange={e => setCopyTo(e.target.value)}
                  className="w-[100px] text-center text-xl font-bold"
                  min={2020}
                  max={2100}
                />
                <div className="text-xs text-muted-foreground text-center mt-1">Destino</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Las reglas que ya existan en el destino no se sobreescribiran.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialog(false)}>Cancelar</Button>
            <Button onClick={handleCopyRules} disabled={copyingRules || !copyTo}>
              {copyingRules ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Copy className="w-4 h-4 mr-1" />}
              Copiar Reglas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Rule Dialog */}
      <Dialog open={newRuleDialog} onOpenChange={setNewRuleDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Regla - Ejercicio {selectedYear}</DialogTitle>
            <DialogDescription>
              Crear una nueva regla fiscal para este ejercicio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={newRule.categoria} onValueChange={v => setNewRule({ ...newRule, categoria: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>{meta.icon} {meta.label}</SelectItem>
                    ))}
                    <SelectItem value="__custom">Otra...</SelectItem>
                  </SelectContent>
                </Select>
                {newRule.categoria === "__custom" && (
                  <Input
                    placeholder="nombre_categoria"
                    className="mt-1"
                    onChange={e => setNewRule({ ...newRule, categoria: e.target.value })}
                  />
                )}
              </div>
              <div>
                <Label>Clave</Label>
                <Input
                  value={newRule.clave}
                  onChange={e => setNewRule({ ...newRule, clave: e.target.value })}
                  placeholder="nombre_clave"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Valor (JSON o texto)</Label>
              <textarea
                className="w-full mt-1 p-3 rounded-md border text-sm font-mono min-h-[80px] resize-y focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                value={newRule.valor}
                onChange={e => setNewRule({ ...newRule, valor: e.target.value })}
                placeholder='Ej: 5550, "texto", [1,2,3], {"a":1}'
              />
            </div>
            <div>
              <Label>Descripcion</Label>
              <Input
                value={newRule.descripcion}
                onChange={e => setNewRule({ ...newRule, descripcion: e.target.value })}
                placeholder="Descripcion de la regla"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRuleDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateRule} disabled={savingNewRule}>
              {savingNewRule ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Crear Regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Pattern Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" /> Probar Regex Pattern
            </DialogTitle>
            <DialogDescription>
              Prueba un patron regex contra un texto de ejemplo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Regex Pattern</Label>
              <Input
                value={testRegex}
                onChange={e => setTestRegex(e.target.value)}
                placeholder="Ej: \[(\d{3})\]\s+([\d.,]+)"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <Label>Texto de ejemplo</Label>
                <textarea
                  className="w-full mt-1 p-3 rounded-md border text-sm font-mono min-h-[100px] resize-y focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  value={testTexto}
                  onChange={e => setTestTexto(e.target.value)}
                  placeholder="Pega aqui el texto del PDF..."
                />
              </div>
              <div>
                <Label>Grupo valor</Label>
                <Input
                  type="number"
                  value={testGrupo}
                  onChange={e => setTestGrupo(e.target.value)}
                  className="mt-1"
                  min={1}
                  max={10}
                />
              </div>
            </div>
            <Button onClick={handleTestPattern} disabled={testingPattern || !testRegex || !testTexto} className="w-full">
              {testingPattern ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Ejecutar Test
            </Button>

            {testResult && (
              <Card className={testResult.totalMatches > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {testResult.totalMatches > 0
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-600" />
                    }
                    <span className="font-semibold">
                      {testResult.totalMatches} coincidencia{testResult.totalMatches !== 1 ? "s" : ""}
                    </span>
                    {testResult.valorPrincipal && (
                      <Badge className="ml-2">Valor: {testResult.valorPrincipal}</Badge>
                    )}
                  </div>
                  {testResult.matches?.length > 0 && (
                    <div className="space-y-2">
                      {testResult.matches.slice(0, 5).map((m: any, i: number) => (
                        <div key={i} className="text-xs font-mono bg-white p-2 rounded border">
                          <span className="text-muted-foreground">Match {i + 1}:</span>{" "}
                          <span className="text-green-700">{m.fullMatch}</span>
                          {m.groups?.length > 0 && (
                            <div className="mt-1 text-muted-foreground">
                              Grupos: {m.groups.map((g: string, j: number) => (
                                <Badge key={j} variant="outline" className="mr-1 text-xs">
                                  ${j + 1}: {g}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
