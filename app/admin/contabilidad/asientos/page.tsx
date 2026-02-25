"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authenticatedFetch } from "@/utils/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Plus,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Eye,
    FileText,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Download,
    Upload,
    Loader2,
    ListChecks,
    X,
    Pencil,
    RefreshCw,
    Save,
    AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// --- Types ---

type AsientoLinea = {
    id?: string;
    cuenta_codigo: string;
    cuenta_nombre: string;
    debe: number;
    haber: number;
};

type Asiento = {
    id: string;
    numero: number;
    fecha: string;
    concepto: string;
    tipo: string;
    estado: string;
    notas?: string;
    total_debe: number;
    total_haber: number;
    lineas?: AsientoLinea[];
};

// --- Helpers ---

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(amount);

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const TIPO_LABELS: Record<string, string> = {
    manual: "Manual",
    auto_factura: "Factura",
    auto_gasto: "Gasto",
    auto_nomina: "Nomina",
};

const ESTADO_STYLES: Record<string, string> = {
    borrador:
        "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50",
    validado:
        "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    anulado: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
};

const ESTADO_LABELS: Record<string, string> = {
    borrador: "Borrador",
    validado: "Validado",
    anulado: "Anulado",
};

const COL_WIDTH_KEY = "asientos-col-widths";
const DEFAULT_COL_WIDTHS: Record<string, number> = {
    numero: 80, fecha: 110, concepto: 300, tipo: 120,
    estado: 110, total_debe: 120, total_haber: 120, acciones: 100,
};

// --- Empty line factory ---

function emptyLinea(): AsientoLinea {
    return { cuenta_codigo: "", cuenta_nombre: "", debe: 0, haber: 0 };
}

// ===========================================================================
// Component
// ===========================================================================

