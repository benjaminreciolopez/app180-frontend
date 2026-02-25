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
  Download,
  Eye,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  FileText,
  Loader2,
  ArrowRightLeft,
  RotateCcw,
  XCircle
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { api } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProformasListContent() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [proformas, setProformas] = useState<any[]>([])
  const [filteredProformas, setFilteredProformas] = useState<any[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("TODOS")
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  // Modales
  const [proformaToAnular, setProformaToAnular] = useState<any>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [proformaToDelete, setProformaToDelete] = useState<any>(null)
  const [proformaToConvertir, setProformaToConvertir] = useState<any>(null)
  const [numeroConfirmacion, setNumeroConfirmacion] = useState("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const loadProformas = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (yearFilter) params.set("year", yearFilter)
      if (estadoFilter !== "TODOS") params.set("estado", estadoFilter)

      const { data } = await api.get(`/admin/facturacion/proformas?${params.toString()}`)
      setProformas(data.data || [])
    } catch (err) {
      toast.error("Error cargando proformas")
    } finally {
      setLoading(false)
    }
  }, [yearFilter, estadoFilter])

  useEffect(() => {
    loadProformas()
  }, [loadProformas])

  useEffect(() => {
    let result = proformas
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p =>
        (p.cliente_nombre || "").toLowerCase().includes(term) ||
        (p.numero || "").toLowerCase().includes(term)
      )
    }
    setFilteredProformas(result)
  }, [proformas, searchTerm])

  // --- Handlers ---

  const handleAnular = async () => {
    if (!proformaToAnular || !motivoAnulacion.trim()) return
    setProcesandoId(proformaToAnular.id)
    try {
      await api.post(`/admin/facturacion/proformas/${proformaToAnular.id}/anular`, {
        motivo: motivoAnulacion.trim()
      })
      toast.success(`Proforma ${proformaToAnular.numero} anulada`)
      loadProformas()
      setProformaToAnular(null)
      setMotivoAnulacion("")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al anular proforma")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleReactivar = async (proformaId: number) => {
    setProcesandoId(proformaId)
    try {
      const { data } = await api.post(`/admin/facturacion/proformas/${proformaId}/reactivar`)
      toast.success(data.message || "Proforma reactivada")
      loadProformas()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al reactivar")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleConvertir = async () => {
    if (!proformaToConvertir || !numeroConfirmacion.trim()) return
    setProcesandoId(proformaToConvertir.id)
    try {
      const { data } = await api.post(`/admin/facturacion/proformas/${proformaToConvertir.id}/convertir`, {
        numero_confirmacion: numeroConfirmacion.trim(),
        fecha: new Date().toISOString().split('T')[0]
      })
      toast.success(data.message || "Proforma convertida a factura")
      loadProformas()
      setProformaToConvertir(null)
      setNumeroConfirmacion("")
      // Redirigir al listado de facturas para validar
      if (data.factura_id) {
        router.push(`/admin/facturacion/listado`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al convertir")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleDelete = async () => {
    if (!proformaToDelete) return
    setProcesandoId(proformaToDelete.id)
    try {
      await api.delete(`/admin/facturacion/proformas/${proformaToDelete.id}`)
      toast.success("Proforma eliminada")
      loadProformas()
      setProformaToDelete(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error || "No se pudo eliminar")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleGenerarPDF = async (proformaId: number) => {
    setDownloadingId(proformaId)
    try {
      const response = await api.get(`/admin/facturacion/proformas/${proformaId}/pdf?action=save`)
      toast.success("PDF generado correctamente")
      loadProformas()
    } catch (err) {
      toast.error("Error generando PDF")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleOpenPDF = async (proformaId: number) => {
    setDownloadingId(proformaId)
    try {
      const response = await api.get(`/admin/facturacion/proformas/${proformaId}/pdf`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      toast.error("Error abriendo PDF")
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = async (proformaId: number) => {
    setProcesandoId(proformaId)
    try {
      const response = await api.get(`/admin/facturacion/proformas/${proformaId}/pdf`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    } catch (err) {
      toast.error("Error cargando vista previa")
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
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

        <div className="flex items-center gap-2 w-full md:w-auto">
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
              <SelectItem value="TODOS" className="cursor-pointer">Todas</SelectItem>
              <SelectItem value="ACTIVA" className="cursor-pointer">Activas</SelectItem>
              <SelectItem value="ANULADA" className="cursor-pointer">Anuladas</SelectItem>
              <SelectItem value="CONVERTIDA" className="cursor-pointer">Convertidas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => router.push("/admin/facturacion/proformas/crear")}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Proforma
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-2 md:col-span-1">Estado</div>
          <div className="col-span-3 md:col-span-2">Número / Fecha</div>
          <div className="col-span-4 md:col-span-3">Cliente</div>
          <div className="col-span-3 md:col-span-1 text-center hidden md:block">Origen</div>
          <div className="col-span-3 md:col-span-2 text-right">Importe</div>
          <div className="col-span-12 md:col-span-3 text-right hidden md:block">Acciones</div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <Skeleton className="col-span-1 h-4 w-20" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-3 h-4" />
                <Skeleton className="col-span-1 h-6 w-16 rounded-full" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-3 h-4" />
              </div>
            ))}
          </div>
        ) : filteredProformas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No se encontraron proformas"
            description={estadoFilter !== 'TODOS' || searchTerm ? "Prueba a ajustar los filtros." : "Aún no hay proformas creadas."}
            actionLabel="Nueva Proforma"
            onAction={() => router.push("/admin/facturacion/proformas/crear")}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredProformas.map((proforma) => (
                <ProformaRow
                  key={proforma.id}
                  proforma={proforma}
                  onEdit={() => router.push(`/admin/facturacion/proformas/editar/${proforma.id}`)}
                  onAnular={() => setProformaToAnular(proforma)}
                  onReactivar={() => handleReactivar(proforma.id)}
                  onConvertir={() => setProformaToConvertir(proforma)}
                  onDelete={() => setProformaToDelete(proforma)}
                  onGenerarPDF={() => handleGenerarPDF(proforma.id)}
                  onOpenPDF={() => handleOpenPDF(proforma.id)}
                  onPreview={() => handlePreview(proforma.id)}
                  isProcessing={procesandoId === proforma.id}
                  isDownloading={downloadingId === proforma.id}
                  isGlobalBusy={!!procesandoId || !!downloadingId}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Anular */}
      <AlertDialog open={!!proformaToAnular} onOpenChange={() => { setProformaToAnular(null); setMotivoAnulacion("") }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Anular Proforma {proformaToAnular?.numero}
            </AlertDialogTitle>
            <AlertDialogDescription>
              La proforma quedará anulada permanentemente. Podrás reactivarla después si lo necesitas (se creará una nueva copia).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700">Motivo de anulación *</label>
            <Textarea
              placeholder="Escribe el motivo de la anulación..."
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAnular}
              className="bg-red-600 hover:bg-red-700"
              disabled={!motivoAnulacion.trim() || !!procesandoId}
            >
              {procesandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Anular Proforma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Eliminar */}
      <AlertDialog open={!!proformaToDelete} onOpenChange={() => setProformaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proforma?</AlertDialogTitle>
            <AlertDialogDescription>
              La proforma <strong>{proformaToDelete?.numero}</strong> será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={!!procesandoId}>
              {procesandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Convertir a Factura (2FA) */}
      <Dialog open={!!proformaToConvertir} onOpenChange={() => { setProformaToConvertir(null); setNumeroConfirmacion("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <ArrowRightLeft className="w-5 h-5" />
              Convertir a Factura Oficial
            </DialogTitle>
            <DialogDescription>
              La proforma <strong>{proformaToConvertir?.numero}</strong> se convertirá en una factura normal.
              Se creará un borrador de factura que deberás validar para asignarle número oficial.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Para confirmar, escribe el número de la proforma: <strong>{proformaToConvertir?.numero}</strong>
            </div>
            <Input
              placeholder="Escribe el número PRO-YYYY-XXXXXX"
              value={numeroConfirmacion}
              onChange={(e) => setNumeroConfirmacion(e.target.value)}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProformaToConvertir(null); setNumeroConfirmacion("") }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConvertir}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={
                !numeroConfirmacion.trim() ||
                numeroConfirmacion.trim().toUpperCase() !== proformaToConvertir?.numero?.trim().toUpperCase() ||
                !!procesandoId
              }
            >
              {procesandoId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              Convertir a Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        if (!open) {
          if (previewUrl) window.URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        setIsPreviewOpen(open)
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-slate-50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Vista Previa de Proforma
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full rounded shadow-sm bg-white" />
            ) : (
              <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- ROW COMPONENT ---

function ProformaRow({ proforma, onEdit, onAnular, onReactivar, onConvertir, onDelete, onGenerarPDF, onOpenPDF, onPreview, isProcessing, isDownloading, isGlobalBusy }: any) {
  const isActiva = proforma.estado === "ACTIVA"
  const isAnulada = proforma.estado === "ANULADA"
  const isConvertida = proforma.estado === "CONVERTIDA"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group"
    >
      {/* Estado */}
      <div className="col-span-2 md:col-span-1">
        {isActiva && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-0">Activa</Badge>}
        {isAnulada && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-0">Anulada</Badge>}
        {isConvertida && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 shadow-none border-0">Convertida</Badge>}
      </div>

      {/* Número y Fecha */}
      <div className="col-span-3 md:col-span-2 flex flex-col">
        <span className="font-semibold text-slate-900 text-sm font-mono">
          {proforma.numero || "—"}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {format(new Date(proforma.fecha), "d MMM yyyy", { locale: es })}
        </span>
      </div>

      {/* Cliente */}
      <div className="col-span-4 md:col-span-3">
        <div className="font-medium text-slate-800 text-sm truncate">
          {proforma.cliente_nombre || <span className="text-slate-400 italic">Cliente sin asignar</span>}
        </div>
      </div>

      {/* Origen (si es reactivada) */}
      <div className="col-span-3 md:col-span-1 hidden md:flex justify-center">
        {proforma.proforma_origen_numero ? (
          <span className="text-xs text-slate-500 font-mono" title={`Reactivada desde ${proforma.proforma_origen_numero}`}>
            {proforma.proforma_origen_numero}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>

      {/* Importe */}
      <div className="col-span-3 md:col-span-2 text-right">
        <div className="font-bold text-slate-900">
          {formatCurrency(proforma.total)}
        </div>
        <div className="text-xs text-slate-500">
          (incl. {formatCurrency(proforma.iva_total)} IVA)
        </div>
      </div>

      {/* Acciones */}
      <div className="col-span-12 md:col-span-3 flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">

        {/* ACTIVA: Editar, PDF, Anular, Convertir */}
        {isActiva && (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit} disabled={isGlobalBusy} title="Editar proforma">
              <Eye className="w-4 h-4 text-slate-500 mr-1" />
              <span className="text-xs">Editar</span>
            </Button>

            {proforma.ruta_pdf ? (
              <div className="flex gap-1">
                <Button
                  size="sm" variant="outline"
                  className="h-8 hover:bg-amber-50 text-amber-600 border-amber-200"
                  onClick={onPreview} disabled={isGlobalBusy} title="Vista previa"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                  VER
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onOpenPDF} disabled={isGlobalBusy} title="Descargar">
                  <Download className="w-4 h-4 text-slate-500" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm" variant="outline"
                className="h-8 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border-amber-200"
                onClick={onGenerarPDF} disabled={isGlobalBusy}
              >
                {isDownloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                {isDownloading ? "CREANDO..." : "PDF"}
              </Button>
            )}

            <MoreActionsMenu
              onConvertir={onConvertir}
              onAnular={onAnular}
              onDelete={onDelete}
              isGlobalBusy={isGlobalBusy}
            />
          </>
        )}

        {/* ANULADA: Reactivar */}
        {isAnulada && (
          <Button
            size="sm" variant="outline"
            className="h-8 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white border-orange-200"
            onClick={onReactivar} disabled={isGlobalBusy}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
            Reactivar
          </Button>
        )}

        {/* CONVERTIDA: Solo info */}
        {isConvertida && (
          <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200">
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Factura creada
          </Badge>
        )}
      </div>
    </motion.div>
  )
}

function MoreActionsMenu({ onConvertir, onAnular, onDelete, isGlobalBusy }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={isGlobalBusy}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 shadow-xl">
        <DropdownMenuItem className="cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50" onClick={onConvertir}>
          <ArrowRightLeft className="w-4 h-4 mr-2" /> Convertir a Factura
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={onAnular}>
          <XCircle className="w-4 h-4 mr-2" /> Anular Proforma
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
