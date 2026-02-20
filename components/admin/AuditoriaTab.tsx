"use client"

import { useState, useEffect } from "react"
import {
    Calendar,
    Download,
    Filter,
    Search,
    FileJson,
    FileCode,
    ArrowUpDown,
    History,
    Info,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Loader2
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function AuditoriaTab() {
    const [eventos, setEventos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState<string | null>(null)

    // Filtros
    const [fechaDesde, setFechaDesde] = useState("")
    const [fechaHasta, setFechaHasta] = useState("")
    const [tipoEvento, setTipoEvento] = useState("TODOS")
    const [sort, setSort] = useState("desc")

    // Paginación
    const [page, setPage] = useState(0)
    const limit = 20

    useEffect(() => {
        loadEventos()
    }, [fechaDesde, fechaHasta, tipoEvento, sort, page])

    const loadEventos = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString(),
                sort: sort
            })
            if (fechaDesde) params.append("fecha_desde", fechaDesde)
            if (fechaHasta) params.append("fecha_hasta", fechaHasta)
            if (tipoEvento !== "TODOS") params.append("tipo_evento", tipoEvento)

            const res = await api.get(`/admin/facturacion/configuracion/verifactu/eventos?${params.toString()}`)
            setEventos(res.data.data)
        } catch (err) {
            toast.error("Error al cargar logs de auditoría")
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (format: 'xml' | 'json') => {
        try {
            setExporting(format)
            const params = new URLSearchParams()
            if (fechaDesde) params.append("fecha_desde", fechaDesde)
            if (fechaHasta) params.append("fecha_hasta", fechaHasta)
            if (tipoEvento !== "TODOS") params.append("tipo_evento", tipoEvento)

            // Usamos fetch directamente para manejar el blob de descarga mejor
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/facturacion/configuracion/verifactu/eventos/export/${format}?${params.toString()}`

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) throw new Error("Error en la descarga")

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.setAttribute('download', `auditoria_fiscal_${new Date().toISOString().slice(0, 10)}.${format}`)
            document.body.appendChild(link)
            link.click()
            link.remove()

            toast.success(`Log de auditoría exportado en ${format.toUpperCase()}`)
        } catch (err) {
            toast.error("Error al exportar registros")
        } finally {
            setExporting(null)
        }
    }

    const getTipoColor = (tipo: string) => {
        switch (tipo) {
            case 'BACKUP': return 'bg-blue-100 text-blue-700'
            case 'ALTA': return 'bg-green-100 text-green-700'
            case 'ERROR': return 'bg-red-100 text-red-700'
            case 'CAMBIO_CONFIG': return 'bg-amber-100 text-amber-700'
            case 'INICIO_SESION': return 'bg-slate-100 text-slate-700'
            default: return 'bg-slate-100 text-slate-600'
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Registro de Auditoría Fiscal
                            </CardTitle>
                            <CardDescription>
                                Trazabilidad inalterable de eventos del sistema (Reglamento Veri*Factu).
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExport('json')}
                                disabled={exporting !== null}
                            >
                                {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
                                JSON
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleExport('xml')}
                                disabled={exporting !== null}
                            >
                                {exporting === 'xml' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4 mr-2" />}
                                XML (AEAT)
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-slate-500 font-bold">Desde</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="date"
                                    className="pl-9 h-9"
                                    value={fechaDesde}
                                    onChange={(e) => { setFechaDesde(e.target.value); setPage(0); }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-slate-500 font-bold">Hasta</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="date"
                                    className="pl-9 h-9"
                                    value={fechaHasta}
                                    onChange={(e) => { setFechaHasta(e.target.value); setPage(0); }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-slate-500 font-bold">Tipo de Evento</Label>
                            <Select value={tipoEvento} onValueChange={(v) => { setTipoEvento(v); setPage(0); }}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Todos los tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos los eventos</SelectItem>
                                    <SelectItem value="ALTA">Alta de Registro</SelectItem>
                                    <SelectItem value="INICIO_SESION">Inicios de Sesión</SelectItem>
                                    <SelectItem value="CAMBIO_CONFIG">Cambios Configuración</SelectItem>
                                    <SelectItem value="BACKUP">Backups realizados</SelectItem>
                                    <SelectItem value="ERROR">Errores del Sistema</SelectItem>
                                    <SelectItem value="VERSION">Cambios de Versión</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase text-slate-500 font-bold">Orden</Label>
                            <Button
                                variant="outline"
                                className="w-full h-9 justify-between"
                                onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}
                            >
                                <span>{sort === 'asc' ? 'Más antiguos primero' : 'Más recientes primero'}</span>
                                <ArrowUpDown className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-[180px]">Fecha (UTC)</TableHead>
                                    <TableHead className="w-[140px]">Tipo</TableHead>
                                    <TableHead className="w-[150px]">Usuario</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-right">Huella (Hash)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 5 }).map((_, j) => (
                                                <TableCell key={j}><div className="h-4 w-full bg-slate-100 animate-pulse rounded" /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : eventos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500 uppercase text-xs font-medium tracking-wider">
                                            No se han encontrado registros
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    eventos.map((ev) => (
                                        <TableRow key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium text-xs whitespace-nowrap">
                                                {format(new Date(ev.fecha_evento), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("text-[10px] font-bold px-1.5 py-0 border-none shadow-none", getTipoColor(ev.tipo_evento))}>
                                                    {ev.tipo_evento}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {ev.user_nombre || 'Sistema'}
                                            </TableCell>
                                            <TableCell className="text-xs leading-relaxed max-w-sm truncate" title={ev.descripcion}>
                                                {ev.descripcion}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500" title={ev.hash_actual}>
                                                    {ev.hash_actual?.substring(0, 8)}...
                                                </code>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Paginación */}
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-slate-500 italic">
                            * Los registros están encadenados criptográficamente para impedir su manipulación.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={eventos.length < limit || loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-800 uppercase">Información para Inspecciones AEAT</p>
                    <p className="text-[11px] text-amber-700 leading-normal">
                        Este registro contiene la trazabilidad de todos los eventos relevantes según el Artículo 8 del Reglamento Veri*Factu.
                        En caso de inspección, pulse el botón <strong>XML (AEAT)</strong> para generar el fichero requerido por los agentes tributarios.
                        Recuerde que estos registros se incluyen automáticamente en sus copias de seguridad.
                    </p>
                </div>
            </div>
        </div>
    )
}
