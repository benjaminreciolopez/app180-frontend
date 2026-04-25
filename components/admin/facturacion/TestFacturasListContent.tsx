"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Eye,
  Download,
  Calendar as CalendarIcon,
  FileText,
  Loader2,
  FlaskConical
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

import { api } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function TestFacturasListContent() {
  const [loading, setLoading] = useState(true)
  const [facturas, setFacturas] = useState<any[]>([])
  const [filteredFacturas, setFilteredFacturas] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [procesandoId, setProcesandoId] = useState<number | null>(null)

  const loadFacturas = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/facturacion/facturas?year=${yearFilter}&es_test=true`)
      if (res.data && res.data.data) {
        setFacturas(res.data.data)
        setFilteredFacturas(res.data.data)
      }
    } catch (error) {
      console.error(error)
      toast.error("Error al cargar las facturas de test")
    } finally {
      setLoading(false)
    }
  }, [yearFilter])

  useEffect(() => {
    loadFacturas()
  }, [loadFacturas])

  useEffect(() => {
    let result = facturas
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(f =>
        f.numero?.toLowerCase().includes(lower) ||
        f.cliente_nombre?.toLowerCase().includes(lower) ||
        f.total.toString().includes(lower)
      )
    }
    setFilteredFacturas(result)
  }, [facturas, searchTerm])

  const handleOpenPreview = async (id: number) => {
    try {
      setProcesandoId(id)
      const res = await api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    } catch (e) {
      toast.error("No se pudo cargar la vista previa")
    } finally {
      setProcesandoId(null)
    }
  }

  const handleDownloadPDF = (id: number) => {
    api.get(`/admin/facturacion/facturas/${id}/pdf`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
        window.open(url, '_blank')
      })
      .catch(() => toast.error("Error al descargar PDF"))
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
        <FlaskConical className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-purple-800">Facturas de prueba (VeriFActu Test)</p>
          <p className="text-xs text-purple-600 mt-1">
            Estas facturas son ficticias, generadas en modo test de VeriFActu. No tienen validez fiscal ni afectan a la numeración oficial ni a cobros/pagos.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, numero..."
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[100px] bg-white cursor-pointer">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <SelectItem key={year} value={year.toString()} className="cursor-pointer">{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-2 md:col-span-1">Estado</div>
          <div className="col-span-3 md:col-span-2">Numero / Fecha</div>
          <div className="col-span-4 md:col-span-4">Cliente</div>
          <div className="col-span-3 md:col-span-2 text-right">Importe</div>
          <div className="col-span-12 md:col-span-3 text-right hidden md:block">Acciones</div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <Skeleton className="col-span-1 h-4 w-20" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-4 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-3 h-4" />
              </div>
            ))}
          </div>
        ) : filteredFacturas.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No hay facturas de test"
            description="No se han generado facturas en modo test de VeriFActu."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredFacturas.map((factura) => {
                const estadoBadge = (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 shadow-none border-0 text-xs">
                    Ficticia
                  </Badge>
                )

                const actionButtons = (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 hover:bg-blue-50 text-blue-600 border-blue-200"
                      onClick={() => handleOpenPreview(factura.id)}
                      disabled={!!procesandoId}
                      title="Vista Previa"
                    >
                      {procesandoId === factura.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                      VER
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-500"
                      onClick={() => handleDownloadPDF(factura.id)}
                      title="Descargar PDF"
                      disabled={!!procesandoId}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </>
                )

                return (
                  <motion.div
                    key={factura.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* ─── Vista MÓVIL: tarjeta ─── */}
                    <div className="md:hidden p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 text-sm">{factura.numero || "--"}</span>
                                {estadoBadge}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(factura.fecha), "d MMM yyyy", { locale: es })}
                              </div>
                              <div className="text-sm text-slate-800 truncate mt-1">
                                {factura.cliente_nombre || <span className="text-slate-400 italic">Cliente sin asignar</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-slate-900 text-base">{formatCurrency(factura.total)}</div>
                              <div className="text-[10px] text-slate-500">IVA {formatCurrency(factura.iva_total)}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                            {actionButtons}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ─── Vista DESKTOP: grid 12 cols ─── */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
                      {/* Estado */}
                      <div className="col-span-2 md:col-span-1 flex flex-col gap-1">
                        {estadoBadge}
                      </div>

                      {/* Numero y Fecha */}
                      <div className="col-span-3 md:col-span-2 flex flex-col">
                        <span className="font-semibold text-slate-900 text-sm">
                          {factura.numero || "--"}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(factura.fecha), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>

                      {/* Cliente */}
                      <div className="col-span-4 md:col-span-4">
                        <div className="font-medium text-slate-800 text-sm truncate">
                          {factura.cliente_nombre || <span className="text-slate-400 italic">Cliente sin asignar</span>}
                        </div>
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
                      <div className="col-span-12 md:col-span-3 flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {actionButtons}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Visor de PDF */}
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
              <FlaskConical className="w-5 h-5 text-purple-600" />
              Vista Previa - Factura Test (Ficticia)
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full rounded shadow-sm bg-white" />
            ) : (
              <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
