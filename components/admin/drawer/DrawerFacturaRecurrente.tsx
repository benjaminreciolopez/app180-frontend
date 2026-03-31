"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Search,
  Check,
  FileText,
} from "lucide-react"
import { api } from "@/services/api"
import { showSuccess, showError } from "@/lib/toast"
import { formatCurrency, cn } from "@/lib/utils"
import IOSDrawer from "@/components/ui/IOSDrawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  CommandList,
} from "@/components/ui/command"

const lineaSchema = z.object({
  descripcion: z.string().min(1, "Requerido"),
  cantidad: z.coerce.number().min(0.01, "Min 0.01"),
  precio_unitario: z.coerce.number().min(0),
  iva: z.coerce.number().min(0),
})

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  cliente_id: z.string().min(1, "Selecciona un cliente"),
  iva_global: z.coerce.number().min(0),
  mensaje_iva: z.string().optional(),
  metodo_pago: z.string().min(1),
  retencion_porcentaje: z.coerce.number().min(0),
  dia_generacion: z.coerce.number().min(1).max(28),
  lineas: z.array(lineaSchema).min(1, "Añade al menos una línea"),
})

type FormValues = z.infer<typeof schema>

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editing?: any
}

type Cliente = {
  id: string
  nombre: string
  nif: string
}

