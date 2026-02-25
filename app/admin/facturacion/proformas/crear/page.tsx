"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Calculator,
  Search,
  Check,
  Loader2,
  Edit
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/services/api"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Linea {
  id: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva: number
  concepto_id?: number | null
}

interface Cliente {
  id: number
  nombre: string
  nif: string
  telefono?: string
  email?: string
  direccion?: string
  poblacion?: string
  provincia?: string
  cp?: string
  nif_cif?: string
  iva_defecto?: number | null
  exento_iva?: boolean
  texto_exento?: string
  aplicar_retencion?: boolean
  retencion_tipo?: number
}

export default function CrearProformaPage() {
  const router = useRouter()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)

  const [clienteId, setClienteId] = useState<number | null>(null)
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0])
  const [lineas, setLineas] = useState<Linea[]>([
    { id: Date.now(), descripcion: "", cantidad: 1, precio_unitario: 0, iva: 21 }
  ])
  const [mensajeIva, setMensajeIva] = useState("")
  const [metodoPago, setMetodoPago] = useState<"TRANSFERENCIA" | "CONTADO">("TRANSFERENCIA")
  const [ivaGlobal, setIvaGlobal] = useState(21)
  const [retencionPorcentaje, setRetencionPorcentaje] = useState(0)
  const [saving, setSaving] = useState(false)
  const [clienteOpen, setClienteOpen] = useState(false)

  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true)
      try {
        const res = await api.get('/admin/clientes')
        const data = res.data.data || (Array.isArray(res.data) ? res.data : [])
        setClientes(data)
      } finally {
        setLoadingClientes(false)
      }
    }
    fetchClientes()
  }, [])

  // --- Lineas management ---
  const addLinea = () => {
    setLineas([...lineas, { id: Date.now(), descripcion: "", cantidad: 1, precio_unitario: 0, iva: ivaGlobal }])
  }

  const removeLinea = (id: number) => {
    if (lineas.length <= 1) return
    setLineas(lineas.filter(l => l.id !== id))
  }

  const updateLinea = (id: number, field: keyof Linea, value: any) => {
    setLineas(lineas.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  // --- Cálculos ---
  const subtotal = lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unitario), 0)
  const ivaTotal = lineas.reduce((acc, l) => {
    const base = l.cantidad * l.precio_unitario
    return acc + (base * l.iva / 100)
  }, 0)
  const retencionImporte = (subtotal * retencionPorcentaje) / 100
  const total = subtotal + ivaTotal - retencionImporte

  const handleSubmit = async () => {
    if (!clienteId) {
      toast.error("Debes seleccionar un cliente")
      return
    }
    if (lineas.some(l => !l.descripcion.trim())) {
      toast.error("Todas las líneas deben tener descripción")
      return
    }

    setSaving(true)
    try {
      const payload = {
        cliente_id: clienteId,
        fecha,
        iva_global: ivaGlobal,
        mensaje_iva: mensajeIva,
        metodo_pago: metodoPago,
        retencion_porcentaje: retencionPorcentaje,
        lineas: lineas.map(({ id, ...rest }) => rest),
      }

      const res = await api.post('/admin/facturacion/proformas', payload)
      toast.success(res.data.message || "Proforma creada correctamente")
      router.push('/admin/facturacion/proformas')
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al crear proforma")
    } finally {
      setSaving(false)
    }
  }

  if (loadingClientes) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nueva Proforma</h1>
            <p className="text-sm text-slate-500">Presupuesto sin numeración oficial</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || !clienteId}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8 h-12"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Crear Proforma
        </Button>
      </div>

      {/* Datos principales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos de la proforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-white h-12 cursor-pointer"
                >
                  {clienteId
                    ? clientes.find(c => c.id === clienteId)?.nombre
                    : <span className="text-slate-400">Seleccionar cliente...</span>}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {clientes.map(cliente => (
                      <CommandItem
                        key={cliente.id}
                        value={cliente.nombre}
                        onSelect={() => {
                          setClienteId(cliente.id)
                          setClienteOpen(false)
                          if (cliente.exento_iva && cliente.texto_exento) {
                            setMensajeIva(cliente.texto_exento)
                          }
                          if (cliente.aplicar_retencion) {
                            setRetencionPorcentaje(cliente.retencion_tipo || 0)
                          } else {
                            setRetencionPorcentaje(0)
                          }
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", clienteId === cliente.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{cliente.nombre}</span>
                          <span className="text-xs text-slate-500">{cliente.nif} {cliente.telefono ? `• ${cliente.telefono}` : ''}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Detalles cliente */}
          {clienteId && (() => {
            const c = clientes.find(cl => cl.id === clienteId)
            if (!c) return null
            return (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-700">Datos de Facturación:</div>
                <div><span className="font-medium">NIF:</span> {c.nif || c.nif_cif || '—'}</div>
                <div><span className="font-medium">Dirección:</span> {[c.direccion, c.cp, c.poblacion, c.provincia].filter(Boolean).join(', ') || '—'}</div>
              </div>
            )
          })()}

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha de Emisión</Label>
            <div className="relative">
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-white h-12" />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={(v: any) => setMetodoPago(v)}>
                <SelectTrigger className="h-12 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="CONTADO">Contado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Retención */}
            <div className="space-y-2">
              <Label>Retención IRPF (%)</Label>
              <Input
                type="number" min={0} max={100} step={0.5}
                value={retencionPorcentaje}
                onChange={(e) => setRetencionPorcentaje(parseFloat(e.target.value) || 0)}
                className="bg-white h-12"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Líneas</CardTitle>
          <Button size="sm" variant="outline" onClick={addLinea}>
            <Plus className="w-4 h-4 mr-1" /> Añadir línea
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-1">
              <div className="col-span-5">Descripción</div>
              <div className="col-span-1 text-center">Cant.</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-1 text-center">IVA %</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-1"></div>
            </div>

            {lineas.map(linea => {
              const base = linea.cantidad * linea.precio_unitario
              const lineaIva = base * linea.iva / 100
              return (
                <div key={linea.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg p-2">
                  <div className="col-span-5">
                    <Input
                      placeholder="Descripción del servicio..."
                      value={linea.descripcion}
                      onChange={(e) => updateLinea(linea.id, 'descripcion', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number" min={0} step={0.01}
                      value={linea.cantidad}
                      onChange={(e) => updateLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                      className="bg-white text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number" min={0} step={0.01}
                      value={linea.precio_unitario}
                      onChange={(e) => updateLinea(linea.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      className="bg-white text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number" min={0} max={100} step={1}
                      value={linea.iva}
                      onChange={(e) => updateLinea(linea.id, 'iva', parseFloat(e.target.value) || 0)}
                      className="bg-white text-center"
                    />
                  </div>
                  <div className="col-span-2 text-right font-semibold text-sm text-slate-900 pr-2">
                    {formatCurrency(base + lineaIva)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeLinea(linea.id)}
                      disabled={lineas.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mensaje IVA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Nota o mensaje de IVA (ej: exención, inversión sujeto pasivo...)"
            value={mensajeIva}
            onChange={(e) => setMensajeIva(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">IVA</span>
                <span className="font-medium">{formatCurrency(ivaTotal)}</span>
              </div>
              {retencionPorcentaje > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Retención ({retencionPorcentaje}%)</span>
                  <span>-{formatCurrency(retencionImporte)}</span>
                </div>
              )}
              <div className="border-t border-amber-300 pt-2 flex justify-between text-lg font-bold">
                <span className="text-slate-900">Total</span>
                <span className="text-amber-700">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
