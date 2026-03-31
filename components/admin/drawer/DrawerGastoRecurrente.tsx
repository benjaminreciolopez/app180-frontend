"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Loader2,
    Save,
    Receipt,
    CreditCard,
    Tag,
    AlignLeft,
    Building2,
} from "lucide-react";
import { api } from "@/services/api";
import { showSuccess, showError, showInfo } from "@/lib/toast";
import IOSDrawer from "@/components/ui/IOSDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const schema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    proveedor: z.string().optional(),
    descripcion: z.string().optional(),
    base_imponible: z.coerce.number().min(0.01, "La base imponible es obligatoria"),
    iva_porcentaje: z.coerce.number().min(0),
    iva_importe: z.coerce.number().min(0),
    retencion_porcentaje: z.coerce.number().min(0).optional(),
    retencion_importe: z.coerce.number().min(0).optional(),
    total: z.coerce.number().min(0.01, "El total es obligatorio"),
    categoria: z.string().min(1),
    metodo_pago: z.string().min(1),
    cuenta_contable: z.string().optional(),
    dia_ejecucion: z.coerce.number().min(1).max(28),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editing?: any;
    prefillData?: Record<string, string>;
}

const CATEGORIAS = [
    "general", "material", "combustible", "herramientas", "transporte",
    "seguros", "suministros", "alquiler", "telefono", "software",
    "profesionales", "formacion", "publicidad", "limpieza", "autonomo",
    "impuestos", "otros"
];

const METODOS_PAGO = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
    { value: "domiciliacion", label: "Domiciliación" },
    { value: "bizum", label: "Bizum" },
];

