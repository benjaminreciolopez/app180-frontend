"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  FileCheck,
  FileX,
  RefreshCcw,
  RefreshCw,
  Download,
  Mail,
  Eye,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  ChevronsUpDown,
  FileText,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCircle,
  XCircle
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { useFacturacionBasePath } from "@/hooks/useFacturacionBasePath"
import { UniversalExportButton } from "@/components/shared/UniversalExportButton"

import { api } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
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
} from "@/components/ui/dialog"

export function FacturasListContent() {
  const router = useRouter()
  const basePath = useFacturacionBasePath()

  // Estados de control
  const [loading, setLoading] = useState(true)
  const [facturas, setFacturas] = useState<any[]>([])
  const [filteredFacturas, setFilteredFacturas] = useState<any[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("TODOS")
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  // Acciones
  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [facturaToDelete, setFacturaToDelete] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [facturaToAnular, setFacturaToAnular] = useState<any>(null)

  // Multivalidación
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchValidating, setBatchValidating] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchResults, setBatchResults] = useState<{ validated: any[], failed: any[] } | null>(null)

  // Cargar datos
  const loadFacturas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/facturacion/facturas?year=${yearFilter}`)
      if (res.data && res.data.data) {
        setFacturas(res.data.data)
        setFilteredFacturas(res.data.data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Error al cargar las facturas")
    } finally {
      setLoading(false)
    }
  }, [yearFilter])

  useEffect(() => {
    loadFacturas()
  }, [loadFacturas])

  const searchParams = useSearchParams()
  const openPdfId = searchParams.get('openPdf')

  useEffect(() => {
    if (openPdfId && facturas.length > 0) {
      const id = parseInt(openPdfId)
      if (!isNaN(id)) {
        handleOpenPreview(id)
      }
    }
  }, [openPdfId, facturas.length])

  // Filtrado local (búsqueda y estado)
  useEffect(() => {
    let result = facturas

    if (estadoFilter !== "TODOS") {
      result = result.filter(f => f.estado === estadoFilter)
    }

    if (searchTerm) {
      const lowerIds = searchTerm.toLowerCase()
      result = result.filter(f =>
        f.numero?.toLowerCase().includes(lowerIds) ||
        f.cliente_nombre?.toLowerCase().includes(lowerIds) ||
        f.total.toString().includes(lowerIds)
      )
    }

    setFilteredFacturas(result)
  }, [facturas, estadoFilter, searchTerm])


  // --- ACCIONES ---

  const handleValidar = async (id: number) => {
    if (procesandoId) return
    setProcesandoId(id)
    try {
      await api.post(`/admin/facturacion/facturas/${id}/validar`, {
        fecha: new Date().toISOString().split('T')[0]
      })
      toast.success("Factura validada correctamente")
      loadFacturas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al validar la factura")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleGenerarPDF = async (id: number) => {
    if (downloadingId) return
    setDownloadingId(id)

    try {
        await api.get(`/admin/facturacion/facturas/${id}/pdf?action=save`)
        toast.success("PDF Generado y guardado correctamente")
        loadFacturas()
    } catch (error) {
        console.error(error)
        toast.error("Error al generar PDF")
    } finally {
        setDownloadingId(null)
    }
  }

  const handleOpenPreview = async (id: number) => {
      try {
          setProcesandoId(id)
          const res = await api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
          setPreviewUrl(url)
          setIsPreviewOpen(true)
          toast.success("Vista previa generada")
      } catch (e) {
          toast.error("No se pudo cargar la vista previa")
      } finally {
          setProcesandoId(null)
      }
  }

  const handleOpenPDF = (id: number) => {
      api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' })
         .then(res => {
             const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
             window.open(url, '_blank')
             toast.success("Descarga iniciada")
         })
         .catch(() => toast.error("Error al descargar PDF"))
  }

  const handleAnular = async () => {
    if (!facturaToAnular) return
    const id = facturaToAnular.id

    if (procesandoId) return
    setProcesandoId(id)
    try {
      await api.post(`/admin/facturacion/facturas/${id}/anular`, { motivo: "Anulación solicitada desde listado" })
      toast.success("Factura anulada y rectificativa generada")
      setFacturaToAnular(null)
      loadFacturas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al anular")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleDelete = async () => {
    if (!facturaToDelete) return
    setProcesandoId(facturaToDelete.id)
    try {
      await api.delete(`/admin/facturacion/facturas/${facturaToDelete.id}`)
      toast.success("Borrador eliminado")
      loadFacturas()
      setFacturaToDelete(null)
    } catch (error: any) {
      toast.error("No se pudo eliminar")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleConvertirANormal = async (facturaId: number) => {
    setProcesandoId(facturaId)
    try {
      const { data } = await api.post(`/admin/facturacion/facturas/${facturaId}/convertir-a-normal`, {
        fecha: new Date().toISOString().split('T')[0]
      })
      toast.success(data.message || "Proforma convertida a factura normal. Ahora valídala para asignar número oficial.")
      loadFacturas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al convertir proforma")
    } finally {
      setProcesandoId(null)
    }
  }

  // Borradores visibles (para checkbox select-all)
  const borradores = filteredFacturas.filter(f => f.estado === "BORRADOR")

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === borradores.length && borradores.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(borradores.map(f => f.id)))
    }
  }

  const handleBatchValidar = async () => {
    if (selectedIds.size === 0) return
    setBatchValidating(true)
    setBatchResults(null)
    try {
      const res = await api.post("/admin/facturacion/facturas/batch/validar", {
        ids: Array.from(selectedIds),
        fecha: new Date().toISOString().split('T')[0]
      })
      setBatchResults(res.data)
      if (res.data.validated?.length > 0) {
        toast.success(`${res.data.validated.length} facturas validadas correctamente`)
      }
      if (res.data.failed?.length > 0) {
        toast.error(`${res.data.failed.length} facturas con errores`)
      }
      setSelectedIds(new Set())
      loadFacturas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error en la validación en lote")
    } finally {
      setBatchValidating(false)
    }
  }

  // Limpiar selección al cambiar filtros
  useEffect(() => {
    setSelectedIds(new Set())
  }, [estadoFilter, yearFilter, searchTerm])

  return (
    <div className="space-y-6">

      {/* --- HEADER Y FILTROS --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, número..."
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[100px] bg-white cursor-pointer">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()} className="cursor-pointer">{year}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-[140px] bg-white cursor-pointer">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue placeholder="Estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS" className="cursor-pointer">Todos</SelectItem>
              <SelectItem value="VALIDADA" className="cursor-pointer">Validadas</SelectItem>
              <SelectItem value="BORRADOR" className="cursor-pointer">Borradores</SelectItem>
              <SelectItem value="ANULADA" className="cursor-pointer">Anuladas</SelectItem>
            </SelectContent>
          </Select>

          <UniversalExportButton
            module="facturas"
            queryParams={{
                year: yearFilter,
                estado: estadoFilter
            }}
            label="Exportar Listado"
          />
        </div>
      </div>

      {/* --- BARRA FLOTANTE MULTIVALIDACIÓN --- */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "borrador seleccionado" : "borradores seleccionados"}
            </span>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setBatchDialogOpen(true)}
              disabled={batchValidating}
            >
              {batchValidating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileCheck className="w-4 h-4 mr-2" />}
              Validar selección
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancelar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TABLA DE FACTURAS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Tabla — solo desktop */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {borradores.length > 0 && (
              <div className="col-span-1 flex items-center justify-center md:col-span-1">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {selectedIds.size === borradores.length && borradores.length > 0
                    ? <CheckSquare className="w-4 h-4 text-green-600" />
                    : selectedIds.size > 0
                    ? <MinusSquare className="w-4 h-4 text-blue-500" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
              </div>
            )}
            <div className={`col-span-2 ${borradores.length > 0 ? 'md:col-span-1' : 'md:col-span-1'}`}>Estado</div>
            <div className="col-span-3 md:col-span-2">Número / Fecha</div>
            <div className={`col-span-4 ${borradores.length > 0 ? 'md:col-span-2' : 'md:col-span-3'}`}>Cliente</div>
            <div className="col-span-3 md:col-span-1 text-center hidden md:block">Pago</div>
            <div className="col-span-3 md:col-span-2 text-right">Importe</div>
            <div className="col-span-12 md:col-span-3 text-right hidden md:block">Acciones</div>
        </div>

        {loading ? (
           <div className="divide-y divide-slate-100">
             {Array.from({ length: 6 }).map((_, i) => (
               <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                 <Skeleton className="col-span-1 h-4 w-20" />
                 <Skeleton className="col-span-2 h-4" />
                 <Skeleton className="col-span-4 h-4" />
                 <Skeleton className="col-span-1 h-6 w-16 rounded-full" />
                 <Skeleton className="col-span-2 h-4" />
                 <Skeleton className="col-span-2 h-4" />
               </div>
             ))}
           </div>
        ) : filteredFacturas.length === 0 ? (
            <div>
                <EmptyState
                    icon={FileText}
                    title="No se encontraron facturas"
                    description={estadoFilter !== 'TODOS' || searchTerm ? "Prueba a ajustar los filtros de búsqueda." : "Aún no hay facturas registradas."}
                    actionLabel={estadoFilter !== 'TODOS' ? "Limpiar filtros" : undefined}
                    onAction={estadoFilter !== 'TODOS' ? () => setEstadoFilter('TODOS') : undefined}
                />
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                <AnimatePresence>
                    {filteredFacturas.map((factura) => (
                        <FacturaRow
                            key={factura.id}
                            factura={factura}
                            onValidar={() => handleValidar(factura.id)}
                            onAnular={() => setFacturaToAnular(factura)}
                            onDelete={() => setFacturaToDelete(factura)}
                            onEdit={() => router.push(`${basePath}/editar/${factura.id}`)}
                            onConvertir={() => handleConvertirANormal(factura.id)}
                            isProcessing={procesandoId === factura.id}
                            isDownloading={downloadingId === factura.id}
                            isGlobalBusy={!!procesandoId || !!downloadingId || batchValidating}
                            onGenerar={() => handleGenerarPDF(factura.id)}
                            onOpen={() => handleOpenPDF(factura.id)}
                            onPreview={() => handleOpenPreview(factura.id)}
                            basePath={basePath}
                            showCheckbox={borradores.length > 0}
                            isSelected={selectedIds.has(factura.id)}
                            onToggleSelect={() => toggleSelect(factura.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        )}
      </div>

      {/* Diálogo Confirmar Borrado */}
      <AlertDialog open={!!facturaToDelete} onOpenChange={() => setFacturaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La factura en borrador será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={!!procesandoId}
            >
              {procesandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo Confirmar Anulación */}
      <AlertDialog open={!!facturaToAnular} onOpenChange={() => setFacturaToAnular(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
               <FileX className="w-5 h-5" />
               ¿Anular Factura?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se emitirá una factura rectificativa para anular la factura <strong>{facturaToAnular?.numero}</strong>. Esta acción es irreversible y cumplirá con la normativa Veri*Factu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleAnular}
                className="bg-red-600 hover:bg-red-700"
                disabled={!!procesandoId}
            >
              {procesandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Anulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo Multivalidación */}
      <AlertDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Validar {selectedIds.size} {selectedIds.size === 1 ? "factura" : "facturas"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se validarán <strong>{selectedIds.size}</strong> borradores con numeración correlativa.
                  Se generará número oficial, VeriFactu, asiento contable y PDF para cada una.
                </p>
                <p className="text-sm text-amber-600 font-medium">
                  Esta acción no se puede deshacer.
                </p>
                {(() => {
                  const selectedFacturas = facturas.filter(f => selectedIds.has(f.id))
                  const totalImporte = selectedFacturas.reduce((sum: number, f: any) => sum + Number(f.total || 0), 0)
                  return (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Importe total:</span>
                        <span className="font-bold">{formatCurrency(totalImporte)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchValidating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleBatchValidar()
                setBatchDialogOpen(false)
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={batchValidating}
            >
              {batchValidating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar validación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo Resultados Multivalidación */}
      <Dialog open={!!batchResults} onOpenChange={() => setBatchResults(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Resultados de validación
            </DialogTitle>
          </DialogHeader>
          {batchResults && (
            <div className="space-y-4">
              {batchResults.validated.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <CheckCircle className="w-4 h-4" />
                    {batchResults.validated.length} validadas correctamente
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {batchResults.validated.map((v: any) => (
                      <div key={v.id} className="text-xs flex justify-between">
                        <span className="font-mono">{v.numero}</span>
                        <span>{formatCurrency(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {batchResults.failed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                    <XCircle className="w-4 h-4" />
                    {batchResults.failed.length} con errores
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {batchResults.failed.map((f: any) => (
                      <div key={f.id} className="text-xs text-red-600">{f.error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visor de PDF Rápido */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
          if(!open) {
              if(previewUrl) window.URL.revokeObjectURL(previewUrl)
              setPreviewUrl(null)
          }
          setIsPreviewOpen(open)
      }}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-4 border-b bg-slate-50 flex-shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                       <FileText className="w-5 h-5 text-blue-600" />
                       Vista Previa de Factura
                  </DialogTitle>
              </DialogHeader>
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
                  {previewUrl ? (
                      <iframe src={previewUrl} className="w-full h-full rounded shadow-sm bg-white" />
                  ) : (
                      <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                  )}
              </div>
          </DialogContent>
      </Dialog>
    </div>
  )
}

function FacturaRow({ factura, onValidar, onGenerar, onOpen, onPreview, onAnular, onDelete, onEdit, onConvertir, isProcessing, isDownloading, isGlobalBusy, showCheckbox, isSelected, onToggleSelect, basePath }: any) {
    const router = useRouter()
    const isBorrador = factura.estado === "BORRADOR"
    const isValidada = factura.estado === "VALIDADA"
    const isAnulada = factura.estado === "ANULADA"
    const isProforma = factura.tipo_factura === "PROFORMA"
    const isTest = factura.es_test === true || factura.serie === "TEST"

    // Determinar estado de pago
    const pagado = Number(factura.pagado || 0)
    const total = Number(factura.total || 0)
    const estadoPago = factura.estado_pago || (pagado >= total - 0.01 ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente')

    const estadoBadges = (
        <>
            {isBorrador && <Badge variant="secondary" className="bg-slate-100 text-slate-600">Borrador</Badge>}
            {isValidada && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0">Validada</Badge>}
            {isAnulada && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-0">Anulada</Badge>}
            {isTest && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 shadow-none border-0 text-xs">Ficticia</Badge>}
            {isProforma && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-0 text-xs">Proforma</Badge>}
        </>
    )

    const pagoBadge = (
        <>
            {isTest && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0 text-xs">Test</Badge>}
            {isValidada && !isTest && estadoPago === 'pagado' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-0 text-xs">Pagada</Badge>}
            {isValidada && !isTest && estadoPago === 'parcial' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-0 text-xs">Parcial</Badge>}
            {isValidada && !isTest && estadoPago === 'pendiente' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-0 text-xs">Pendiente</Badge>}
        </>
    )

    const actionButtons = (
        <>
            {isBorrador && (
                <>
                    <Button size="sm" variant="ghost" onClick={onEdit} disabled={isGlobalBusy} title="Editar borrador" className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-500" />
                        <span className="text-xs">Editar</span>
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8" onClick={onValidar} disabled={isGlobalBusy}>
                        {isProcessing ? <RefreshCcw className="w-3 h-3 animate-spin" /> : "Validar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete} disabled={isGlobalBusy}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </>
            )}
            {isValidada && (
                <>
                    {factura.storage_record_id ? (
                        <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8 hover:bg-blue-50 text-blue-600 border-blue-200 shadow-sm transition-all active:scale-95" onClick={onPreview} title="Vista Previa Rápida" disabled={isGlobalBusy}>
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                                VER
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500" onClick={onOpen} title="Descargar PDF" disabled={isGlobalBusy}>
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-200 shadow-sm transition-all active:scale-95" onClick={onGenerar} disabled={isGlobalBusy}>
                            {isDownloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                            {isDownloading ? "CREANDO..." : "CREAR PDF"}
                        </Button>
                    )}
                    {isProforma && (
                        <Button size="sm" variant="outline" className="h-8 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border-amber-200 shadow-sm transition-all active:scale-95" onClick={onConvertir} disabled={isGlobalBusy} title="Convertir a factura normal con numeración oficial">
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-1" />}
                            {isProcessing ? "CONVIRTIENDO..." : "A NORMAL"}
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={isGlobalBusy}>
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-xl">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {}} disabled className="cursor-not-allowed opacity-50">
                                <Mail className="w-4 h-4 mr-2" /> Enviar por Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`${basePath}/listado?tab=recurrentes&desde_factura=${factura.id}`)}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Hacer recurrente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={onAnular}>
                                <FileX className="w-4 h-4 mr-2" /> Anular Factura
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
            {isAnulada && (
                <Button size="sm" variant="ghost" disabled>
                    <AlertCircle className="w-4 h-4 mr-2" /> Anulada
                </Button>
            )}
        </>
    )

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ─── Vista MÓVIL: tarjeta ─── */}
            <div className={`md:hidden p-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-green-50' : ''}`}>
                <div className="flex items-start gap-3">
                    {showCheckbox && (
                        <div className="pt-1">
                            {isBorrador ? (
                                <button onClick={onToggleSelect} className="text-slate-400">
                                    {isSelected ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
                                </button>
                            ) : <span className="w-4 inline-block" />}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-sm">{factura.numero || "—"}</span>
                                    {estadoBadges}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <CalendarIcon className="w-3 h-3" />
                                    {format(new Date(factura.fecha), "d MMM yyyy", { locale: es })}
                                </div>
                                <div className="text-sm text-slate-800 truncate mt-1">
                                    {factura.cliente_nombre || <span className="text-slate-400 italic">Cliente sin asignar</span>}
                                </div>
                                {factura.cliente?.nif && (
                                    <div className="text-xs text-slate-500 truncate">{factura.cliente.nif}</div>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <div className="font-bold text-slate-900 text-base">{formatCurrency(factura.total)}</div>
                                <div className="text-[10px] text-slate-500">IVA {formatCurrency(factura.iva_total)}</div>
                                <div className="mt-1">{pagoBadge}</div>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                            {actionButtons}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Vista DESKTOP: grid 12 cols ─── */}
            <div className={`hidden md:grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-green-50 hover:bg-green-50' : ''}`}>
            {/* Checkbox */}
            {showCheckbox && (
              <div className="col-span-1 flex items-center justify-center">
                {isBorrador ? (
                  <button onClick={onToggleSelect} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-green-600" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                ) : (
                  <span className="w-4" />
                )}
              </div>
            )}

            {/* Estado */}
            <div className="col-span-2 md:col-span-1 flex flex-col gap-1">
                <div>
                    {isBorrador && <Badge variant="secondary" className="bg-slate-100 text-slate-600">Borrador</Badge>}
                    {isValidada && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0">Validada</Badge>}
                    {isAnulada && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-0">Anulada</Badge>}
                </div>
                {isTest && (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 shadow-none border-0 text-xs">
                        Ficticia (Test)
                    </Badge>
                )}
                {isProforma && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-0 text-xs">
                        Proforma
                    </Badge>
                )}
            </div>

            {/* Número y Fecha */}
            <div className="col-span-3 md:col-span-2 flex flex-col">
                <span className="font-semibold text-slate-900 text-sm">
                    {factura.numero || "—"}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {format(new Date(factura.fecha), "d MMM yyyy", { locale: es })}
                </span>
            </div>

            {/* Cliente */}
            <div className={`col-span-4 ${showCheckbox ? 'md:col-span-2' : 'md:col-span-3'}`}>
                <div className="font-medium text-slate-800 text-sm truncate">
                    {factura.cliente_nombre || <span className="text-slate-400 italic">Cliente sin asignar</span>}
                </div>
                <div className="text-xs text-slate-500 truncate hidden sm:block">
                    {factura.cliente?.nif || ""}
                </div>
            </div>

            {/* Estado de Pago */}
            <div className="col-span-3 md:col-span-1 hidden md:flex justify-center">
                {isTest && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0 text-xs">
                        Test
                    </Badge>
                )}
                {isValidada && !isTest && (
                    <>
                        {estadoPago === 'pagado' && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-0 text-xs">
                                Pagada
                            </Badge>
                        )}
                        {estadoPago === 'parcial' && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-0 text-xs">
                                Parcial
                            </Badge>
                        )}
                        {estadoPago === 'pendiente' && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-0 text-xs">
                                Pendiente
                            </Badge>
                        )}
                    </>
                )}
                {(isBorrador || isAnulada) && !isTest && (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </div>

            {/* Importe */}
            <div className="col-span-3 md:col-span-2 text-right">
                <div className="font-bold text-slate-900">
                    {formatCurrency(factura.total)}
                </div>
                <div className="text-xs text-slate-500">
                    (incl. {formatCurrency(factura.iva_total)} IVA)
                </div>
            </div>

            {/* Acciones */}
            <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {actionButtons}
            </div>
            </div>
        </motion.div>
    )
}
