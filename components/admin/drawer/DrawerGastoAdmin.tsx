"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Loader2,
    Save,
    Receipt,
    CreditCard,
    Calendar as CalendarIcon,
    Tag,
    AlignLeft,
    Building2,
    Upload,
    FileText,
    Image as ImageIcon,
    Sparkles,
    ExternalLink
} from "lucide-react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
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
import { Badge } from "@/components/ui/badge";

const gastoSchema = z.object({
    proveedor: z.string().optional(),
    descripcion: z.string().min(3, "La descripción es obligatoria"),
    total: z.number().min(0, "El importe debe ser mayor o igual a 0"),
    fecha_compra: z.string().min(10, "La fecha es obligatoria"),
    categoria: z.string().min(1, "La categoría es obligatoria"),
    metodo_pago: z.string().min(1, "El método de pago es obligatorio"),
    base_imponible: z.number().optional(),
    iva_importe: z.number().optional(),
    iva_porcentaje: z.number().optional(),
    document_url: z.string().optional(),
});

type GastoFormValues = z.infer<typeof gastoSchema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingGasto?: any;
}

export default function DrawerGastoAdmin({ isOpen, onClose, onSuccess, editingGasto }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string } | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<GastoFormValues>({
        resolver: zodResolver(gastoSchema),
        defaultValues: {
            categoria: "general",
            metodo_pago: "efectivo",
            fecha_compra: new Date().toISOString().split("T")[0],
        },
    });

    useEffect(() => {
        if (editingGasto) {
            reset({
                proveedor: editingGasto.proveedor || "",
                descripcion: editingGasto.descripcion || "",
                total: Number(editingGasto.total) || 0,
                fecha_compra: editingGasto.fecha_compra ? new Date(editingGasto.fecha_compra).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                categoria: editingGasto.categoria || "general",
                metodo_pago: editingGasto.metodo_pago || "efectivo",
                base_imponible: Number(editingGasto.base_imponible) || 0,
                iva_importe: Number(editingGasto.iva_importe) || 0,
                iva_porcentaje: Number(editingGasto.iva_porcentaje) || 0,
                document_url: editingGasto.document_url || "",
            });
            setUploadedFile(null);
        } else {
            reset({
                categoria: "general",
                metodo_pago: "efectivo",
                fecha_compra: new Date().toISOString().split("T")[0],
                proveedor: "",
                descripcion: "",
                total: 0,
                document_url: "",
            });
            setUploadedFile(null);
        }
    }, [editingGasto, reset]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Aceptar JPG, PNG, PDF
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            showError("Solo se admiten archivos JPG, PNG o PDF");
            return;
        }

        setUploadedFile({ name: file.name, type: file.type });
        setIsOcrProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Llamada al endpoint de OCR (asumiendo estructura backend)
            const res = await api.post("/admin/purchases/ocr", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const ocrData = res.data?.data;
            if (ocrData) {
                if (ocrData.proveedor) setValue("proveedor", ocrData.proveedor);
                if (ocrData.total) setValue("total", Number(ocrData.total));
                if (ocrData.fecha_compra) {
                    try {
                        const date = new Date(ocrData.fecha_compra);
                        if (!isNaN(date.getTime())) {
                            setValue("fecha_compra", date.toISOString().split("T")[0]);
                        }
                    } catch (e) { }
                }
                if (ocrData.descripcion) setValue("descripcion", ocrData.descripcion);
                if (ocrData.document_url) setValue("document_url", ocrData.document_url);

                showSuccess("Datos extraídos correctamente de la factura");
            }
        } catch (error: any) {
            console.error("Error OCR:", error);
            showError("No se pudieron extraer datos automáticamente, por favor rellena el formulario");
        } finally {
            setIsOcrProcessing(false);
        }
    };

    const onSubmit: SubmitHandler<GastoFormValues> = async (data) => {
        setLoading(true);
        try {
            if (editingGasto) {
                await api.put(`/admin/purchases/${editingGasto.id}`, data);
                showSuccess("Gasto actualizado correctamente");
            } else {
                await api.post("/admin/purchases", data);
                showSuccess("Gasto registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            showError(error.response?.data?.error || "Error al guardar el gasto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <IOSDrawer
            open={isOpen}
            onClose={onClose}
            header={{
                title: editingGasto ? "Editar Gasto" : "Nuevo Gasto",
                canGoBack: false,
                onBack: () => { },
                onClose,
            }}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

                {/* Upload Section */}
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Factura / Ticket</Label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`
               border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2
               ${isOcrProcessing ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'}
               ${uploadedFile ? 'bg-green-50/50 border-green-200' : ''}
             `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileUpload}
                        />
                        {isOcrProcessing ? (
                            <>
                                <Loader2 className="animate-spin text-blue-500" size={32} />
                                <p className="text-sm font-semibold text-blue-600">IA procesando factura...</p>
                                <p className="text-xs text-blue-400 text-center px-4">Detectando proveedor, fecha e importes automáticamente</p>
                            </>
                        ) : uploadedFile ? (
                            <>
                                {uploadedFile.type.includes('pdf') ? <FileText size={32} className="text-green-600" /> : <ImageIcon size={32} className="text-green-600" />}
                                <p className="text-sm font-bold text-green-700">{uploadedFile.name}</p>
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Archivo Listo</Badge>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                    <Upload size={20} className="text-slate-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-700">Subir PDF o Imagen</p>
                                    <p className="text-xs text-slate-500">Haz clic para buscar o arrastra aquí</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Gasto</Label>
                        {!editingGasto && !isOcrProcessing && (
                            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                <Sparkles size={10} />
                                AUTORRELLENO IA ACTIVO
                            </div>
                        )}
                    </div>

                    {/* Proveedor */}
                    <div className="space-y-2">
                        <Label htmlFor="proveedor" className="flex items-center gap-2 text-slate-700 font-semibold">
                            <Building2 size={14} className="text-slate-400" />
                            Proveedor
                        </Label>
                        <Input
                            id="proveedor"
                            placeholder="Ej: Amazon, Repsol, Leroy Merlin..."
                            {...register("proveedor")}
                            className="bg-slate-50/10 h-11 rounded-xl"
                        />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label htmlFor="descripcion" className="flex items-center gap-2 text-slate-700 font-semibold">
                            <AlignLeft size={14} className="text-slate-400" />
                            Descripción *
                        </Label>
                        <Textarea
                            id="descripcion"
                            placeholder="¿Qué has comprado?"
                            {...register("descripcion")}
                            className="bg-slate-50/10 resize-none rounded-xl"
                            rows={2}
                        />
                        {errors.descripcion && (
                            <p className="text-xs text-red-500">{errors.descripcion.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Importe Total */}
                        <div className="space-y-2">
                            <Label htmlFor="total" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Receipt size={14} className="text-slate-400" />
                                Importe Total *
                            </Label>
                            <Input
                                id="total"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...register("total", { valueAsNumber: true })}
                                className="bg-slate-50/10 h-11 rounded-xl font-mono text-lg font-black"
                            />
                            {errors.total && (
                                <p className="text-xs text-red-500">{errors.total.message}</p>
                            )}
                        </div>

                        {/* Fecha */}
                        <div className="space-y-2">
                            <Label htmlFor="fecha_compra" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <CalendarIcon size={14} className="text-slate-400" />
                                Fecha *
                            </Label>
                            <Input
                                id="fecha_compra"
                                type="date"
                                {...register("fecha_compra")}
                                className="bg-slate-50/10 h-11 rounded-xl"
                            />
                            {errors.fecha_compra && (
                                <p className="text-xs text-red-500">{errors.fecha_compra.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Categoría */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Tag size={14} className="text-slate-400" />
                                Categoría
                            </Label>
                            <Select
                                value={watch("categoria")}
                                onValueChange={(val) => setValue("categoria", val)}
                            >
                                <SelectTrigger className="bg-slate-50/10 h-11 rounded-xl">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="material">Material</SelectItem>
                                    <SelectItem value="combustible">Combustible</SelectItem>
                                    <SelectItem value="herramientas">Herramientas</SelectItem>
                                    <SelectItem value="oficina">Oficina</SelectItem>
                                    <SelectItem value="otros">Otros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Método de Pago */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-slate-700 font-semibold">
                                <CreditCard size={14} className="text-slate-400" />
                                Pago
                            </Label>
                            <Select
                                value={watch("metodo_pago")}
                                onValueChange={(val) => setValue("metodo_pago", val)}
                            >
                                <SelectTrigger className="bg-slate-50/10 h-11 rounded-xl">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                    <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Link al documento si existe */}
                {watch("document_url") && (
                    <div className="pt-2">
                        <a
                            href={watch("document_url")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <ExternalLink size={14} />
                            VER DOCUMENTO ORIGINAL
                        </a>
                    </div>
                )}

                {/* Footer con botones */}
                <div className="pt-6 border-t flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 rounded-2xl h-12 font-bold"
                        onClick={onClose}
                        disabled={loading || isOcrProcessing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-black text-white hover:bg-slate-800 rounded-2xl h-12 gap-2 font-bold shadow-lg"
                        disabled={loading || isOcrProcessing}
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {editingGasto ? "Guardar Cambios" : "Completar Registro"}
                    </Button>
                </div>
            </form>
        </IOSDrawer>
    );
}