export default function DrawerGastoRecurrente({ isOpen, onClose, onSuccess, editing, prefillData }: Props) {
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            nombre: "",
            proveedor: "",
            descripcion: "",
            base_imponible: 0,
            iva_porcentaje: 21,
            iva_importe: 0,
            retencion_porcentaje: 0,
            retencion_importe: 0,
            total: 0,
            categoria: "general",
            metodo_pago: "transferencia",
            cuenta_contable: "",
            dia_ejecucion: 1,
        }
    });

    const baseImponible = watch("base_imponible");
    const ivaPorcentaje = watch("iva_porcentaje");
    const retencionPorcentaje = watch("retencion_porcentaje");

    // Auto-calcular IVA y total
    useEffect(() => {
        if (baseImponible > 0) {
            const ivaImporte = +(baseImponible * (ivaPorcentaje || 0) / 100).toFixed(2);
            const retImporte = +(baseImponible * (retencionPorcentaje || 0) / 100).toFixed(2);
            const total = +(baseImponible + ivaImporte - retImporte).toFixed(2);
            setValue("iva_importe", ivaImporte);
            setValue("retencion_importe", retImporte);
            setValue("total", total);
        }
    }, [baseImponible, ivaPorcentaje, retencionPorcentaje, setValue]);

    // Cargar datos al abrir
    useEffect(() => {
        if (!isOpen) return;

        if (editing) {
            reset({
                nombre: editing.nombre || "",
                proveedor: editing.proveedor || "",
                descripcion: editing.descripcion || "",
                base_imponible: Number(editing.base_imponible) || 0,
                iva_porcentaje: Number(editing.iva_porcentaje) || 21,
                iva_importe: Number(editing.iva_importe) || 0,
                retencion_porcentaje: Number(editing.retencion_porcentaje) || 0,
                retencion_importe: Number(editing.retencion_importe) || 0,
                total: Number(editing.total) || 0,
                categoria: editing.categoria || "general",
                metodo_pago: editing.metodo_pago || "transferencia",
                cuenta_contable: editing.cuenta_contable || "",
                dia_ejecucion: editing.dia_ejecucion || 1,
            });
        } else if (prefillData) {
            reset({
                nombre: prefillData.nombre || "",
                proveedor: prefillData.proveedor || "",
                descripcion: prefillData.descripcion || "",
                base_imponible: Number(prefillData.base_imponible) || 0,
                iva_porcentaje: Number(prefillData.iva_porcentaje) || 21,
                iva_importe: Number(prefillData.iva_importe) || 0,
                retencion_porcentaje: Number(prefillData.retencion_porcentaje) || 0,
                retencion_importe: Number(prefillData.retencion_importe) || 0,
                total: Number(prefillData.total) || 0,
                categoria: prefillData.categoria || "general",
                metodo_pago: prefillData.metodo_pago || "transferencia",
                cuenta_contable: prefillData.cuenta_contable || "",
                dia_ejecucion: 1,
            });
        } else {
            reset({
                nombre: "", proveedor: "", descripcion: "",
                base_imponible: 0, iva_porcentaje: 21, iva_importe: 0,
                retencion_porcentaje: 0, retencion_importe: 0, total: 0,
                categoria: "general", metodo_pago: "transferencia",
                cuenta_contable: "", dia_ejecucion: 1,
            });
        }
    }, [isOpen, editing, prefillData, reset]);

    // Auto-relleno por proveedor
    const handleProveedorBlur = async () => {
        const proveedor = watch("proveedor");
        if (!proveedor?.trim()) return;

        try {
            const res = await api.get("/api/admin/purchases/provider-defaults", {
                params: { proveedor: proveedor.trim() }
            });
            const data = res.data?.data;
            if (data) {
                if (data.categoria) setValue("categoria", data.categoria);
                if (data.metodo_pago) setValue("metodo_pago", data.metodo_pago);
                if (data.iva_porcentaje !== undefined) setValue("iva_porcentaje", Number(data.iva_porcentaje));
                if (data.retencion_porcentaje !== undefined) setValue("retencion_porcentaje", Number(data.retencion_porcentaje));
                if (data.cuenta_contable) setValue("cuenta_contable", data.cuenta_contable);
                showInfo("Datos autocompletados del proveedor");
            }
        } catch {
            // Silencioso si falla
        }
    };

    const onSubmit = async (data: FormValues) => {
        setLoading(true);
        try {
            if (editing) {
                await api.put(`/api/admin/gastos-recurrentes/${editing.id}`, data);
                showSuccess("Gasto recurrente actualizado");
            } else {
                await api.post("/api/admin/gastos-recurrentes", data);
                showSuccess("Gasto recurrente creado");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            showError(error?.response?.data?.error || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <IOSDrawer isOpen={isOpen} onClose={onClose} title={editing ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
                {/* Nombre */}
                <div>
                    <Label className="flex items-center gap-1.5 mb-1">
                        <AlignLeft size={14} /> Nombre *
                    </Label>
                    <Input {...register("nombre")} placeholder="Ej: Cuota autónomo, Alquiler oficina" />
                    {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
                </div>

                {/* Proveedor */}
                <div>
                    <Label className="flex items-center gap-1.5 mb-1">
                        <Building2 size={14} /> Proveedor
                    </Label>
                    <Input {...register("proveedor")} placeholder="Nombre del proveedor" onBlur={handleProveedorBlur} />
                </div>

                {/* Descripción */}
                <div>
                    <Label className="mb-1">Descripción</Label>
                    <Textarea {...register("descripcion")} placeholder="Descripción del gasto" rows={2} />
                </div>

                {/* Importes */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="flex items-center gap-1.5 mb-1">
                            <Receipt size={14} /> Base imponible *
                        </Label>
                        <Input type="number" step="0.01" {...register("base_imponible")} />
                        {errors.base_imponible && <p className="text-xs text-red-500 mt-1">{errors.base_imponible.message}</p>}
                    </div>
                    <div>
                        <Label className="mb-1">IVA %</Label>
                        <Select
                            value={String(watch("iva_porcentaje"))}
                            onValueChange={(v) => setValue("iva_porcentaje", Number(v))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="4">4%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="21">21%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="mb-1">Cuota IVA</Label>
                        <Input type="number" step="0.01" {...register("iva_importe")} readOnly className="bg-muted" />
                    </div>
                    <div>
                        <Label className="mb-1 font-semibold">Total</Label>
                        <Input type="number" step="0.01" {...register("total")} readOnly className="bg-muted font-semibold" />
                        {errors.total && <p className="text-xs text-red-500 mt-1">{errors.total.message}</p>}
                    </div>
                </div>

                {/* Retención */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="mb-1">Retención %</Label>
                        <Input type="number" step="0.01" {...register("retencion_porcentaje")} />
                    </div>
                    <div>
                        <Label className="mb-1">Importe retención</Label>
                        <Input type="number" step="0.01" {...register("retencion_importe")} readOnly className="bg-muted" />
                    </div>
                </div>

                {/* Categoría y método de pago */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="flex items-center gap-1.5 mb-1">
                            <Tag size={14} /> Categoría
                        </Label>
                        <Select
                            value={watch("categoria")}
                            onValueChange={(v) => setValue("categoria", v)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CATEGORIAS.map(c => (
                                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="flex items-center gap-1.5 mb-1">
                            <CreditCard size={14} /> Método de pago
                        </Label>
                        <Select
                            value={watch("metodo_pago")}
                            onValueChange={(v) => setValue("metodo_pago", v)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {METODOS_PAGO.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Día de ejecución */}
                <div>
                    <Label className="mb-1">Día de ejecución automática (1-28)</Label>
                    <Select
                        value={String(watch("dia_ejecucion"))}
                        onValueChange={(v) => setValue("dia_ejecucion", Number(v))}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                <SelectItem key={d} value={String(d)}>Día {d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cuenta contable (oculto, se rellena por proveedor) */}
                <input type="hidden" {...register("cuenta_contable")} />

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                    {editing ? "Guardar cambios" : "Crear gasto recurrente"}
                </Button>
            </form>
        </IOSDrawer>
    );
}
