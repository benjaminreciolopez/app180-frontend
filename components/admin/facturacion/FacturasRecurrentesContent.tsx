"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus,
  Search,
  Pencil,
  Play,
  Trash2,
  RefreshCw,
  MoreVertical,
  Pause,
  CheckCircle2,
  Calendar as CalendarIcon,
  FileText,
  Loader2,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { api } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { showSuccess, showError } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useConfirm } from "@/components/shared/ConfirmDialog"
import DrawerFacturaRecurrente from "@/components/admin/drawer/DrawerFacturaRecurrente"

type PlantillaRecurrente = {
  id: number
  nombre: string
  cliente_id: string
  cliente_nombre: string | null
  lineas: any[]
  iva_global: number
  metodo_pago: string
  retencion_porcentaje: number
  dia_generacion: number
  activo: boolean
  ultima_generacion: string | null
  created_at: string
}

export function FacturasRecurrentesContent() {
  const [loading, setLoading] = useState(true)
  const [plantillas, setPlantillas] = useState<PlantillaRecurrente[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PlantillaRecurrente | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlantillaRecurrente | null>(null)

  // Generar borrador individual
  const [generarDialogOpen, setGenerarDialogOpen] = useState(false)
  const [generarTarget, setGenerarTarget] = useState<PlantillaRecurrente | null>(null)
  const [generarFecha, setGenerarFecha] = useState(new Date().toISOString().split("T")[0])

  // Generar lote
  const [loteDialogOpen, setLoteDialogOpen] = useState(false)
  const [loteFecha, setLoteFecha] = useState(new Date().toISOString().split("T")[0])
  const [loteLoading, setLoteLoading] = useState(false)

  // Prefill desde factura existente
  const [prefillData, setPrefillData] = useState<any>(null)
  const searchParams = useSearchParams()
  const desdeFacturaId = searchParams.get("desde_factura")
  const prefillProcessed = useRef(false)

  const confirm = useConfirm()

  const loadPlantillas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get("/admin/facturacion/recurrentes")
      setPlantillas(res.data?.data || [])
    } catch {
      showError("Error al cargar plantillas recurrentes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlantillas()
  }, [loadPlantillas])

  // Abrir drawer con datos pre-rellenados desde una factura existente
  useEffect(() => {
    if (desdeFacturaId && !prefillProcessed.current) {
      prefillProcessed.current = true
      api.get(`/admin/facturacion/facturas/${desdeFacturaId}`)
        .then((res) => {
          const f = res.data.data || res.data
          setPrefillData({
            nombre: `Recurrente - ${f.cliente_nombre || ""}`,
            cliente_id: String(f.cliente_id || ""),
            lineas: f.lineas || [],
            iva_global: Number(f.iva_porcentaje) || 21,
            mensaje_iva: f.mensaje_iva || "",
            metodo_pago: f.metodo_pago || "TRANSFERENCIA",
            retencion_porcentaje: Number(f.retencion_porcentaje) || 0,
          })
          setEditing(null)
          setDrawerOpen(true)
        })
        .catch(() => showError("Error al cargar datos de la factura"))
    }
  }, [desdeFacturaId])

  const filtered = plantillas.filter((p) => {
    if (!searchTerm) return true
    const lower = searchTerm.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(lower) ||
      p.cliente_nombre?.toLowerCase().includes(lower)
    )
  })

  const activasCount = plantillas.filter((p) => p.activo).length

  // Calcular total estimado de una plantilla
  const calcularTotal = (p: PlantillaRecurrente) => {
    const lineas = typeof p.lineas === "string" ? JSON.parse(p.lineas) : p.lineas
    if (!Array.isArray(lineas)) return 0
    let subtotal = 0
    let iva = 0
    for (const l of lineas) {
      const base = (l.cantidad || 0) * (l.precio_unitario || 0)
      subtotal += base
      iva += base * (l.iva || p.iva_global || 0) / 100
    }
    const ret = subtotal * (p.retencion_porcentaje || 0) / 100
    return Math.round((subtotal + iva - ret) * 100) / 100
  }

  const handleToggleActivo = async (p: PlantillaRecurrente) => {
    setProcessingId(p.id)
    try {
      await api.put(`/admin/facturacion/recurrentes/${p.id}`, { activo: !p.activo })
      showSuccess(p.activo ? "Plantilla pausada" : "Plantilla activada")
      loadPlantillas()
    } catch {
      showError("Error al actualizar")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setProcessingId(deleteTarget.id)
    try {
      await api.delete(`/admin/facturacion/recurrentes/${deleteTarget.id}`)
      showSuccess("Plantilla eliminada")
      setDeleteTarget(null)
      loadPlantillas()
    } catch {
      showError("Error al eliminar")
    } finally {
      setProcessingId(null)
    }
  }

  const handleGenerarUno = async () => {
    if (!generarTarget || !generarFecha) return
    setProcessingId(generarTarget.id)
    try {
      await api.post(`/admin/facturacion/recurrentes/${generarTarget.id}/generar`, { fecha: generarFecha })
      showSuccess("Borrador generado correctamente")
      setGenerarDialogOpen(false)
      setGenerarTarget(null)
      loadPlantillas()
    } catch (error: any) {
      showError(error?.response?.data?.error || "Error al generar borrador")
    } finally {
      setProcessingId(null)
    }
  }

  const handleGenerarLote = async () => {
    if (!loteFecha) return
    setLoteLoading(true)
    try {
      const res = await api.post("/admin/facturacion/recurrentes/generar-lote", { fecha: loteFecha })
      const data = res.data
      if (data.generadas?.length > 0) {
        showSuccess(`${data.generadas.length} borradores generados`)
      }
      if (data.errores?.length > 0) {
        showError(`${data.errores.length} errores al generar`)
      }
      if (data.generadas?.length === 0 && data.errores?.length === 0) {
        showSuccess("No hay plantillas activas para generar")
      }
      setLoteDialogOpen(false)
      loadPlantillas()
    } catch (error: any) {
      showError(error?.response?.data?.error || "Error al generar lote")
    } finally {
      setLoteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
        <RefreshCw className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Facturación recurrente:</strong> Crea plantillas para clientes con facturación mensual fija.
          Las facturas se generan como <strong>borradores</strong> — revísalas y añade extras antes de validar en el listado de Fiscales.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o cliente..."
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {activasCount > 0 && (
            <Button
              onClick={() => { setLoteFecha(new Date().toISOString().split("T")[0]); setLoteDialogOpen(true) }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generar facturas del mes
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setDrawerOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1">Estado</div>
          <div className="col-span-3">Nombre</div>
          <div className="col-span-2">Cliente</div>
          <div className="col-span-1 text-center">Conceptos</div>
          <div className="col-span-1 text-center">Día</div>
          <div className="col-span-1 text-right">Total est.</div>
          <div className="col-span-1 text-center hidden md:block">Última gen.</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <Skeleton className="col-span-1 h-4 w-16" />
                <Skeleton className="col-span-3 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-1 h-4" />
                <Skeleton className="col-span-1 h-4" />
                <Skeleton className="col-span-1 h-4" />
                <Skeleton className="col-span-1 h-4" />
                <Skeleton className="col-span-2 h-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No hay plantillas recurrentes"
            description="Crea tu primera plantilla para automatizar la facturación mensual."
            actionLabel="Crear plantilla"
            onAction={() => { setEditing(null); setDrawerOpen(true) }}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const lineas = typeof p.lineas === "string" ? JSON.parse(p.lineas) : p.lineas
              const totalEstimado = calcularTotal(p)

              const estadoBadge = p.activo ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0">Activa</Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-100 text-slate-500">Pausada</Badge>
              )

              const actionsMenu = (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!!processingId}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 shadow-xl">
                    <DropdownMenuItem
                      onClick={() => { setEditing(p); setDrawerOpen(true) }}
                      className="cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setGenerarTarget(p)
                        setGenerarFecha(new Date().toISOString().split("T")[0])
                        setGenerarDialogOpen(true)
                      }}
                      className="cursor-pointer"
                    >
                      <Play className="w-4 h-4 mr-2" /> Generar borrador
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActivo(p)} className="cursor-pointer">
                      {p.activo ? (
                        <><Pause className="w-4 h-4 mr-2" /> Pausar</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Activar</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(p)}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )

              return (
                <div key={p.id} className={!p.activo ? "opacity-60" : ""}>
                  {/* ─── Vista MÓVIL: tarjeta ─── */}
                  <div className="md:hidden p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm truncate">{p.nombre}</span>
                          {estadoBadge}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.metodo_pago}</div>
                        <div className="text-sm text-slate-800 truncate mt-1">
                          {p.cliente_nombre || "—"}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                          <span>
                            <Badge variant="secondary" className="text-xs mr-1">
                              {Array.isArray(lineas) ? lineas.length : 0}
                            </Badge>
                            conceptos
                          </span>
                          <span>Día {p.dia_generacion}</span>
                          {p.ultima_generacion && (
                            <span className="text-slate-500">
                              Últ: {format(new Date(p.ultima_generacion), "d MMM yy", { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-900 text-base">{formatCurrency(totalEstimado)}</div>
                        <div className="text-[10px] text-slate-500">Total est.</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                      {actionsMenu}
                    </div>
                  </div>

                  {/* ─── Vista DESKTOP: grid 12 cols ─── */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
                    {/* Estado */}
                    <div className="col-span-1">
                      {estadoBadge}
                    </div>

                    {/* Nombre */}
                    <div className="col-span-3">
                      <div className="font-medium text-slate-900 text-sm truncate">{p.nombre}</div>
                      <div className="text-xs text-slate-500">{p.metodo_pago}</div>
                    </div>

                    {/* Cliente */}
                    <div className="col-span-2">
                      <div className="text-sm text-slate-800 truncate">{p.cliente_nombre || "—"}</div>
                    </div>

                    {/* Conceptos */}
                    <div className="col-span-1 text-center">
                      <Badge variant="secondary" className="text-xs">
                        {Array.isArray(lineas) ? lineas.length : 0}
                      </Badge>
                    </div>

                    {/* Día */}
                    <div className="col-span-1 text-center text-sm text-slate-700">
                      Día {p.dia_generacion}
                    </div>

                    {/* Total estimado */}
                    <div className="col-span-1 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(totalEstimado)}
                    </div>

                    {/* Última generación */}
                    <div className="col-span-1 text-center hidden md:block">
                      {p.ultima_generacion ? (
                        <span className="text-xs text-slate-500">
                          {format(new Date(p.ultima_generacion), "d MMM yy", { locale: es })}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="col-span-2 flex justify-end">
                      {actionsMenu}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Drawer crear/editar */}
      <DrawerFacturaRecurrente
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); setPrefillData(null) }}
        onSuccess={loadPlantillas}
        editing={editing}
        prefillData={prefillData}
      />

      {/* Dialog generar borrador individual */}
      <Dialog open={generarDialogOpen} onOpenChange={setGenerarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Generar borrador
            </DialogTitle>
          </DialogHeader>
          {generarTarget && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium">{generarTarget.nombre}</div>
                <div className="text-slate-500">{generarTarget.cliente_nombre}</div>
                <div className="font-bold">{formatCurrency(calcularTotal(generarTarget))}</div>
              </div>
              <div>
                <Label className="mb-1.5 block">Fecha de la factura</Label>
                <Input
                  type="date"
                  value={generarFecha}
                  onChange={(e) => setGenerarFecha(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerarUno}
              className="bg-green-600 hover:bg-green-700"
              disabled={!!processingId}
            >
              {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog generar lote */}
      <AlertDialog open={loteDialogOpen} onOpenChange={setLoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Generar facturas del mes
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se generarán borradores para las <strong>{activasCount}</strong> plantillas activas.
                  Los borradores aparecerán en el listado de Fiscales para su revisión y validación.
                </p>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha de las facturas</Label>
                  <Input
                    type="date"
                    value={loteFecha}
                    onChange={(e) => setLoteFecha(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleGenerarLote() }}
              className="bg-green-600 hover:bg-green-700"
              disabled={loteLoading}
            >
              {loteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generar {activasCount} borradores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la plantilla &quot;{deleteTarget?.nombre}&quot; permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={!!processingId}
            >
              {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
