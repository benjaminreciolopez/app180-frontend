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
    ExternalLink,
    ChevronRight,
    RotateCcw,
    AlertTriangle
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

const gastoSchema = z.object({
    proveedor: z.string().optional(),
    descripcion: z.string().min(3, "La descripción es obligatoria"),
    total: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
    fecha_compra: z.string().min(10, "La fecha es obligatoria"),
    categoria: z.string().min(1, "La categoría es obligatoria"),
    metodo_pago: z.string().min(1, "El método de pago es obligatorio"),
    base_imponible: z.coerce.number().min(0.01, "La Base Imponible es obligatoria para fiscalidad"),
    iva_importe: z.coerce.number().min(0, "La Cuota de IVA es obligatoria"),
    iva_porcentaje: z.coerce.number().min(0, "El porcentaje de IVA es obligatorio"),
    retencion_porcentaje: z.coerce.number().min(0).optional(),
    retencion_importe: z.coerce.number().min(0).optional(),
    numero_factura: z.string().optional(),
    documento_url: z.string().optional(),
    anio: z.coerce.number().optional(),
    trimestre: z.coerce.number().optional(),
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
    const [ocrPreviewData, setOcrPreviewData] = useState<any>(null);
    const [invoicesToReview, setInvoicesToReview] = useState<any[]>([]);
    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);
    const [lastSavedDocumentUrl, setLastSavedDocumentUrl] = useState<string | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        watch,
        formState: { errors },
    } = useForm<any>({
        resolver: zodResolver(gastoSchema),
        defaultValues: {
            categoria: "general",
            metodo_pago: "efectivo",
            fecha_compra: new Date().toISOString().split("T")[0],
            iva_porcentaje: 21,
            base_imponible: 0,
            iva_importe: 0,
            retencion_porcentaje: 0,
            retencion_importe: 0,
            total: 0
        },
    });

    const watchedBase = watch("base_imponible");
    const watchedIvaPct = watch("iva_porcentaje");
    const watchedRetencionPct = watch("retencion_porcentaje");
    const watchedTotal = watch("total");

    // Flag para evitar loop infinito entre los dos useEffects
    const calcDirection = useRef<"from_base" | "from_total" | null>(null);

    // Lógica de cálculo automático: Base + IVA % + Retención % -> Total, IVA Importe y Retención Importe
    useEffect(() => {
        if (calcDirection.current === "from_total") {
            calcDirection.current = null;
            return;
        }
        if (typeof watchedBase === 'number' && typeof watchedIvaPct === 'number') {
            const ivaImp = Number((watchedBase * (watchedIvaPct / 100)).toFixed(2));
            const retencionPct = watchedRetencionPct || 0;
            const retencionImp = Number((watchedBase * (retencionPct / 100)).toFixed(2));
            const newTotal = Number((watchedBase + ivaImp - retencionImp).toFixed(2));

            calcDirection.current = "from_base";
            setValue("iva_importe", ivaImp);
            setValue("retencion_importe", retencionImp);
            setValue("total", newTotal);
        }
    }, [watchedBase, watchedIvaPct, watchedRetencionPct, setValue]);

    // Lógica de cálculo inverso: Total -> Base, IVA Importe y Retención Importe
    useEffect(() => {
        if (calcDirection.current === "from_base") {
            calcDirection.current = null;
            return;
        }
        if (typeof watchedTotal === 'number' && typeof watchedIvaPct === 'number' && watchedTotal > 0) {
            const retencionPct = watchedRetencionPct || 0;
            const base = Number((watchedTotal / (1 + watchedIvaPct / 100 - retencionPct / 100)).toFixed(2));
            const ivaImp = Number((base * (watchedIvaPct / 100)).toFixed(2));
            const retencionImp = Number((base * (retencionPct / 100)).toFixed(2));

            calcDirection.current = "from_total";
            setValue("base_imponible", base);
            setValue("iva_importe", ivaImp);
            setValue("retencion_importe", retencionImp);
        }
    }, [watchedTotal, watchedIvaPct, watchedRetencionPct, setValue]);

    const [categories, setCategories] = useState<string[]>(["general", "material", "combustible", "herramientas", "oficina"]);
    const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const [paymentMethods, setPaymentMethods] = useState<string[]>(["efectivo", "tarjeta", "transferencia", "domiciliacion"]);
    const [isNewPaymentMethodOpen, setIsNewPaymentMethodOpen] = useState(false);
    const [newPaymentMethodName, setNewPaymentMethodName] = useState("");

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const rawDocUrl = watch("documento_url");

    // URL via Proxy Backend para evitar exponer credenciales o requerir env vars en frontend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

    // Obtener token para autenticar la petición del proxy
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

    const docUrl = rawDocUrl?.startsWith("http")
        ? rawDocUrl
        : rawDocUrl
            ? `${apiUrl}/api/admin/purchases/proxy?path=${encodeURIComponent(rawDocUrl)}&token=${token}`
            : "";

    // Determinar tipo por extensión del archivo original
    const isPdf = rawDocUrl?.toLowerCase().endsWith(".pdf");

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) return;
        const normalized = newCategoryName.trim().toLowerCase();
        if (!categories.includes(normalized)) {
            setCategories(prev => [...prev, normalized]);
        }
        setValue("categoria", normalized);
        setIsNewCategoryOpen(false);
        setNewCategoryName("");
    };

    const handleCreatePaymentMethod = () => {
        if (!newPaymentMethodName.trim()) return;
        const normalized = newPaymentMethodName.trim().toLowerCase();
        if (!paymentMethods.includes(normalized)) {
            setPaymentMethods(prev => [...prev, normalized]);
        }
        setValue("metodo_pago", normalized);
        setIsNewPaymentMethodOpen(false);
        setNewPaymentMethodName("");
    };

    useEffect(() => {
        if (isOpen) {
            // Cargar categorías existentes
            api.get("/api/admin/purchases/values?field=categoria")
                .then(res => {
                    const dbValues = res.data?.data || [];
                    const unique = Array.from(new Set([...categories, ...dbValues]));
                    setCategories(unique);
                })
                .catch(err => console.error("Error cargando categorías", err));

            // Cargar métodos de pago existentes
            api.get("/api/admin/purchases/values?field=metodo_pago")
                .then(res => {
                    const dbValues = res.data?.data || [];
                    const unique = Array.from(new Set([...paymentMethods, ...dbValues]));
                    setPaymentMethods(unique);
                })
                .catch(err => console.error("Error cargando métodos pago", err));
        }

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
                iva_porcentaje: Number(editingGasto.iva_porcentaje) || 21,
                retencion_porcentaje: Number(editingGasto.retencion_porcentaje) || 0,
                retencion_importe: Number(editingGasto.retencion_importe) || 0,
                numero_factura: editingGasto.numero_factura || "",
                documento_url: editingGasto.documento_url || "",
            });
            setUploadedFile(null);
            setSelectedFileObj(null);
            setLastSavedDocumentUrl(null);
            setInvoicesToReview([]);
            setCurrentInvoiceIndex(0);
        } else {
            reset({
                categoria: "general",
                metodo_pago: "efectivo",
                fecha_compra: new Date().toISOString().split("T")[0],
                proveedor: "",
                descripcion: "",
                total: 0,
                base_imponible: 0,
                iva_porcentaje: 21,
                iva_importe: 0,
                retencion_porcentaje: 0,
                retencion_importe: 0,
                numero_factura: "",
                documento_url: "",
            });
            setUploadedFile(null);
            setSelectedFileObj(null);
            setLastSavedDocumentUrl(null);
            setInvoicesToReview([]);
            setCurrentInvoiceIndex(0);
        }
    }, [isOpen, editingGasto, reset]);

    const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);

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
        setSelectedFileObj(file); // Guardar el objeto File para envío posterior
        setIsOcrProcessing(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Llamada al endpoint de OCR (asumiendo estructura backend)
            // Ya NO DEVUELVE documento_url, solo datos
            const res = await api.post("/api/admin/purchases/ocr", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const invoices = res.data?.data?.invoices;
            if (invoices && invoices.length > 0) {
                setInvoicesToReview(invoices);
                setCurrentInvoiceIndex(0);
                setOcrPreviewData(invoices[0]);
                setShowPreviewModal(true);
            }
        } catch (error: any) {
            console.error("Error OCR:", error);
            showError("No se pudieron extraer datos automáticamente, por favor rellena el formulario");
        } finally {
            setIsOcrProcessing(false);
        }
    };

    const confirmOcrData = () => {
        if (!ocrPreviewData) return;

        // Validación estricta antes de volcar al formulario
        if (!ocrPreviewData.base_imponible || ocrPreviewData.base_imponible <= 0) {
            showError("La Base Imponible no puede estar vacía o ser 0.");
            return;
        }
        if (ocrPreviewData.iva_importe === undefined || ocrPreviewData.iva_importe === null) {
            showError("La Cuota de IVA es obligatoria.");
            return;
        }

        // Aplicar datos al formulario
        setValue("proveedor", ocrPreviewData.proveedor || "");
        setValue("numero_factura", ocrPreviewData.numero_factura || "");
        setValue("total", Number(ocrPreviewData.total) || 0);
        setValue("base_imponible", Number(ocrPreviewData.base_imponible) || 0);
        setValue("iva_porcentaje", Number(ocrPreviewData.iva_porcentaje) || 21);
        setValue("iva_importe", Number(ocrPreviewData.iva_importe) || 0);
        setValue("retencion_porcentaje", Number(ocrPreviewData.retencion_porcentaje) || 0);
        setValue("retencion_importe", Number(ocrPreviewData.retencion_importe) || 0);

        if (ocrPreviewData.fecha_compra) {
            try {
                const date = new Date(ocrPreviewData.fecha_compra);
                if (!isNaN(date.getTime())) {
                    setValue("fecha_compra", date.toISOString().split("T")[0]);
                }
            } catch (e) { }
        }
        setValue("descripcion", ocrPreviewData.descripcion || "");
        if (ocrPreviewData.anio) setValue("anio", ocrPreviewData.anio);
        if (ocrPreviewData.trimestre) setValue("trimestre", ocrPreviewData.trimestre);

        setShowPreviewModal(false);
    };

    const nextInvoice = () => {
        if (currentInvoiceIndex < invoicesToReview.length - 1) {
            const nextIdx = currentInvoiceIndex + 1;
            setCurrentInvoiceIndex(nextIdx);
            const nextData = invoicesToReview[nextIdx];
            setOcrPreviewData(nextData);

            // Actualizamos los campos del formulario para la siguiente factura
            reset({
                ...nextData,
                categoria: nextData.categoria || "general",
                metodo_pago: nextData.metodo_pago || "efectivo",
                documento_url: lastSavedDocumentUrl || "",
                // Aseguramos formatos de fecha y números
                total: Number(nextData.total) || 0,
                base_imponible: Number(nextData.base_imponible) || 0,
                iva_porcentaje: Number(nextData.iva_porcentaje) || 21,
                iva_importe: Number(nextData.iva_importe) || 0,
                retencion_porcentaje: Number(nextData.retencion_porcentaje) || 0,
                retencion_importe: Number(nextData.retencion_importe) || 0,
                fecha_compra: nextData.fecha_compra ? new Date(nextData.fecha_compra).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
            });
        }
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    formData.append(key, data[key]);
                }
            });

            if (!selectedFileObj && lastSavedDocumentUrl) {
                formData.append("documento_url", lastSavedDocumentUrl);
            }

            let res;
            if (editingGasto) {
                await api.put(`/api/admin/purchases/${editingGasto.id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                showSuccess("Gasto actualizado correctamente");
            } else {
                res = await api.post("/api/admin/purchases", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                showSuccess("Gasto registrado correctamente");

                if (res.data?.documento_url) {
                    setLastSavedDocumentUrl(res.data.documento_url);
                }
            }

            // Si llegamos aquí, el guardado fue EXITOSO
            if (invoicesToReview.length > 0 && currentInvoiceIndex < invoicesToReview.length - 1) {
                // Notificar éxito al padre para que refresque la lista en segundo plano
                onSuccess();

                // Pasamos a la siguiente factura
                nextInvoice();
                setShowPreviewModal(true); // Mostramos el modal de revisión para la siguiente
                setSelectedFileObj(null);
                setLoading(false);
                return; // IMPORTANTE: No llamar a onClose total aún
            }

            // Si es la última factura o un gasto individual exitoso
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error al guardar:", error);
            if (error.response?.status === 409) {
                showError(error.response.data.error || "Este gasto ya está registrado (Duplicado).");
                // Mantenemos el Drawer abierto para que el usuario pueda "Omitir" o corregir.
            } else {
                showError(error.response?.data?.error || "Error al guardar el gasto");
            }
        } finally {
            setLoading(false);
        }
    };

    const clearAllData = () => {
        reset({
            categoria: "general",
            metodo_pago: "efectivo",
            fecha_compra: new Date().toISOString().split("T")[0],
            proveedor: "",
            descripcion: "",
            total: 0,
            base_imponible: 0,
            iva_porcentaje: 21,
            iva_importe: 0,
            retencion_porcentaje: 0,
            retencion_importe: 0,
            numero_factura: "",
            documento_url: "",
        });
        setUploadedFile(null);
        setSelectedFileObj(null);
        setInvoicesToReview([]);
        setCurrentInvoiceIndex(0);
        setLastSavedDocumentUrl(null);
        setOcrPreviewData(null);
    };

    const skipInvoice = () => {
        if (invoicesToReview.length > 0 && currentInvoiceIndex < invoicesToReview.length - 1) {
            nextInvoice();
            // Mantenemos el modal abierto con la siguiente factura
        } else {
            // Si es la última o única, simplemente cerramos el modal de previsualización
            // No llamamos a onClose() para que el Drawer principal permanezca abierto
            setShowPreviewModal(false);
            setInvoicesToReview([]);
            setCurrentInvoiceIndex(0);
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
                        <div className="flex items-center gap-2">
                            {(uploadedFile || invoicesToReview.length > 0) && !isOcrProcessing && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={clearAllData}
                                    className="h-7 px-2 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 uppercase tracking-wider gap-1.5"
                                >
                                    <RotateCcw size={12} />
                                    Limpiar
                                </Button>
                            )}
                            {!editingGasto && !isOcrProcessing && (
                                <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                    <Sparkles size={10} />
                                    AUTORRELLENO IA ACTIVO
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="proveedor" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Building2 size={14} className="text-slate-400" />
                                Proveedor
                            </Label>
                            <Input
                                id="proveedor"
                                placeholder="Amazon, Repsol..."
                                {...register("proveedor")}
                                className="bg-slate-50/10 h-11 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="numero_factura" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <FileText size={14} className="text-slate-400" />
                                Nº Factura
                            </Label>
                            <Input
                                id="numero_factura"
                                placeholder="INV-2024-001"
                                {...register("numero_factura")}
                                className="bg-slate-50/10 h-11 rounded-xl font-mono text-sm"
                            />
                        </div>
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
                            <p className="text-xs text-red-500">{(errors.descripcion.message as string)}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Base Imponible */}
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label htmlFor="base_imponible" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Receipt size={14} className="text-slate-400" />
                                Base Imponible
                            </Label>
                            <Input
                                id="base_imponible"
                                type="number"
                                step="0.01"
                                {...register("base_imponible", { valueAsNumber: true })}
                                className="bg-slate-50/10 h-11 rounded-xl"
                            />
                        </div>

                        {/* IVA % e Importe */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold text-xs">IVA %</Label>
                                <Input
                                    type="number"
                                    {...register("iva_porcentaje", { valueAsNumber: true })}
                                    className="bg-slate-50/10 h-11 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2 text-center">
                                <Label className="text-slate-400 font-semibold text-[10px] uppercase">IVA (€)</Label>
                                <div className="h-11 flex items-center justify-center bg-slate-50 rounded-xl text-slate-500 font-mono text-sm">
                                    {watch("iva_importe") || 0}
                                </div>
                            </div>
                        </div>

                        {/* Retención % e Importe (para alquileres, etc.) */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold text-xs">Retención % (IRPF)</Label>
                                <Input
                                    type="number"
                                    {...register("retencion_porcentaje", { valueAsNumber: true })}
                                    className="bg-slate-50/10 h-11 rounded-xl"
                                    placeholder="0"
                                />
                                <p className="text-[10px] text-slate-400">Ej: 19% para alquileres</p>
                            </div>
                            <div className="space-y-2 text-center">
                                <Label className="text-slate-400 font-semibold text-[10px] uppercase">Retención (€)</Label>
                                <div className="h-11 flex items-center justify-center bg-slate-50 rounded-xl text-slate-500 font-mono text-sm">
                                    {watch("retencion_importe") || 0}
                                </div>
                            </div>
                        </div>

                        {/* Importe Total */}
                        <div className="space-y-2">
                            <Label htmlFor="total" className="flex items-center gap-2 text-slate-700 font-semibold">
                                <CreditCard size={14} className="text-slate-400" />
                                Total Factura * (Base + IVA - Retención)
                            </Label>
                            <Input
                                id="total"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...register("total", { valueAsNumber: true })}
                                className="bg-blue-50 border-blue-100 h-11 rounded-xl font-mono text-lg font-black text-blue-700 shadow-sm"
                            />
                            {errors.total && (
                                <p className="text-xs text-red-500">{(errors.total.message as string)}</p>
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
                                <p className="text-xs text-red-500">{(errors.fecha_compra.message as string)}</p>
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
                                onValueChange={(val) => {
                                    if (val === "__new__") {
                                        setIsNewCategoryOpen(true);
                                    } else {
                                        setValue("categoria", val);
                                    }
                                }}
                            >
                                <SelectTrigger className="bg-slate-50/10 h-11 rounded-xl">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat} className="capitalize">
                                            {cat}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__new__" className="text-blue-600 font-bold border-t mt-1">
                                        + Crear nueva
                                    </SelectItem>
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
                                onValueChange={(val) => {
                                    if (val === "__new__") {
                                        setIsNewPaymentMethodOpen(true);
                                    } else {
                                        setValue("metodo_pago", val);
                                    }
                                }}
                            >
                                <SelectTrigger className="bg-slate-50/10 h-11 rounded-xl">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((pm) => (
                                        <SelectItem key={pm} value={pm} className="capitalize">
                                            {pm}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__new__" className="text-blue-600 font-bold border-t mt-1">
                                        + Crear nuevo
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Dialog Nueva Categoría */}
                <Dialog open={isNewCategoryOpen} onOpenChange={setIsNewCategoryOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Nueva Categoría</DialogTitle>
                            <DialogDescription>
                                Añade una nueva categoría para tus gastos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category-name">Nombre</Label>
                                <Input
                                    id="category-name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Ej: Marketing"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewCategoryOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateCategory}>Crear</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog Nuevo Método de Pago */}
                <Dialog open={isNewPaymentMethodOpen} onOpenChange={setIsNewPaymentMethodOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Nuevo Método de Pago</DialogTitle>
                            <DialogDescription>
                                Añade un nuevo método de pago.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="payment-name">Nombre</Label>
                                <Input
                                    id="payment-name"
                                    value={newPaymentMethodName}
                                    onChange={(e) => setNewPaymentMethodName(e.target.value)}
                                    placeholder="Ej: American Express"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewPaymentMethodOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreatePaymentMethod}>Crear</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Botón para ver documento */}
                {watch("documento_url") && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <FileText size={14} />
                            VER DOCUMENTO ORIGINAL
                        </button>
                    </div>
                )}

                {/* Modal Visor de Documento */}
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText size={20} className="text-blue-500" />
                                Documento Original
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden relative">
                            {isPdf ? (
                                <iframe
                                    src={docUrl}
                                    className="w-full h-full"
                                    title="Visor PDF"
                                />
                            ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={docUrl}
                                    alt="Documento Gasto"
                                    className="w-full h-full object-contain"
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Footer con botones */}
                <div className="pt-6 border-t flex flex-col gap-3">
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 rounded-2xl h-12 font-bold"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-black text-white hover:bg-slate-800 rounded-2xl h-12 font-bold shadow-lg"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                editingGasto ? "Actualizar Gasto" : "Guardar Gasto"
                            )}
                        </Button>
                    </div>

                    {/* Botón Siguiente (Omitir) Solo si estamos en flujo OCR múltiple */}
                    {invoicesToReview.length > 0 && currentInvoiceIndex < invoicesToReview.length - 1 && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                            onClick={skipInvoice}
                        >
                            Omitir Invoice ACTUAL e ir a la siguiente ({currentInvoiceIndex + 2} de {invoicesToReview.length})
                            <ChevronRight size={16} />
                        </Button>
                    )}
                </div>
            </form>

            {/* Modal de Previsualización OCR */}
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-blue-500" size={20} />
                                Revisar Datos {invoicesToReview.length > 1 ? `(${currentInvoiceIndex + 1} de ${invoicesToReview.length})` : "Extraídos"}
                            </div>
                            {invoicesToReview.length > 1 && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                                    OCR Múltiple
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {invoicesToReview.length > 1
                                ? "Se han detectado varias facturas. Revisa y confirma cada una secuencialmente."
                                : "La IA ha detectado los siguientes datos. Puedes modificarlos ahora o después en el formulario."}
                        </DialogDescription>
                    </DialogHeader>

                    {ocrPreviewData?.es_duplicado && (
                        <div className="mx-6 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 animate-in fade-in zoom-in duration-300">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertTriangle size={16} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Gasto Duplicado Detectado</p>
                                <p className="text-[11px] leading-tight opacity-90">
                                    Este documento ya parece estar registrado. Pulsa <span className="font-bold">"Omitir"</span> para saltarlo.
                                </p>
                            </div>
                        </div>
                    )}

                    {ocrPreviewData && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Proveedor</Label>
                                    <Input
                                        value={ocrPreviewData.proveedor || ""}
                                        onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, proveedor: e.target.value })}
                                        className="h-10 bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Nº Factura</Label>
                                    <Input
                                        value={ocrPreviewData.numero_factura || ""}
                                        onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, numero_factura: e.target.value })}
                                        className="h-10 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Base</Label>
                                    <Input
                                        type="number"
                                        value={ocrPreviewData.base_imponible || ""}
                                        onChange={(e) => {
                                            const base = Number(e.target.value);
                                            const ivaPct = ocrPreviewData.iva_porcentaje || 21;
                                            const ivaImp = Number((base * (ivaPct / 100)).toFixed(2));
                                            setOcrPreviewData({
                                                ...ocrPreviewData,
                                                base_imponible: base,
                                                iva_importe: ivaImp,
                                                total: Number((base + ivaImp).toFixed(2))
                                            });
                                        }}
                                        className={`h-10 text-xs ${(!ocrPreviewData.base_imponible || ocrPreviewData.base_imponible <= 0) ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                                    />
                                    {(!ocrPreviewData.base_imponible || ocrPreviewData.base_imponible <= 0) && (
                                        <p className="text-[9px] text-red-500 font-bold">REQUERIDO</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">IVA %</Label>
                                    <Input
                                        type="number"
                                        value={ocrPreviewData.iva_porcentaje || 21}
                                        onChange={(e) => {
                                            const ivaPct = Number(e.target.value);
                                            const base = ocrPreviewData.base_imponible || 0;
                                            const ivaImp = Number((base * (ivaPct / 100)).toFixed(2));
                                            setOcrPreviewData({
                                                ...ocrPreviewData,
                                                iva_porcentaje: ivaPct,
                                                iva_importe: ivaImp,
                                                total: Number((base + ivaImp).toFixed(2))
                                            });
                                        }}
                                        className="h-10 bg-slate-50 border-slate-200 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Total</Label>
                                    <Input
                                        type="number"
                                        value={ocrPreviewData.total || ""}
                                        onChange={(e) => {
                                            const total = Number(e.target.value);
                                            const ivaPct = ocrPreviewData.iva_porcentaje || 21;
                                            const base = Number((total / (1 + ivaPct / 100)).toFixed(2));
                                            setOcrPreviewData({
                                                ...ocrPreviewData,
                                                total: total,
                                                base_imponible: base,
                                                iva_importe: Number((total - base).toFixed(2))
                                            });
                                        }}
                                        className="h-10 bg-blue-50 border-blue-100 font-bold text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 text-xs">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">IVA Importe</Label>
                                    <div className={`h-10 flex items-center px-3 rounded-lg font-mono ${(ocrPreviewData.iva_importe === undefined || ocrPreviewData.iva_importe === null) ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-500'}`}>
                                        {ocrPreviewData.iva_importe ?? "?"} €
                                    </div>
                                    {(ocrPreviewData.iva_importe === undefined || ocrPreviewData.iva_importe === null) && (
                                        <p className="text-[9px] text-red-500 font-bold">REQUERIDO</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Fecha</Label>
                                    <Input
                                        type="date"
                                        value={ocrPreviewData.fecha_compra || ""}
                                        onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, fecha_compra: e.target.value })}
                                        className="h-10 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Descripción</Label>
                                <Input
                                    value={ocrPreviewData.descripcion || ""}
                                    onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, descripcion: e.target.value })}
                                    className="h-10 bg-slate-50 border-slate-200"
                                />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Tag size={14} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-blue-700 uppercase">Periodo Contable</p>
                                    <p className="text-xs text-blue-600 font-medium">
                                        Año {ocrPreviewData.anio} • Trimestre {ocrPreviewData.trimestre}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <div className="flex w-full justify-between items-center gap-2">
                            <Button
                                variant="ghost"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600"
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setInvoicesToReview([]);
                                    setUploadedFile(null);
                                    setSelectedFileObj(null);
                                }}
                            >
                                Cancelar Todo
                            </Button>
                            <div className="flex gap-2">
                                {(invoicesToReview.length > 1 || ocrPreviewData?.es_duplicado) && (
                                    <Button
                                        variant="outline"
                                        className={`border-slate-200 ${ocrPreviewData?.es_duplicado ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'text-slate-600'}`}
                                        onClick={skipInvoice}
                                    >
                                        Omitir
                                    </Button>
                                )}
                                <Button
                                    className="bg-black text-white hover:bg-slate-800"
                                    onClick={confirmOcrData}
                                >
                                    Confirmar y Rellenar
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </IOSDrawer >
    );
}
