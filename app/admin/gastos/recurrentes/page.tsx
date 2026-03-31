"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    Plus,
    Search,
    Pencil,
    Play,
    Trash2,
    RefreshCw,
    MoreVertical,
    Pause,
    CheckCircle2,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import DrawerGastoRecurrente from "@/components/admin/drawer/DrawerGastoRecurrente";
import DialogEjecutarRecurrente from "@/components/admin/dialogs/DialogEjecutarRecurrente";

type GastoRecurrente = {
    id: number;
    nombre: string;
    proveedor: string | null;
    descripcion: string | null;
    total: number;
    base_imponible: number;
    iva_porcentaje: number;
    iva_importe: number;
    retencion_porcentaje: number;
    retencion_importe: number;
    categoria: string;
    metodo_pago: string;
    cuenta_contable: string | null;
    dia_ejecucion: number;
    activo: boolean;
    ultima_ejecucion: string | null;
};

export default function GastosRecurrentesPage() {
    const confirm = useConfirm();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [plantillas, setPlantillas] = useState<GastoRecurrente[]>([]);
    const [search, setSearch] = useState("");

    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editing, setEditing] = useState<GastoRecurrente | null>(null);
    const [prefillData, setPrefillData] = useState<Record<string, string> | undefined>(undefined);

    // Dialog ejecutar
    const [ejecutarDialog, setEjecutarDialog] = useState<GastoRecurrente | null>(null);

    const loadPlantillas = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/admin/gastos-recurrentes");
            setPlantillas(res.data?.data || []);
        } catch {
            showError("Error al cargar gastos recurrentes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlantillas();
    }, []);

    // Abrir drawer con prefill desde URL (notificación de sugerencia)
    useEffect(() => {
        if (searchParams.get("crear") === "true") {
            const prefill: Record<string, string> = {};
            for (const [key, value] of searchParams.entries()) {
                if (key !== "crear") prefill[key] = value;
            }
            setPrefillData(Object.keys(prefill).length > 0 ? prefill : undefined);
            setEditing(null);
            setIsDrawerOpen(true);
        }
    }, [searchParams]);

    const filtered = useMemo(() => {
        if (!search) return plantillas;
        const q = search.toLowerCase();
        return plantillas.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.proveedor?.toLowerCase().includes(q) ||
            p.categoria.toLowerCase().includes(q)
        );
    }, [plantillas, search]);

    const handleDelete = async (p: GastoRecurrente) => {
        const ok = await confirm({
            title: "¿Eliminar gasto recurrente?",
            description: `Se eliminará la plantilla "${p.nombre}". Los gastos ya ejecutados no se verán afectados.`,
            confirmLabel: "Eliminar",
            variant: "destructive",
        });
        if (!ok) return;

        try {
            await api.delete(`/api/admin/gastos-recurrentes/${p.id}`);
            showSuccess("Gasto recurrente eliminado");
            loadPlantillas();
        } catch {
            showError("Error al eliminar");
        }
    };

    const handleToggleActivo = async (p: GastoRecurrente) => {
        try {
            await api.put(`/api/admin/gastos-recurrentes/${p.id}`, { activo: !p.activo });
            showSuccess(p.activo ? "Gasto pausado" : "Gasto activado");
            loadPlantillas();
        } catch {
            showError("Error al cambiar estado");
        }
    };

    const openCreate = () => {
        setEditing(null);
        setPrefillData(undefined);
        setIsDrawerOpen(true);
    };

    const openEdit = (p: GastoRecurrente) => {
        setEditing(p);
        setPrefillData(undefined);
        setIsDrawerOpen(true);
    };

    return (
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gastos Recurrentes</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Plantillas de gastos que se ejecutan automáticamente cada mes o manualmente.
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus size={16} className="mr-2" /> Nuevo recurrente
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre, proveedor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<RefreshCw size={48} className="text-muted-foreground" />}
                    title="Sin gastos recurrentes"
                    description="Crea una plantilla para automatizar tus gastos mensuales."
                />
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Proveedor</th>
                                <th className="text-right px-4 py-3 font-medium">Total</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Categoría</th>
                                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Día</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Última ejecución</th>
                                <th className="text-center px-4 py-3 font-medium">Estado</th>
                                <th className="text-right px-4 py-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.map((p) => (
                                <tr key={p.id} className={`hover:bg-muted/30 transition ${!p.activo ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{p.nombre}</div>
                                        <div className="text-xs text-muted-foreground md:hidden">{p.proveedor}</div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                        {p.proveedor || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        {formatCurrency(p.total)}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        <Badge variant="secondary" className="capitalize text-xs">
                                            {p.categoria}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center hidden md:table-cell">
                                        {p.dia_ejecucion}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                                        {p.ultima_ejecucion
                                            ? format(new Date(p.ultima_ejecucion), "dd MMM yyyy", { locale: es })
                                            : "Nunca"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {p.activo ? (
                                            <Badge variant="default" className="text-xs">Activo</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Pausado</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEdit(p)}>
                                                    <Pencil size={14} className="mr-2" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setEjecutarDialog(p)}>
                                                    <Play size={14} className="mr-2" /> Ejecutar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActivo(p)}>
                                                    {p.activo ? (
                                                        <><Pause size={14} className="mr-2" /> Pausar</>
                                                    ) : (
                                                        <><CheckCircle2 size={14} className="mr-2" /> Activar</>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(p)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 size={14} className="mr-2" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Drawer crear/editar */}
            <DrawerGastoRecurrente
                isOpen={isDrawerOpen}
                onClose={() => { setIsDrawerOpen(false); setEditing(null); setPrefillData(undefined); }}
                onSuccess={loadPlantillas}
                editing={editing}
                prefillData={prefillData}
            />

            {/* Dialog ejecutar */}
            <DialogEjecutarRecurrente
                isOpen={!!ejecutarDialog}
                onClose={() => setEjecutarDialog(null)}
                onSuccess={loadPlantillas}
                plantilla={ejecutarDialog}
            />
        </div>
    );
}