export default function DrawerFacturaRecurrente({ isOpen, onClose, onSuccess, editing }: Props) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteOpen, setClienteOpen] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nombre: "",
      cliente_id: "",
      iva_global: 21,
      mensaje_iva: "",
      metodo_pago: "TRANSFERENCIA",
      retencion_porcentaje: 0,
      dia_generacion: 1,
      lineas: [{ descripcion: "", cantidad: 1, precio_unitario: 0, iva: 21 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "lineas" })
  const lineas = watch("lineas")
  const clienteId = watch("cliente_id")
  const ivaGlobal = watch("iva_global")
  const retencionPct = watch("retencion_porcentaje")

  // Calculate totals
  const subtotal = lineas.reduce((sum, l) => sum + (l.cantidad || 0) * (l.precio_unitario || 0), 0)
  const ivaTotal = lineas.reduce((sum, l) => {
    const base = (l.cantidad || 0) * (l.precio_unitario || 0)
    return sum + base * (l.iva || 0) / 100
  }, 0)
  const retencionImporte = subtotal * (retencionPct || 0) / 100
  const total = subtotal + ivaTotal - retencionImporte

  // Fetch clients
  useEffect(() => {
    if (!isOpen) return
    api.get("/admin/clientes").then((res) => {
      const data = res.data.data || (Array.isArray(res.data) ? res.data : [])
      setClientes(data)
    }).catch(() => {})
  }, [isOpen])

  // Load editing data
  useEffect(() => {
    if (!isOpen) return

    if (editing) {
      const lineas = typeof editing.lineas === "string" ? JSON.parse(editing.lineas) : editing.lineas
      reset({
        nombre: editing.nombre || "",
        cliente_id: String(editing.cliente_id || ""),
        iva_global: Number(editing.iva_global) || 21,
        mensaje_iva: editing.mensaje_iva || "",
        metodo_pago: editing.metodo_pago || "TRANSFERENCIA",
        retencion_porcentaje: Number(editing.retencion_porcentaje) || 0,
        dia_generacion: editing.dia_generacion || 1,
        lineas: Array.isArray(lineas) && lineas.length > 0
          ? lineas.map((l: any) => ({
              descripcion: l.descripcion || "",
              cantidad: Number(l.cantidad) || 1,
              precio_unitario: Number(l.precio_unitario) || 0,
              iva: Number(l.iva) || 21,
            }))
          : [{ descripcion: "", cantidad: 1, precio_unitario: 0, iva: 21 }],
      })
    } else {
      reset({
        nombre: "",
        cliente_id: "",
        iva_global: 21,
        mensaje_iva: "",
        metodo_pago: "TRANSFERENCIA",
        retencion_porcentaje: 0,
        dia_generacion: 1,
        lineas: [{ descripcion: "", cantidad: 1, precio_unitario: 0, iva: 21 }],
      })
    }
  }, [isOpen, editing, reset])

  // Sync IVA global to new lines
  const handleAddLine = () => {
    append({ descripcion: "", cantidad: 1, precio_unitario: 0, iva: ivaGlobal || 21 })
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      if (editing) {
        await api.put(`/admin/facturacion/recurrentes/${editing.id}`, data)
        showSuccess("Plantilla actualizada")
      } else {
        await api.post("/admin/facturacion/recurrentes", data)
        showSuccess("Plantilla creada")
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      showError(error?.response?.data?.error || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const selectedCliente = clientes.find((c) => String(c.id) === clienteId)

  return (
    <IOSDrawer
      open={isOpen}
      onClose={onClose}
      header={{
        title: editing ? "Editar plantilla recurrente" : "Nueva plantilla recurrente",
        canGoBack: false,
        onBack: () => {},
        onClose,
      }}
      width="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-4">
        {/* Nombre */}
        <div>
          <Label className="mb-1.5 block">Nombre de la plantilla *</Label>
          <Input {...register("nombre")} placeholder="Ej: Mensualidad Empresa X" />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>

        {/* Cliente selector */}
        <div>
          <Label className="mb-1.5 block">Cliente *</Label>
          <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-white h-10 cursor-pointer"
              >
                {selectedCliente
                  ? selectedCliente.nombre
                  : <span className="text-slate-400">Seleccionar cliente...</span>}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandEmpty>No encontrado.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {clientes.map((cliente) => (
                    <CommandItem
                      key={cliente.id}
                      value={cliente.nombre}
                      onSelect={() => {
                        setValue("cliente_id", String(cliente.id))
                        setClienteOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          clienteId === String(cliente.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{cliente.nombre}</span>
                        <span className="text-xs text-slate-500">{cliente.nif}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.cliente_id && <p className="text-xs text-red-500 mt-1">{errors.cliente_id.message}</p>}
        </div>

        {/* Config row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="mb-1.5 block">IVA global %</Label>
            <Select value={String(ivaGlobal)} onValueChange={(v) => setValue("iva_global", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="4">4%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="21">21%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Método de pago</Label>
            <Select value={watch("metodo_pago")} onValueChange={(v) => setValue("metodo_pago", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="DOMICILIACION">Domiciliación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Día generación</Label>
            <Select value={String(watch("dia_generacion"))} onValueChange={(v) => setValue("dia_generacion", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>Día {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Retención */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">Retención IRPF %</Label>
            <Input type="number" step="0.01" {...register("retencion_porcentaje")} />
          </div>
          <div>
            <Label className="mb-1.5 block">Mensaje IVA (opcional)</Label>
            <Input {...register("mensaje_iva")} placeholder="Ej: IVA exento art. 20" />
          </div>
        </div>

        {/* Líneas de concepto */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Líneas de factura
            </Label>
            <Button type="button" size="sm" variant="outline" onClick={handleAddLine}>
              <Plus className="w-3 h-3 mr-1" /> Añadir línea
            </Button>
          </div>

          {errors.lineas && typeof errors.lineas === "object" && "message" in errors.lineas && (
            <p className="text-xs text-red-500 mb-2">{errors.lineas.message as string}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const lineBase = (lineas[index]?.cantidad || 0) * (lineas[index]?.precio_unitario || 0)
              const lineIva = lineBase * (lineas[index]?.iva || 0) / 100
              const lineTotal = lineBase + lineIva

              return (
                <div key={field.id} className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        {...register(`lineas.${index}.descripcion`)}
                        placeholder="Descripción del concepto"
                        className="bg-white"
                      />
                      {errors.lineas?.[index]?.descripcion && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.lineas[index]?.descripcion?.message}</p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 h-9 w-9 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Cantidad</Label>
                      <Input type="number" step="0.01" {...register(`lineas.${index}.cantidad`)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Precio unit.</Label>
                      <Input type="number" step="0.01" {...register(`lineas.${index}.precio_unitario`)} className="bg-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">IVA %</Label>
                      <Select
                        value={String(lineas[index]?.iva ?? ivaGlobal)}
                        onValueChange={(v) => setValue(`lineas.${index}.iva`, Number(v))}
                      >
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="4">4%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-semibold text-slate-700 pb-2">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Totales */}
        <div className="bg-slate-100 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">IVA</span>
            <span>{formatCurrency(ivaTotal)}</span>
          </div>
          {retencionImporte > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Retención ({retencionPct}%)</span>
              <span className="text-red-600">-{formatCurrency(retencionImporte)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total estimado</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
          {editing ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </form>
    </IOSDrawer>
  )
}