export default function AsientosPage() {
    // --- State: list ---
    const [asientos, setAsientos] = useState<Asiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // --- State: filters ---
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [tipoFilter, setTipoFilter] = useState("all");
    const [estadoFilter, setEstadoFilter] = useState("all");
    const [buscar, setBuscar] = useState("");
    const [buscarDebounced, setBuscarDebounced] = useState("");
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- State: export/import ---
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ importados: number; duplicados: number; errores: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- State: detail expansion ---
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedLineas, setExpandedLineas] = useState<AsientoLinea[]>([]);
    const [loadingLineas, setLoadingLineas] = useState(false);

    // --- State: new asiento dialog ---
    const [showNewDialog, setShowNewDialog] = useState(false);
    const [newFecha, setNewFecha] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [newConcepto, setNewConcepto] = useState("");
    const [newNotas, setNewNotas] = useState("");
    const [newLineas, setNewLineas] = useState<AsientoLinea[]>([
        emptyLinea(),
        emptyLinea(),
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [newError, setNewError] = useState("");

    // --- State: generate dialog ---
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [genDesde, setGenDesde] = useState("");
    const [genHasta, setGenHasta] = useState("");
    const [generating, setGenerating] = useState(false);
    const [genResult, setGenResult] = useState<{
        facturas: number;
        gastos: number;
        nominas: number;
        errores: string[];
        ya_existentes: { facturas: number; gastos: number; nominas: number };
    } | null>(null);

    // --- State: sorting ---
    const [sortField, setSortField] = useState("fecha");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // --- State: multi-selection ---
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [validatingMultiple, setValidatingMultiple] = useState(false);

    // --- State: edit asiento ---
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editConcepto, setEditConcepto] = useState("");
    const [editNotas, setEditNotas] = useState("");
    const [editLineas, setEditLineas] = useState<AsientoLinea[]>([]);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");

    // --- State: re-review ---
    const [reviewing, setReviewing] = useState(false);
    const [reviewResult, setReviewResult] = useState<{
        revisados: number;
        corregidos: number;
        sin_cambios: number;
        errores: string[];
        cambios: { asiento_id: string; concepto: string; cuenta_anterior: { codigo: string; nombre: string }; cuenta_nueva: { codigo: string; nombre: string }; importe: number }[];
    } | null>(null);
    const [reviewSimulating, setReviewSimulating] = useState(false);

    // --- State: column widths (persisted) ---
    const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS);
    useEffect(() => {
        try {
            const saved = localStorage.getItem(COL_WIDTH_KEY);
            if (saved) setColWidths(prev => ({ ...prev, ...JSON.parse(saved) }));
        } catch {}
    }, []);

    // -----------------------------------------------------------------------
    // Load asientos
    // -----------------------------------------------------------------------

    const loadAsientos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("ejercicio", year);
            params.set("page", page.toString());
            params.set("limit", limit.toString());
            if (fechaDesde) params.set("fecha_desde", fechaDesde);
            if (fechaHasta) params.set("fecha_hasta", fechaHasta);
            if (tipoFilter !== "all") params.set("tipo", tipoFilter);
            if (estadoFilter !== "all") params.set("estado", estadoFilter);
            if (buscarDebounced) params.set("buscar", buscarDebounced);
            if (sortField) params.set("sort_field", sortField);
            if (sortDir) params.set("sort_dir", sortDir);

            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos?${params.toString()}`
            );
            if (res.ok) {
                const json = await res.json();
                setAsientos(json.asientos || []);
                setTotal(json.total || 0);
            }
        } catch (error) {
            console.error("Error loading asientos:", error);
        } finally {
            setLoading(false);
        }
    }, [year, page, limit, fechaDesde, fechaHasta, tipoFilter, estadoFilter, buscarDebounced, sortField, sortDir]);

    useEffect(() => {
        loadAsientos();
    }, [loadAsientos]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [year, fechaDesde, fechaHasta, tipoFilter, estadoFilter, buscarDebounced, sortField, sortDir]);

    // -----------------------------------------------------------------------
    // Expand row to show lineas
    // -----------------------------------------------------------------------

    const toggleExpand = async (asiento: Asiento) => {
        if (expandedId === asiento.id) {
            setExpandedId(null);
            setExpandedLineas([]);
            return;
        }

        setExpandedId(asiento.id);
        setLoadingLineas(true);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/${asiento.id}`
            );
            if (res.ok) {
                const json = await res.json();
                setExpandedLineas(json.lineas || []);
            }
        } catch (error) {
            console.error("Error loading lineas:", error);
        } finally {
            setLoadingLineas(false);
        }
    };

    // -----------------------------------------------------------------------
    // Validate asiento
    // -----------------------------------------------------------------------

    const handleValidar = async (id: string) => {
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/${id}/validar`,
                { method: "PUT" }
            );
            if (res.ok) {
                loadAsientos();
            }
        } catch (error) {
            console.error("Error validating asiento:", error);
        }
    };

    // -----------------------------------------------------------------------
    // Multi-validate
    // -----------------------------------------------------------------------

    const borradores = asientos.filter(a => a.estado === "borrador");
    const selectedBorradorIds = [...selectedIds].filter(id => borradores.some(b => b.id === id));

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(borradores.map(b => b.id)));
    };

    const selectNone = () => {
        setSelectedIds(new Set());
    };

    const toggleSelectionMode = () => {
        if (selectionMode) {
            setSelectionMode(false);
            setSelectedIds(new Set());
        } else {
            setSelectionMode(true);
        }
    };

    const handleValidarMultiple = async () => {
        if (selectedBorradorIds.length === 0) return;
        setValidatingMultiple(true);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/validar-multiple`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedBorradorIds }),
                }
            );
            if (res.ok) {
                const json = await res.json();
                setSelectionMode(false);
                setSelectedIds(new Set());
                loadAsientos();
            }
        } catch (error) {
            console.error("Error validando múltiples asientos:", error);
        } finally {
            setValidatingMultiple(false);
        }
    };

    // -----------------------------------------------------------------------
    // Edit asiento
    // -----------------------------------------------------------------------

    const startEdit = async (asiento: Asiento) => {
        setEditingId(asiento.id);
        setEditConcepto(asiento.concepto);
        setEditNotas(asiento.notas || "");
        setEditError("");
        // Load lines if not already in expandedLineas
        try {
            const res = await authenticatedFetch(`/api/admin/contabilidad/asientos/${asiento.id}`);
            if (res.ok) {
                const json = await res.json();
                setEditLineas(json.lineas || []);
            }
        } catch (err) {
            console.error("Error loading lineas for edit:", err);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditLineas([]);
        setEditError("");
    };

    const updateEditLinea = (index: number, field: keyof AsientoLinea, value: string | number) => {
        setEditLineas(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addEditLinea = () => {
        setEditLineas(prev => [...prev, emptyLinea()]);
    };

    const removeEditLinea = (index: number) => {
        if (editLineas.length <= 2) return;
        setEditLineas(prev => prev.filter((_, i) => i !== index));
    };

    const editTotalDebe = editLineas.reduce((acc, l) => acc + (Number(l.debe) || 0), 0);
    const editTotalHaber = editLineas.reduce((acc, l) => acc + (Number(l.haber) || 0), 0);
    const editIsBalanced = Math.abs(editTotalDebe - editTotalHaber) < 0.01;

    const handleSaveEdit = async () => {
        if (!editConcepto.trim()) { setEditError("El concepto es obligatorio."); return; }
        if (!editIsBalanced) { setEditError("El asiento no cuadra."); return; }
        if (editTotalDebe === 0) { setEditError("Los importes deben ser > 0."); return; }
        const lineasValidas = editLineas.filter(l => l.cuenta_codigo.trim() !== "");
        if (lineasValidas.length < 2) { setEditError("Mínimo 2 líneas con cuenta."); return; }

        setEditSaving(true);
        setEditError("");
        try {
            const res = await authenticatedFetch(`/api/admin/contabilidad/asientos/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    concepto: editConcepto,
                    notas: editNotas,
                    lineas: lineasValidas.map(l => ({
                        cuenta_codigo: l.cuenta_codigo,
                        cuenta_nombre: l.cuenta_nombre,
                        debe: Number(l.debe) || 0,
                        haber: Number(l.haber) || 0,
                    })),
                }),
            });
            if (res.ok) {
                setEditingId(null);
                setEditLineas([]);
                loadAsientos();
                // Refresh expanded detail if same ID
                if (expandedId === editingId) {
                    const json = await res.json();
                    setExpandedLineas(json.lineas || []);
                }
            } else {
                const json = await res.json().catch(() => null);
                setEditError(json?.error || "Error al guardar.");
            }
        } catch (err) {
            setEditError("Error de conexión.");
        } finally {
            setEditSaving(false);
        }
    };

    // -----------------------------------------------------------------------
    // Re-review asientos (IA revisa cuentas contables)
    // -----------------------------------------------------------------------

    const handleReview = async (simular: boolean) => {
        if (simular) setReviewSimulating(true);
        else setReviewing(true);
        setReviewResult(null);
        try {
            const ids = selectedBorradorIds.length > 0
                ? [...selectedIds]
                : [];
            const res = await authenticatedFetch(`/api/admin/contabilidad/asientos/revisar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, simular }),
            });
            if (res.ok) {
                const json = await res.json();
                setReviewResult(json);
                if (!simular && json.corregidos > 0) {
                    loadAsientos();
                }
            }
        } catch (err) {
            console.error("Error reviewing:", err);
        } finally {
            setReviewing(false);
            setReviewSimulating(false);
        }
    };

    // -----------------------------------------------------------------------
    // New Asiento form helpers
    // -----------------------------------------------------------------------

    const updateLinea = (
        index: number,
        field: keyof AsientoLinea,
        value: string | number
    ) => {
        setNewLineas((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addLinea = () => {
        setNewLineas((prev) => [...prev, emptyLinea()]);
    };

    const removeLinea = (index: number) => {
        if (newLineas.length <= 2) return;
        setNewLineas((prev) => prev.filter((_, i) => i !== index));
    };

    const totalDebe = newLineas.reduce(
        (acc, l) => acc + (Number(l.debe) || 0),
        0
    );
    const totalHaber = newLineas.reduce(
        (acc, l) => acc + (Number(l.haber) || 0),
        0
    );
    const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

    const resetNewForm = () => {
        setNewFecha(new Date().toISOString().slice(0, 10));
        setNewConcepto("");
        setNewNotas("");
        setNewLineas([emptyLinea(), emptyLinea()]);
        setNewError("");
    };

    const handleSubmitNew = async () => {
        // Validate
        if (!newConcepto.trim()) {
            setNewError("El concepto es obligatorio.");
            return;
        }
        if (!isBalanced) {
            setNewError(
                "El asiento no cuadra: Total Debe debe ser igual a Total Haber."
            );
            return;
        }
        if (totalDebe === 0) {
            setNewError("El asiento debe tener importes mayores a 0.");
            return;
        }

        const lineasValidas = newLineas.filter(
            (l) => l.cuenta_codigo.trim() !== ""
        );
        if (lineasValidas.length < 2) {
            setNewError("Se necesitan al menos 2 lineas con cuenta.");
            return;
        }

        setNewError("");
        setSubmitting(true);

        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fecha: newFecha,
                        concepto: newConcepto,
                        notas: newNotas,
                        lineas: lineasValidas.map((l) => ({
                            cuenta_codigo: l.cuenta_codigo,
                            cuenta_nombre: l.cuenta_nombre,
                            debe: Number(l.debe) || 0,
                            haber: Number(l.haber) || 0,
                        })),
                    }),
                }
            );

            if (res.ok) {
                setShowNewDialog(false);
                resetNewForm();
                loadAsientos();
            } else {
                const json = await res.json().catch(() => null);
                setNewError(
                    json?.error || "Error al crear el asiento contable."
                );
            }
        } catch (error) {
            console.error("Error creating asiento:", error);
            setNewError("Error de conexion al crear el asiento.");
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Generate asientos
    // -----------------------------------------------------------------------

    const handleGenerate = async () => {
        if (!genDesde || !genHasta) return;
        setGenerating(true);
        setGenResult(null);
        try {
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/generar`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fecha_desde: genDesde,
                        fecha_hasta: genHasta,
                    }),
                }
            );
            if (res.ok) {
                const json = await res.json();
                setGenResult(json);
                loadAsientos();
            }
        } catch (error) {
            console.error("Error generating asientos:", error);
        } finally {
            setGenerating(false);
        }
    };

    // Pre-fill generate dates with current quarter
    const prefillQuarter = () => {
        const now = new Date();
        const q = Math.ceil((now.getMonth() + 1) / 3);
        const y = now.getFullYear();
        const startMonth = (q - 1) * 3 + 1;
        const endMonth = q * 3;
        const endDay = new Date(y, endMonth, 0).getDate();
        setGenDesde(`${y}-${String(startMonth).padStart(2, "0")}-01`);
        setGenHasta(`${y}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`);
    };

    // -----------------------------------------------------------------------
    // Search debounce
    // -----------------------------------------------------------------------

    const handleSearchChange = (val: string) => {
        setBuscar(val);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setBuscarDebounced(val), 400);
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------

    const handleExport = async (formato: "excel" | "csv") => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            params.set("ejercicio", year);
            params.set("formato", formato);
            if (fechaDesde) params.set("fecha_desde", fechaDesde);
            if (fechaHasta) params.set("fecha_hasta", fechaHasta);
            if (tipoFilter !== "all") params.set("tipo", tipoFilter);
            if (estadoFilter !== "all") params.set("estado", estadoFilter);
            if (buscarDebounced) params.set("buscar", buscarDebounced);

            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/exportar?${params.toString()}`
            );
            if (!res.ok) throw new Error("Error exportando");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = formato === "csv"
                ? `diario_contable_${year}.csv`
                : `libro_diario_${year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exportando:", err);
        } finally {
            setExporting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Import
    // -----------------------------------------------------------------------

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await authenticatedFetch(
                `/api/admin/contabilidad/asientos/importar`,
                { method: "POST", body: formData }
            );
            const json = await res.json();
            if (res.ok) {
                setImportResult(json);
                loadAsientos();
            } else {
                setImportResult({ importados: 0, duplicados: 0, errores: [json.error || "Error desconocido"] });
            }
        } catch (err) {
            setImportResult({ importados: 0, duplicados: 0, errores: ["Error de conexión"] });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // -----------------------------------------------------------------------
    // Sorting
    // -----------------------------------------------------------------------

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const sortIcon = (field: string) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 text-slate-300 shrink-0" />;
        return sortDir === "asc"
            ? <ArrowUp size={12} className="ml-1 text-slate-700 shrink-0" />
            : <ArrowDown size={12} className="ml-1 text-slate-700 shrink-0" />;
    };

    // -----------------------------------------------------------------------
    // Column resize
    // -----------------------------------------------------------------------

    const onResizeStart = (col: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = colWidths[col] || 100;
        const onMove = (ev: MouseEvent) => {
            const w = Math.max(50, startW + ev.clientX - startX);
            setColWidths(prev => {
                const next = { ...prev, [col]: w };
                try { localStorage.setItem(COL_WIDTH_KEY, JSON.stringify(next)); } catch {}
                return next;
            });
        };
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

    // -----------------------------------------------------------------------
    // Pagination
    // -----------------------------------------------------------------------

    const totalPages = Math.max(1, Math.ceil(total / limit));

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="space-y-6">
            {/* ============================================================ */}
            {/* Header */}
            {/* ============================================================ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Libro Diario - Asientos Contables
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Registro cronologico de todos los movimientos contables
                        de la empresa.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Export/Import buttons */}
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-medium"
                            onClick={() => handleExport("excel")}
                            disabled={exporting}
                        >
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Excel
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-medium"
                            onClick={() => handleExport("csv")}
                            disabled={exporting}
                        >
                            <Download size={14} />
                            CSV
                        </Button>
                        <div className="w-px h-5 bg-slate-200" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-medium"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                        >
                            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Importar
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleImport}
                        />
                    </div>

                    {/* Year selector */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-2">
                            Ejercicio
                        </span>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[110px] h-9 border-none bg-slate-50 font-bold text-slate-700 rounded-xl">
                                <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100">
                                <SelectItem value="2026">2026</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selection mode toggle */}
                    <Button
                        variant={selectionMode ? "default" : "outline"}
                        className={`rounded-xl h-11 px-5 gap-2 active:scale-95 transition-all ${selectionMode ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                        onClick={toggleSelectionMode}
                    >
                        {selectionMode ? <X size={18} /> : <ListChecks size={18} />}
                        <span className="hidden sm:inline">
                            {selectionMode ? "Cancelar" : "Seleccionar"}
                        </span>
                    </Button>

                    {/* Re-review button */}
                    <Button
                        variant="outline"
                        className="rounded-xl h-11 px-5 gap-2 active:scale-95 transition-all border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => handleReview(true)}
                        disabled={reviewing || reviewSimulating}
                    >
                        {reviewSimulating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        <span className="hidden sm:inline">Re-revisar</span>
                    </Button>

                    {/* Generate button */}
                    <Dialog
                        open={showGenerateDialog}
                        onOpenChange={(open) => {
                            setShowGenerateDialog(open);
                            if (!open) setGenResult(null);
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="rounded-xl h-11 px-5 gap-2 active:scale-95 transition-all"
                            >
                                <FileText size={18} />
                                <span className="hidden sm:inline">
                                    Generar Asientos
                                </span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    Generar Asientos Automaticos
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Genera asientos contables automaticamente a
                                    partir de facturas emitidas, gastos y nominas
                                    del periodo seleccionado. Se ignoran movimientos
                                    que ya tienen asiento.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-500">
                                            Desde
                                        </Label>
                                        <Input
                                            type="date"
                                            value={genDesde}
                                            onChange={(e) =>
                                                setGenDesde(e.target.value)
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-500">
                                            Hasta
                                        </Label>
                                        <Input
                                            type="date"
                                            value={genHasta}
                                            onChange={(e) =>
                                                setGenHasta(e.target.value)
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                                {!genDesde && !genHasta && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg text-xs"
                                        onClick={prefillQuarter}
                                    >
                                        Rellenar trimestre actual
                                    </Button>
                                )}

                                {/* Results summary */}
                                {genResult && (
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                        <p className="font-semibold text-sm text-slate-900">
                                            Resultado de la generacion
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-white rounded-lg border border-slate-100 p-2.5">
                                                <p className="text-lg font-bold text-blue-600">{genResult.facturas}</p>
                                                <p className="text-[10px] text-slate-500">Facturas</p>
                                                {genResult.ya_existentes.facturas > 0 && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{genResult.ya_existentes.facturas} ya tenian</p>
                                                )}
                                            </div>
                                            <div className="bg-white rounded-lg border border-slate-100 p-2.5">
                                                <p className="text-lg font-bold text-orange-600">{genResult.gastos}</p>
                                                <p className="text-[10px] text-slate-500">Gastos</p>
                                                {genResult.ya_existentes.gastos > 0 && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{genResult.ya_existentes.gastos} ya tenian</p>
                                                )}
                                            </div>
                                            <div className="bg-white rounded-lg border border-slate-100 p-2.5">
                                                <p className="text-lg font-bold text-purple-600">{genResult.nominas}</p>
                                                <p className="text-[10px] text-slate-500">Nominas</p>
                                                {genResult.ya_existentes.nominas > 0 && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{genResult.ya_existentes.nominas} ya tenian</p>
                                                )}
                                            </div>
                                        </div>
                                        {genResult.facturas + genResult.gastos + genResult.nominas === 0 && (
                                            <p className="text-xs text-slate-500 text-center">
                                                No se encontraron movimientos nuevos sin asiento en este periodo.
                                            </p>
                                        )}
                                        {genResult.errores.length > 0 && (
                                            <div className="bg-red-50 rounded-lg border border-red-200 p-2.5">
                                                <p className="text-xs font-semibold text-red-700 mb-1">Errores ({genResult.errores.length}):</p>
                                                {genResult.errores.slice(0, 5).map((err, i) => (
                                                    <p key={i} className="text-xs text-red-600">{err}</p>
                                                ))}
                                                {genResult.errores.length > 5 && (
                                                    <p className="text-xs text-red-500">...y {genResult.errores.length - 5} mas</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!genResult ? (
                                    <Button
                                        className="w-full bg-black text-white hover:bg-slate-800 rounded-xl h-11"
                                        onClick={handleGenerate}
                                        disabled={generating || !genDesde || !genHasta}
                                    >
                                        {generating
                                            ? "Generando asientos..."
                                            : "Generar Asientos"}
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full rounded-xl h-11"
                                        variant="outline"
                                        onClick={() => {
                                            setShowGenerateDialog(false);
                                            setGenResult(null);
                                        }}
                                    >
                                        Cerrar
                                    </Button>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* New asiento button */}
                    <Dialog
                        open={showNewDialog}
                        onOpenChange={(open) => {
                            setShowNewDialog(open);
                            if (!open) resetNewForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-black text-white hover:bg-slate-800 rounded-xl h-11 px-5 gap-2 shadow-lg active:scale-95 transition-all">
                                <Plus size={18} />
                                <span>Nuevo Asiento</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    Nuevo Asiento Contable
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-5 pt-2">
                                {/* Top fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-500">
                                            Fecha
                                        </Label>
                                        <Input
                                            type="date"
                                            value={newFecha}
                                            onChange={(e) =>
                                                setNewFecha(e.target.value)
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-500">
                                            Concepto
                                        </Label>
                                        <Input
                                            placeholder="Descripcion del asiento"
                                            value={newConcepto}
                                            onChange={(e) =>
                                                setNewConcepto(e.target.value)
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">
                                        Notas (opcional)
                                    </Label>
                                    <textarea
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        placeholder="Notas adicionales..."
                                        value={newNotas}
                                        onChange={(e) =>
                                            setNewNotas(e.target.value)
                                        }
                                    />
                                </div>

                                {/* Lines table */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Lineas del asiento
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg gap-1 text-xs"
                                            onClick={addLinea}
                                        >
                                            <Plus size={14} /> Linea
                                        </Button>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-100/50">
                                                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs">
                                                        Cuenta
                                                    </th>
                                                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs">
                                                        Nombre
                                                    </th>
                                                    <th className="text-right p-2.5 font-semibold text-slate-500 text-xs w-[120px]">
                                                        Debe
                                                    </th>
                                                    <th className="text-right p-2.5 font-semibold text-slate-500 text-xs w-[120px]">
                                                        Haber
                                                    </th>
                                                    <th className="w-[40px]"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {newLineas.map((linea, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-b border-slate-100 last:border-0"
                                                    >
                                                        <td className="p-1.5">
                                                            <Input
                                                                placeholder="4300"
                                                                value={
                                                                    linea.cuenta_codigo
                                                                }
                                                                onChange={(e) =>
                                                                    updateLinea(
                                                                        idx,
                                                                        "cuenta_codigo",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg text-xs bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                placeholder="Clientes"
                                                                value={
                                                                    linea.cuenta_nombre
                                                                }
                                                                onChange={(e) =>
                                                                    updateLinea(
                                                                        idx,
                                                                        "cuenta_nombre",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg text-xs bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                value={
                                                                    linea.debe ||
                                                                    ""
                                                                }
                                                                onChange={(e) =>
                                                                    updateLinea(
                                                                        idx,
                                                                        "debe",
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 0
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg text-xs text-right bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                value={
                                                                    linea.haber ||
                                                                    ""
                                                                }
                                                                onChange={(e) =>
                                                                    updateLinea(
                                                                        idx,
                                                                        "haber",
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 0
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg text-xs text-right bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-1.5 text-center">
                                                            {newLineas.length >
                                                                2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeLinea(
                                                                            idx
                                                                        )
                                                                    }
                                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <XCircle
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3">
                                        <div className="flex items-center gap-6 text-sm">
                                            <div>
                                                <span className="text-slate-500 mr-2">
                                                    Total Debe:
                                                </span>
                                                <span className="font-bold text-slate-900">
                                                    {formatCurrency(totalDebe)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 mr-2">
                                                    Total Haber:
                                                </span>
                                                <span className="font-bold text-slate-900">
                                                    {formatCurrency(totalHaber)}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            {isBalanced && totalDebe > 0 ? (
                                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                                    <CheckCircle
                                                        size={12}
                                                        className="mr-1"
                                                    />
                                                    Cuadrado
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-50 text-red-700 border-red-200">
                                                    <XCircle
                                                        size={12}
                                                        className="mr-1"
                                                    />
                                                    Descuadre:{" "}
                                                    {formatCurrency(
                                                        Math.abs(
                                                            totalDebe -
                                                                totalHaber
                                                        )
                                                    )}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Error */}
                                {newError && (
                                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-200">
                                        {newError}
                                    </div>
                                )}

                                {/* Submit */}
                                <Button
                                    className="w-full bg-black text-white hover:bg-slate-800 rounded-xl h-11"
                                    onClick={handleSubmitNew}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? "Guardando..."
                                        : "Crear Asiento"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ============================================================ */}
            {/* Filters */}
            {/* ============================================================ */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por concepto, cuenta o numero..."
                        className="pl-10 bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300"
                        value={buscar}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Filter size={14} className="text-slate-400" />
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none border-none py-1"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            placeholder="Desde"
                        />
                        <span className="text-slate-300 mx-1">&mdash;</span>
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none border-none py-1"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            placeholder="Hasta"
                        />
                    </div>

                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                        <SelectTrigger className="w-[160px] bg-slate-50 border-none h-11 rounded-xl">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto_factura">
                                Auto (Factura)
                            </SelectItem>
                            <SelectItem value="auto_gasto">
                                Auto (Gasto)
                            </SelectItem>
                            <SelectItem value="auto_nomina">
                                Auto (Nomina)
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={estadoFilter}
                        onValueChange={setEstadoFilter}
                    >
                        <SelectTrigger className="w-[160px] bg-slate-50 border-none h-11 rounded-xl">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                            <SelectItem value="all">
                                Todos los estados
                            </SelectItem>
                            <SelectItem value="borrador">Borrador</SelectItem>
                            <SelectItem value="validado">Validado</SelectItem>
                            <SelectItem value="anulado">Anulado</SelectItem>
                        </SelectContent>
                    </Select>

                    {(fechaDesde ||
                        fechaHasta ||
                        tipoFilter !== "all" ||
                        estadoFilter !== "all") && (
                        <Button
                            variant="ghost"
                            className="h-11 px-4 text-slate-500 hover:text-black hover:bg-slate-100 rounded-xl"
                            onClick={() => {
                                setFechaDesde("");
                                setFechaHasta("");
                                setTipoFilter("all");
                                setEstadoFilter("all");
                            }}
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* Import result banner */}
            {importResult && (
                <div className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 ${importResult.errores.length > 0 && importResult.importados === 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                    <div className="text-sm">
                        <p className="font-semibold">
                            Importacion completada: {importResult.importados} asiento{importResult.importados !== 1 ? "s" : ""} importado{importResult.importados !== 1 ? "s" : ""}
                            {importResult.duplicados > 0 && `, ${importResult.duplicados} duplicado${importResult.duplicados !== 1 ? "s" : ""} omitido${importResult.duplicados !== 1 ? "s" : ""}`}
                        </p>
                        {importResult.errores.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                                {importResult.errores.slice(0, 5).map((err, i) => (
                                    <p key={i} className="text-xs text-red-600">{err}</p>
                                ))}
                                {importResult.errores.length > 5 && (
                                    <p className="text-xs text-red-500">...y {importResult.errores.length - 5} mas</p>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            {/* ============================================================ */}
            {/* Selection bar */}
            {/* ============================================================ */}
            {selectionMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <ListChecks size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                            {selectedBorradorIds.length} de {borradores.length} borrador{borradores.length !== 1 ? "es" : ""} seleccionado{selectedBorradorIds.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg h-8 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                                onClick={selectAll}
                            >
                                Todos
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg h-8 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                                onClick={selectNone}
                            >
                                Ninguno
                            </Button>
                        </div>
                    </div>
                    <Button
                        className="bg-green-600 text-white hover:bg-green-700 rounded-xl h-10 px-5 gap-2 shadow-sm"
                        onClick={handleValidarMultiple}
                        disabled={selectedBorradorIds.length === 0 || validatingMultiple}
                    >
                        {validatingMultiple ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Validar {selectedBorradorIds.length > 0 ? `(${selectedBorradorIds.length})` : ""}
                    </Button>
                </div>
            )}

            {/* ============================================================ */}
            {/* Asientos Table */}
            {/* ============================================================ */}
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        Asientos Contables
                    </CardTitle>
                    <CardDescription>
                        {total} asiento{total !== 1 ? "s" : ""} encontrado
                        {total !== 1 ? "s" : ""} en el ejercicio {year}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                {selectionMode && (
                                    <TableHead className="w-[44px] pl-4">
                                        <Checkbox
                                            checked={borradores.length > 0 && selectedBorradorIds.length === borradores.length}
                                            onCheckedChange={(checked) => checked ? selectAll() : selectNone()}
                                        />
                                    </TableHead>
                                )}
                                {[
                                    { key: "numero", label: "Num", cls: selectionMode ? "" : "pl-6" },
                                    { key: "fecha", label: "Fecha" },
                                    { key: "concepto", label: "Concepto" },
                                    { key: "tipo", label: "Tipo" },
                                    { key: "estado", label: "Estado" },
                                    { key: "total_debe", label: "Debe", cls: "text-right", right: true },
                                    { key: "total_haber", label: "Haber", cls: "text-right", right: true },
                                    { key: "acciones", label: "Acciones", cls: "text-right pr-6", right: true, noSort: true },
                                ].map(col => (
                                    <TableHead
                                        key={col.key}
                                        className={`relative select-none ${col.cls || ""}`}
                                        style={{ width: colWidths[col.key] }}
                                    >
                                        <div
                                            className={`flex items-center gap-0.5 ${col.right ? "justify-end" : ""} ${!col.noSort ? "cursor-pointer hover:text-slate-900" : ""}`}
                                            onClick={() => !col.noSort && toggleSort(col.key)}
                                        >
                                            <span>{col.label}</span>
                                            {!col.noSort && sortIcon(col.key)}
                                        </div>
                                        {!col.noSort && (
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/60"
                                                onMouseDown={(e) => onResizeStart(col.key, e)}
                                            />
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {selectionMode && <TableCell><div className="h-4 w-4 bg-slate-100 rounded animate-pulse" /></TableCell>}
                                        {Array.from({ length: 8 }).map(
                                            (_, j) => (
                                                <TableCell key={j}>
                                                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                                </TableCell>
                                            )
                                        )}
                                    </TableRow>
                                ))
                            ) : asientos.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={selectionMode ? 9 : 8}
                                        className="text-center py-16"
                                    >
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <FileText
                                                size={40}
                                                strokeWidth={1.5}
                                            />
                                            <p className="text-sm font-medium">
                                                No se encontraron asientos
                                                contables
                                            </p>
                                            <p className="text-xs">
                                                Crea uno nuevo o ajusta los
                                                filtros de busqueda.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                asientos.map((asiento) => (
                                    <>
                                        <TableRow
                                            key={asiento.id}
                                            className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${selectionMode && selectedIds.has(asiento.id) ? "bg-blue-50/60" : ""}`}
                                            onClick={() =>
                                                selectionMode && asiento.estado === "borrador"
                                                    ? toggleSelect(asiento.id)
                                                    : toggleExpand(asiento)
                                            }
                                        >
                                            {selectionMode && (
                                                <TableCell className="pl-4 w-[44px]" onClick={(e) => e.stopPropagation()}>
                                                    {asiento.estado === "borrador" ? (
                                                        <Checkbox
                                                            checked={selectedIds.has(asiento.id)}
                                                            onCheckedChange={() => toggleSelect(asiento.id)}
                                                        />
                                                    ) : (
                                                        <div className="w-4 h-4" />
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell className={`${selectionMode ? "" : "pl-6"} font-mono text-xs text-slate-500`}>
                                                {asiento.numero}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">
                                                {formatDate(asiento.fecha)}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900 text-sm overflow-hidden">
                                                <span className="block truncate" title={asiento.concepto}>
                                                    {asiento.concepto}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-white px-2 py-0.5 rounded-lg border-slate-200 font-normal text-slate-600 text-xs shadow-sm"
                                                >
                                                    {TIPO_LABELS[
                                                        asiento.tipo
                                                    ] || asiento.tipo}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`px-2 py-0.5 rounded-lg text-xs font-medium ${ESTADO_STYLES[asiento.estado] || ""}`}
                                                >
                                                    {ESTADO_LABELS[
                                                        asiento.estado
                                                    ] || asiento.estado}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 text-sm">
                                                {formatCurrency(
                                                    asiento.total_debe
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 text-sm">
                                                {formatCurrency(
                                                    asiento.total_haber
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-slate-200 text-slate-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleExpand(
                                                                asiento
                                                            );
                                                        }}
                                                        title="Ver detalle"
                                                    >
                                                        <Eye size={14} />
                                                    </Button>
                                                    {asiento.estado !== "anulado" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 text-slate-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEdit(asiento);
                                                            }}
                                                            title="Editar asiento"
                                                        >
                                                            <Pencil size={14} />
                                                        </Button>
                                                    )}
                                                    {asiento.estado ===
                                                        "borrador" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-green-100 hover:text-green-600 text-slate-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleValidar(
                                                                    asiento.id
                                                                );
                                                            }}
                                                            title="Validar asiento"
                                                        >
                                                            <CheckCircle
                                                                size={14}
                                                            />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded detail row */}
                                        {expandedId === asiento.id && (
                                            <TableRow
                                                key={`${asiento.id}-detail`}
                                            >
                                                <TableCell
                                                    colSpan={selectionMode ? 9 : 8}
                                                    className="bg-slate-50/70 p-0"
                                                >
                                                    <div className="px-6 py-4">
                                                        {asiento.notas && (
                                                            <p className="text-xs text-slate-500 mb-3 italic">
                                                                {asiento.notas}
                                                            </p>
                                                        )}
                                                        {loadingLineas ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                                                                <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                                                Cargando
                                                                lineas...
                                                            </div>
                                                        ) : expandedLineas.length ===
                                                          0 ? (
                                                            <p className="text-sm text-slate-400 py-2">
                                                                Sin lineas
                                                                registradas.
                                                            </p>
                                                        ) : (
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b border-slate-200">
                                                                        <th className="text-left p-2 text-xs font-semibold text-slate-500">
                                                                            Cuenta
                                                                        </th>
                                                                        <th className="text-left p-2 text-xs font-semibold text-slate-500">
                                                                            Nombre
                                                                        </th>
                                                                        <th className="text-right p-2 text-xs font-semibold text-slate-500">
                                                                            Debe
                                                                        </th>
                                                                        <th className="text-right p-2 text-xs font-semibold text-slate-500">
                                                                            Haber
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {expandedLineas.map(
                                                                        (
                                                                            linea,
                                                                            idx
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="border-b border-slate-100 last:border-0"
                                                                            >
                                                                                <td className="p-2 font-mono text-xs text-slate-600">
                                                                                    {
                                                                                        linea.cuenta_codigo
                                                                                    }
                                                                                </td>
                                                                                <td className="p-2 text-slate-700">
                                                                                    {
                                                                                        linea.cuenta_nombre
                                                                                    }
                                                                                </td>
                                                                                <td className="p-2 text-right font-medium text-slate-900">
                                                                                    {Number(
                                                                                        linea.debe
                                                                                    ) >
                                                                                    0
                                                                                        ? formatCurrency(
                                                                                              linea.debe
                                                                                          )
                                                                                        : ""}
                                                                                </td>
                                                                                <td className="p-2 text-right font-medium text-slate-900">
                                                                                    {Number(
                                                                                        linea.haber
                                                                                    ) >
                                                                                    0
                                                                                        ? formatCurrency(
                                                                                              linea.haber
                                                                                          )
                                                                                        : ""}
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    )}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="border-t-2 border-slate-300">
                                                                        <td
                                                                            className="p-2 font-bold text-xs text-slate-500"
                                                                            colSpan={
                                                                                2
                                                                            }
                                                                        >
                                                                            TOTALES
                                                                        </td>
                                                                        <td className="p-2 text-right font-bold text-slate-900">
                                                                            {formatCurrency(
                                                                                expandedLineas.reduce(
                                                                                    (
                                                                                        acc,
                                                                                        l
                                                                                    ) =>
                                                                                        acc +
                                                                                        (Number(
                                                                                            l.debe
                                                                                        ) ||
                                                                                            0),
                                                                                    0
                                                                                )
                                                                            )}
                                                                        </td>
                                                                        <td className="p-2 text-right font-bold text-slate-900">
                                                                            {formatCurrency(
                                                                                expandedLineas.reduce(
                                                                                    (
                                                                                        acc,
                                                                                        l
                                                                                    ) =>
                                                                                        acc +
                                                                                        (Number(
                                                                                            l.haber
                                                                                        ) ||
                                                                                            0),
                                                                                    0
                                                                                )
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Re-review results banner */}
            {/* ============================================================ */}
            {reviewResult && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={20} className="text-amber-600" />
                            <div>
                                <p className="font-semibold text-amber-900">Resultado de la revision</p>
                                <p className="text-sm text-amber-700">
                                    {reviewResult.revisados} revisados &middot; {reviewResult.corregidos} con cambios &middot; {reviewResult.sin_cambios} correctos
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setReviewResult(null)} className="text-amber-400 hover:text-amber-600">
                            <X size={18} />
                        </button>
                    </div>

                    {reviewResult.cambios.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Cambios detectados:</p>
                            <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-amber-100 bg-amber-50/50">
                                            <th className="text-left p-2.5 text-xs font-semibold text-amber-700">Concepto</th>
                                            <th className="text-left p-2.5 text-xs font-semibold text-amber-700">Cuenta anterior</th>
                                            <th className="text-left p-2.5 text-xs font-semibold text-amber-700">Cuenta correcta</th>
                                            <th className="text-right p-2.5 text-xs font-semibold text-amber-700">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviewResult.cambios.map((c, i) => (
                                            <tr key={i} className="border-b border-amber-50 last:border-0">
                                                <td className="p-2.5 text-slate-900 max-w-[300px] truncate" title={c.concepto}>{c.concepto}</td>
                                                <td className="p-2.5">
                                                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-lg text-xs font-mono">
                                                        {c.cuenta_anterior.codigo} <span className="font-sans text-red-500">{c.cuenta_anterior.nombre}</span>
                                                    </span>
                                                </td>
                                                <td className="p-2.5">
                                                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-xs font-mono">
                                                        {c.cuenta_nueva.codigo} <span className="font-sans text-green-500">{c.cuenta_nueva.nombre}</span>
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-medium">{formatCurrency(c.importe)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-10 px-4 text-sm"
                                    onClick={() => setReviewResult(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="bg-amber-600 text-white hover:bg-amber-700 rounded-xl h-10 px-5 gap-2 text-sm shadow-sm"
                                    onClick={() => handleReview(false)}
                                    disabled={reviewing}
                                >
                                    {reviewing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    Aplicar {reviewResult.corregidos} corrección{reviewResult.corregidos !== 1 ? "es" : ""}
                                </Button>
                            </div>
                        </div>
                    )}

                    {reviewResult.cambios.length === 0 && reviewResult.corregidos === 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3 border border-green-200">
                            <CheckCircle size={16} />
                            Todos los asientos tienen las cuentas correctas. No se necesitan correcciones.
                        </div>
                    )}

                    {reviewResult.errores.length > 0 && (
                        <div className="bg-red-50 rounded-xl border border-red-200 p-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">Errores ({reviewResult.errores.length}):</p>
                            {reviewResult.errores.slice(0, 5).map((err, i) => (
                                <p key={i} className="text-xs text-red-600">{err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* Edit dialog */}
            {/* ============================================================ */}
            <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) cancelEdit(); }}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Asiento Contable</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">Concepto</Label>
                                <Input
                                    value={editConcepto}
                                    onChange={(e) => setEditConcepto(e.target.value)}
                                    className="rounded-xl"
                                    placeholder="Concepto del asiento"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">Notas (opcional)</Label>
                                <Input
                                    value={editNotas}
                                    onChange={(e) => setEditNotas(e.target.value)}
                                    className="rounded-xl"
                                    placeholder="Notas adicionales"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Líneas del asiento</Label>
                                <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1 text-xs" onClick={addEditLinea}>
                                    <Plus size={14} /> Línea
                                </Button>
                            </div>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-100/50">
                                            <th className="text-left p-2.5 font-semibold text-slate-500 text-xs">Cuenta</th>
                                            <th className="text-left p-2.5 font-semibold text-slate-500 text-xs">Nombre</th>
                                            <th className="text-right p-2.5 font-semibold text-slate-500 text-xs w-[120px]">Debe</th>
                                            <th className="text-right p-2.5 font-semibold text-slate-500 text-xs w-[120px]">Haber</th>
                                            <th className="w-[40px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editLineas.map((linea, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0">
                                                <td className="p-1.5">
                                                    <Input placeholder="4300" value={linea.cuenta_codigo} onChange={(e) => updateEditLinea(idx, "cuenta_codigo", e.target.value)} className="h-8 rounded-lg text-xs bg-white" />
                                                </td>
                                                <td className="p-1.5">
                                                    <Input placeholder="Clientes" value={linea.cuenta_nombre} onChange={(e) => updateEditLinea(idx, "cuenta_nombre", e.target.value)} className="h-8 rounded-lg text-xs bg-white" />
                                                </td>
                                                <td className="p-1.5">
                                                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={linea.debe || ""} onChange={(e) => updateEditLinea(idx, "debe", parseFloat(e.target.value) || 0)} className="h-8 rounded-lg text-xs text-right bg-white" />
                                                </td>
                                                <td className="p-1.5">
                                                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={linea.haber || ""} onChange={(e) => updateEditLinea(idx, "haber", parseFloat(e.target.value) || 0)} className="h-8 rounded-lg text-xs text-right bg-white" />
                                                </td>
                                                <td className="p-1.5 text-center">
                                                    {editLineas.length > 2 && (
                                                        <button type="button" onClick={() => removeEditLinea(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center gap-6 text-sm">
                                    <div><span className="text-slate-500 mr-2">Total Debe:</span><span className="font-bold text-slate-900">{formatCurrency(editTotalDebe)}</span></div>
                                    <div><span className="text-slate-500 mr-2">Total Haber:</span><span className="font-bold text-slate-900">{formatCurrency(editTotalHaber)}</span></div>
                                </div>
                                <div>
                                    {editIsBalanced && editTotalDebe > 0 ? (
                                        <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle size={12} className="mr-1" />Cuadrado</Badge>
                                    ) : (
                                        <Badge className="bg-red-50 text-red-700 border-red-200"><XCircle size={12} className="mr-1" />Descuadre: {formatCurrency(Math.abs(editTotalDebe - editTotalHaber))}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {editError && (
                            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-200">{editError}</div>
                        )}

                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={cancelEdit}>Cancelar</Button>
                            <Button
                                className="flex-1 bg-black text-white hover:bg-slate-800 rounded-xl h-11 gap-2"
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                            >
                                {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editSaving ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* Pagination */}
            {/* ============================================================ */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3">
                    <p className="text-xs text-slate-500">
                        Pagina {page} de {totalPages} ({total} asientos)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Anterior
                        </Button>

                        {/* Page number buttons */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => {
                                // Show first, last, current, and neighbors
                                if (p === 1 || p === totalPages) return true;
                                if (Math.abs(p - page) <= 1) return true;
                                return false;
                            })
                            .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                if (
                                    idx > 0 &&
                                    typeof arr[idx - 1] === "number" &&
                                    p - (arr[idx - 1] as number) > 1
                                ) {
                                    acc.push("...");
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === "..." ? (
                                    <span
                                        key={`dots-${idx}`}
                                        className="px-1 text-slate-400 text-sm"
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <Button
                                        key={item}
                                        variant={
                                            page === item
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className={`rounded-lg min-w-[32px] ${
                                            page === item
                                                ? "bg-black text-white hover:bg-slate-800"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setPage(item as number)
                                        }
                                    >
                                        {item}
                                    </Button>
                                )
                            )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={page >= totalPages}
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
