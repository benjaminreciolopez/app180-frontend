"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Filter,
    ArrowUpDown,
    MoreVertical,
    Trash2,
    Pencil,
    FileText,
    Calendar as CalendarIcon,
    Download,
    Receipt,
    Tag,
    CreditCard,
    Building2,
    ChevronUp,
    ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import DrawerGastoAdmin from "@/components/admin/drawer/DrawerGastoAdmin";
import BankImportDialog from "@/components/admin/BankImportDialog";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";

type Gasto = {
    id: string;
    proveedor: string | null;
    descripcion: string;
    total: number;
    fecha_compra: string;
    categoria: string;
    metodo_pago: string;
    activo: boolean;
};

type SortConfig = {
    key: keyof Gasto;
    direction: "asc" | "desc";
};

export default function GastosPage() {
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [gastos, setGastos] = useState<Gasto[]>([]);

    // UI State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
    const [showBankImport, setShowBankImport] = useState(false);

    // Filters & Search
    const [search, setSearch] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [categoriaFilter, setCategoriaFilter] = useState("all");

    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "fecha_compra",
        direction: "desc",
    });

    const loadGastos = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/admin/purchases", {
                params: {
                    fecha_inicio: fechaDesde || undefined,
                    fecha_fin: fechaHasta || undefined,
                    categoria: categoriaFilter === "all" ? undefined : categoriaFilter,
                }
            });
            setGastos(res.data?.data || []);
        } catch (error) {
            console.error(error);
            showError("Error al cargar los gastos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGastos();
    }, [fechaDesde, fechaHasta, categoriaFilter]);

    const toggleSort = (key: keyof Gasto) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const sortedAndFilteredGastos = useMemo(() => {
        let result = [...gastos];

        // Filter by search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (g) =>
                    g.descripcion.toLowerCase().includes(q) ||
                    g.proveedor?.toLowerCase().includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (sortConfig.direction === "asc") {
                return valA < valB ? -1 : 1;
            } else {
                return valA > valB ? -1 : 1;
            }
        });

        return result;
    }, [gastos, search, sortConfig]);

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "¿Eliminar gasto?",
            description: "Esta acción marcará el gasto como inactivo. Se puede revertir desde la base de datos.",
            confirmLabel: "Eliminar",
            variant: "destructive",
        });

        if (!ok) return;

        try {
            await api.delete(`/api/admin/purchases/${id}`);
            showSuccess("Gasto eliminado");
            loadGastos();
        } catch (error) {
            showError("Error al eliminar el gasto");
        }
    };

    const openCreate = () => {
        setEditingGasto(null);
        setIsDrawerOpen(true);
    };

    const openEdit = (gasto: Gasto) => {
        setEditingGasto(gasto);
        setIsDrawerOpen(true);
    };

    const getCategoriaIcon = (cat: string) => {
        switch (cat) {
            case "material": return <Receipt size={14} />;
            case "combustible": return <Filter size={14} />;
            case "herramientas": return <Tag size={14} />;
            default: return <Building2 size={14} />;
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compras y Gastos</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gestión centralizada de salidas financieras y facturas de proveedores.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <UniversalExportButton
                        module="gastos"
                        queryParams={{ search, fechaDesde, fechaHasta, categoria: categoriaFilter }}
                        label="Exportar CSV"
                    />
                    <Button
                        onClick={() => setShowBankImport(true)}
                        variant="outline"
                        className="rounded-xl h-11 px-5 gap-2 active:scale-95 transition-all"
                    >
                        <FileText size={18} />
                        <span>Importar Extracto</span>
                    </Button>
                    <Button
                        onClick={openCreate}
                        className="bg-black text-white hover:bg-slate-800 rounded-xl h-11 px-5 gap-2 shadow-lg active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        <span>Nuevo Gasto</span>
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por proveedor o descripción..."
                        className="pl-10 bg-slate-50 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none border-none py-1"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                        />
                        <span className="text-slate-300 mx-1">—</span>
                        <input
                            type="date"
                            className="bg-transparent text-sm outline-none border-none py-1"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                        />
                    </div>

                    <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                        <SelectTrigger className="w-[160px] bg-slate-50 border-none h-11 rounded-xl">
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="material">Material</SelectItem>
                            <SelectItem value="combustible">Combustible</SelectItem>
                            <SelectItem value="herramientas">Herramientas</SelectItem>
                            <SelectItem value="oficina">Oficina</SelectItem>
                        </SelectContent>
                    </Select>

                    {(search || fechaDesde || fechaHasta || categoriaFilter !== "all") && (
                        <Button
                            variant="ghost"
                            className="h-11 px-4 text-slate-500 hover:text-black hover:bg-slate-100 rounded-xl"
                            onClick={() => {
                                setSearch("");
                                setFechaDesde("");
                                setFechaHasta("");
                                setCategoriaFilter("all");
                            }}
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <Th label="Fecha" sortKey="fecha_compra" currentSort={sortConfig} onSort={toggleSort} className="w-[140px]" />
                                <Th label="Proveedor" sortKey="proveedor" currentSort={sortConfig} onSort={toggleSort} />
                                <Th label="Descripción" sortKey="descripcion" currentSort={sortConfig} onSort={toggleSort} />
                                <Th label="Categoría" sortKey="categoria" currentSort={sortConfig} onSort={toggleSort} className="w-[140px]" />
                                <Th label="Método" sortKey="metodo_pago" currentSort={sortConfig} onSort={toggleSort} className="w-[140px]" />
                                <Th label="Importe" sortKey="total" currentSort={sortConfig} onSort={toggleSort} className="text-right w-[140px]" />
                                <th className="p-4 text-right font-medium text-slate-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : sortedAndFilteredGastos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-0">
                                        <EmptyState
                                            icon={FileText}
                                            title="No se encontraron gastos"
                                            description="Prueba a ajustar los filtros o registra un nuevo gasto."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {sortedAndFilteredGastos.map((gasto) => (
                                        <motion.tr
                                            key={gasto.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            onDoubleClick={() => openEdit(gasto)}
                                        >
                                            <td className="p-4 whitespace-nowrap text-slate-600 font-medium">
                                                {format(new Date(gasto.fecha_compra), "dd/MM/yyyy")}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-900 line-clamp-1">
                                                        {gasto.proveedor || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                <span className="line-clamp-1" title={gasto.descripcion}>
                                                    {gasto.descripcion}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className="bg-white px-2 py-0.5 rounded-lg border-slate-200 capitalize font-normal text-slate-600 gap-1.5 shadow-sm">
                                                    {getCategoriaIcon(gasto.categoria)}
                                                    {gasto.categoria}
                                                </Badge>
                                            </td>
                                            <td className="p-4 capitalize text-slate-500 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <CreditCard size={12} />
                                                    {gasto.metodo_pago}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                                {formatCurrency(gasto.total)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-slate-200 text-slate-600"
                                                        onClick={(e) => { e.stopPropagation(); openEdit(gasto); }}
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-red-100 hover:text-red-600 text-slate-600"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(gasto.id); }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totales Summary Footer */}
                {!loading && sortedAndFilteredGastos.length > 0 && (
                    <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                            Mostrando {sortedAndFilteredGastos.length} de {gastos.length} gastos
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-slate-500">TOTAL SELECCIÓN:</span>
                            <span className="text-xl font-black text-black">
                                {formatCurrency(sortedAndFilteredGastos.reduce((acc, g) => acc + Number(g.total), 0))}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Drawer */}
            <DrawerGastoAdmin
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSuccess={loadGastos}
                editingGasto={editingGasto}
            />

            {/* Bank Import Dialog */}
            <BankImportDialog
                open={showBankImport}
                onClose={() => setShowBankImport(false)}
                onSuccess={loadGastos}
            />
        </div>
    );
}

function Th({ label, sortKey, currentSort, onSort, className = "" }: {
    label: string;
    sortKey: keyof Gasto;
    currentSort: SortConfig;
    onSort: (k: keyof Gasto) => void;
    className?: string;
}) {
    const isActive = currentSort.key === sortKey;

    return (
        <th
            className={`p-4 font-semibold text-slate-500 select-none cursor-pointer hover:bg-slate-100 transition-colors ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-1.5 ${className.includes('text-right') ? 'justify-end' : ''}`}>
                {label}
                <div className="flex flex-col">
                    <ChevronUp size={10} className={isActive && currentSort.direction === 'asc' ? 'text-black' : 'text-slate-300'} />
                    <ChevronDown size={10} className={isActive && currentSort.direction === 'desc' ? 'text-black' : 'text-slate-300'} />
                </div>
            </div>
        </th>
    )
}
