"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, FolderTree, ChevronRight, ChevronDown, Pencil, Merge, Loader2 } from "lucide-react";
import ExportButton from "@/components/admin/contabilidad/ExportButton";
import { useCuentas, useCreateCuenta, useUpdateCuenta, useMergeCuentas, useInitializePGC, type Cuenta } from "@/hooks/useCuentas";

// Cuenta type imported from @/hooks/useCuentas

const GRUPOS: Record<number, string> = {
    1: "Financiacion basica",
    2: "Inmovilizado",
    3: "Existencias",
    4: "Acreedores y deudores",
    5: "Cuentas financieras",
    6: "Compras y gastos",
    7: "Ventas e ingresos",
};

const TIPOS = ["activo", "pasivo", "patrimonio", "ingreso", "gasto"] as const;

const TIPO_COLORS: Record<string, string> = {
    activo: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    pasivo: "bg-red-100 text-red-800 hover:bg-red-100",
    patrimonio: "bg-green-100 text-green-800 hover:bg-green-100",
    ingreso: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    gasto: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

const NIVEL_INDENT: Record<number, string> = {
    1: "pl-0",
    2: "pl-6",
    3: "pl-12",
    4: "pl-18",
};

const isTercero = (codigo: string) => /^(4300|4000)\d+/.test(codigo);

export default function PlanCuentasPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [showInactive, setShowInactive] = useState(false);
    const [collapsedGrupos, setCollapsedGrupos] = useState<Set<number>>(new Set());

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // React Query hooks
    const { data: cuentas = [], isLoading: loading } = useCuentas({
        grupo: filtroGrupo,
        tipo: filtroTipo,
        search: debouncedSearch,
    });
    const createCuenta = useCreateCuenta();
    const updateCuenta = useUpdateCuenta();
    const mergeCuentas = useMergeCuentas();
    const initPGC = useInitializePGC();

    // New cuenta dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newCuenta, setNewCuenta] = useState({
        codigo: "",
        nombre: "",
        tipo: "activo",
        grupo: "1",
    });

    // Edit cuenta dialog
    const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null);
    const [editNombre, setEditNombre] = useState("");
    const [editActiva, setEditActiva] = useState(true);

    // Merge dialog
    const [mergeSource, setMergeSource] = useState<Cuenta | null>(null);
    const [mergeTargetCodigo, setMergeTargetCodigo] = useState("");
    const [mergeError, setMergeError] = useState("");
    const [mergeResult, setMergeResult] = useState("");

    const handleInitializePGC = async () => {
        try {
            await initPGC.mutateAsync();
        } catch (err: any) {
            alert(err.message || "Error inicializando PGC");
        }
    };

    const handleCreateCuenta = async () => {
        if (!newCuenta.codigo || !newCuenta.nombre) return;
        try {
            await createCuenta.mutateAsync({
                codigo: newCuenta.codigo,
                nombre: newCuenta.nombre,
                tipo: newCuenta.tipo,
                grupo: parseInt(newCuenta.grupo),
            });
            setDialogOpen(false);
            setNewCuenta({ codigo: "", nombre: "", tipo: "activo", grupo: "1" });
        } catch (err: any) {
            alert(err.message || "Error creando cuenta");
        }
    };

    // Edit handlers
    const startEdit = (cuenta: Cuenta) => {
        setEditingCuenta(cuenta);
        setEditNombre(cuenta.nombre);
        setEditActiva(cuenta.activa);
    };

    const handleSaveEdit = async () => {
        if (!editingCuenta || !editNombre.trim()) return;
        try {
            await updateCuenta.mutateAsync({ id: editingCuenta.id, nombre: editNombre.trim(), activa: editActiva });
            setEditingCuenta(null);
        } catch (err: any) {
            alert(err.message || "Error actualizando cuenta");
        }
    };

    // Merge handlers
    const startMerge = (cuenta: Cuenta) => {
        setMergeSource(cuenta);
        setMergeTargetCodigo("");
        setMergeError("");
        setMergeResult("");
    };

    const handleMerge = async () => {
        if (!mergeSource || !mergeTargetCodigo.trim()) return;
        setMergeError("");
        setMergeResult("");
        try {
            const data = await mergeCuentas.mutateAsync({
                source_codigo: mergeSource.codigo,
                target_codigo: mergeTargetCodigo.trim(),
            });
            setMergeResult(`Fusionadas correctamente. ${data.lineas_actualizadas} lineas de asientos actualizadas.`);
            setTimeout(() => { setMergeSource(null); setMergeResult(""); }, 2000);
        } catch (err: any) {
            setMergeError(err.message || "Error de conexion");
        }
    };

    const toggleGrupo = (grupo: number) => {
        setCollapsedGrupos((prev) => {
            const next = new Set(prev);
            if (next.has(grupo)) {
                next.delete(grupo);
            } else {
                next.add(grupo);
            }
            return next;
        });
    };

    // Filter and group cuentas
    const filteredCuentas = cuentas.filter((c) => {
        if (!showInactive && !c.activa) return false;
        return true;
    });

    const groupedCuentas: Record<number, Cuenta[]> = {};
    for (const cuenta of filteredCuentas) {
        if (!groupedCuentas[cuenta.grupo]) {
            groupedCuentas[cuenta.grupo] = [];
        }
        groupedCuentas[cuenta.grupo].push(cuenta);
    }

    for (const grupo of Object.keys(groupedCuentas)) {
        groupedCuentas[parseInt(grupo)].sort((a, b) => a.codigo.localeCompare(b.codigo));
    }

    const sortedGrupos = Object.keys(groupedCuentas)
        .map(Number)
        .sort((a, b) => a - b);

    const showInitButton = !loading && cuentas.length === 0;

    // Get merge target candidates (same prefix as source, excluding source itself)
    const mergeTargetOptions = mergeSource
        ? cuentas.filter(
              (c) =>
                  c.codigo !== mergeSource.codigo &&
                  c.activa &&
                  c.codigo.substring(0, 4) === mergeSource.codigo.substring(0, 4) &&
                  c.codigo.length > 4
          )
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FolderTree className="h-8 w-8 text-indigo-600" />
                        Plan General Contable
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Estructura de cuentas contables segun PGC PYMES
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton
                        endpoint="cuentas/exportar"
                        params={{}}
                        filenamePrefix="plan_cuentas"
                        label="Exportar"
                    />
                    {showInitButton && (
                        <Button
                            onClick={handleInitializePGC}
                            disabled={initPGC.isPending}
                            variant="outline"
                            className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                            {initPGC.isPending ? "Inicializando..." : "Inicializar PGC PYMES"}
                        </Button>
                    )}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl gap-2">
                                <Plus className="h-4 w-4" />
                                Nueva Cuenta
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-xl">
                            <DialogHeader>
                                <DialogTitle>Nueva Cuenta Contable</DialogTitle>
                                <DialogDescription>
                                    Crea una cuenta personalizada en el plan contable.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Codigo
                                    </label>
                                    <Input
                                        placeholder="Ej: 4300001"
                                        value={newCuenta.codigo}
                                        onChange={(e) =>
                                            setNewCuenta({ ...newCuenta, codigo: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Nombre
                                    </label>
                                    <Input
                                        placeholder="Nombre de la cuenta"
                                        value={newCuenta.nombre}
                                        onChange={(e) =>
                                            setNewCuenta({ ...newCuenta, nombre: e.target.value })
                                        }
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Tipo
                                    </label>
                                    <Select
                                        value={newCuenta.tipo}
                                        onValueChange={(v) =>
                                            setNewCuenta({ ...newCuenta, tipo: v })
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {TIPOS.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Grupo
                                    </label>
                                    <Select
                                        value={newCuenta.grupo}
                                        onValueChange={(v) =>
                                            setNewCuenta({ ...newCuenta, grupo: v })
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(GRUPOS).map(([num, name]) => (
                                                <SelectItem key={num} value={num}>
                                                    {num} - {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    className="rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCreateCuenta}
                                    disabled={createCuenta.isPending || !newCuenta.codigo || !newCuenta.nombre}
                                    className="rounded-xl"
                                >
                                    {createCuenta.isPending ? "Guardando..." : "Crear Cuenta"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por codigo o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Grupo
                            </label>
                            <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
                                <SelectTrigger className="w-48 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                    <SelectItem value="todos">Todos los grupos</SelectItem>
                                    {Object.entries(GRUPOS).map(([num, name]) => (
                                        <SelectItem key={num} value={num}>
                                            {num} - {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Tipo
                            </label>
                            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                <SelectTrigger className="w-40 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                    <SelectItem value="todos">Todos</SelectItem>
                                    {TIPOS.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant={showInactive ? "default" : "outline"}
                            onClick={() => setShowInactive(!showInactive)}
                            className="rounded-xl text-sm"
                            size="sm"
                        >
                            {showInactive ? "Ocultar inactivas" : "Mostrar inactivas"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Cuentas tree */}
            {loading ? (
                <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                    <CardContent className="py-16">
                        <div className="text-center text-slate-400">
                            <div className="animate-spin h-8 w-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-4" />
                            <p className="text-sm">Cargando plan de cuentas...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : sortedGrupos.length === 0 ? (
                <Card className="bg-white rounded-xl border-slate-100 shadow-sm">
                    <CardContent className="py-16">
                        <div className="text-center text-slate-400">
                            <FolderTree className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No hay cuentas contables</p>
                            <p className="text-sm mt-1">
                                Inicializa el Plan General Contable para PYMES o crea cuentas manualmente.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sortedGrupos.map((grupo) => {
                        const isCollapsed = collapsedGrupos.has(grupo);
                        const cuentasGrupo = groupedCuentas[grupo];

                        return (
                            <Card
                                key={grupo}
                                className="bg-white rounded-xl border-slate-100 shadow-sm overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleGrupo(grupo)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isCollapsed ? (
                                            <ChevronRight className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        )}
                                        <span className="text-lg font-bold text-slate-800">
                                            Grupo {grupo}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {GRUPOS[grupo]}
                                        </span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {cuentasGrupo.length} cuenta{cuentasGrupo.length !== 1 ? "s" : ""}
                                    </Badge>
                                </button>

                                {!isCollapsed && (
                                    <div className="border-t border-slate-100">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead className="font-semibold text-slate-600 w-40">
                                                        Codigo
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-slate-600">
                                                        Nombre
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-slate-600 w-28">
                                                        Tipo
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-slate-600 w-24 text-center">
                                                        Estado
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-slate-600 w-24 text-center">
                                                        Origen
                                                    </TableHead>
                                                    <TableHead className="font-semibold text-slate-600 w-20 text-center">
                                                        Acciones
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cuentasGrupo.map((cuenta) => {
                                                    const indent = NIVEL_INDENT[cuenta.nivel] || "pl-0";
                                                    const isBold = cuenta.nivel === 1;
                                                    const canEdit = !cuenta.es_estandar || isTercero(cuenta.codigo);
                                                    const canMerge = isTercero(cuenta.codigo) && cuenta.activa;

                                                    return (
                                                        <TableRow
                                                            key={cuenta.id}
                                                            className={`hover:bg-slate-50/50 ${
                                                                !cuenta.activa ? "opacity-50" : ""
                                                            }`}
                                                        >
                                                            <TableCell
                                                                className={`font-mono text-sm ${indent} ${
                                                                    isBold
                                                                        ? "font-bold text-slate-900"
                                                                        : "font-medium text-slate-700"
                                                                }`}
                                                            >
                                                                {cuenta.codigo}
                                                            </TableCell>
                                                            <TableCell
                                                                className={`text-sm ${
                                                                    isBold
                                                                        ? "font-bold text-slate-900"
                                                                        : "text-slate-700"
                                                                }`}
                                                            >
                                                                {cuenta.nombre}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    className={`text-xs ${
                                                                        TIPO_COLORS[cuenta.tipo] ||
                                                                        "bg-slate-100 text-slate-800"
                                                                    }`}
                                                                >
                                                                    {cuenta.tipo}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {cuenta.activa ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs border-green-200 text-green-700"
                                                                    >
                                                                        Activa
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs border-slate-200 text-slate-400"
                                                                    >
                                                                        Inactiva
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {cuenta.es_estandar ? (
                                                                    <span className="text-xs text-slate-400">
                                                                        PGC
                                                                    </span>
                                                                ) : (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs border-indigo-200 text-indigo-600"
                                                                    >
                                                                        Personalizada
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {canEdit && (
                                                                        <button
                                                                            onClick={() => startEdit(cuenta)}
                                                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                                                            title="Editar"
                                                                        >
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                    )}
                                                                    {canMerge && (
                                                                        <button
                                                                            onClick={() => startMerge(cuenta)}
                                                                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                            title="Fusionar con otra cuenta"
                                                                        >
                                                                            <Merge size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Edit cuenta dialog */}
            <Dialog open={!!editingCuenta} onOpenChange={(open) => { if (!open) setEditingCuenta(null); }}>
                <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Editar Cuenta</DialogTitle>
                        <DialogDescription>
                            {editingCuenta?.codigo} — {editingCuenta?.nombre}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Nombre</Label>
                            <Input
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className="rounded-xl border-slate-200"
                                placeholder="Nombre de la cuenta"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-700">Cuenta activa</Label>
                            <Switch checked={editActiva} onCheckedChange={setEditActiva} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCuenta(null)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={updateCuenta.isPending || !editNombre.trim()}
                            className="rounded-xl gap-2"
                        >
                            {updateCuenta.isPending && <Loader2 size={14} className="animate-spin" />}
                            {updateCuenta.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge dialog */}
            <Dialog open={!!mergeSource} onOpenChange={(open) => { if (!open) { setMergeSource(null); setMergeError(""); setMergeResult(""); } }}>
                <DialogContent className="sm:max-w-lg rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Fusionar Terceros</DialogTitle>
                        <DialogDescription>
                            La cuenta origen se desactivara y todos sus asientos se reasignaran a la cuenta destino.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase">Cuenta origen (se desactivara)</p>
                            <p className="text-sm font-mono font-medium">{mergeSource?.codigo} — {mergeSource?.nombre}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Cuenta destino</Label>
                            {mergeTargetOptions.length > 0 ? (
                                <Select value={mergeTargetCodigo} onValueChange={setMergeTargetCodigo}>
                                    <SelectTrigger className="rounded-xl border-slate-200">
                                        <SelectValue placeholder="Seleccionar cuenta destino..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-60">
                                        {mergeTargetOptions.map((c) => (
                                            <SelectItem key={c.codigo} value={c.codigo}>
                                                {c.codigo} — {c.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No hay otras cuentas del mismo tipo para fusionar.</p>
                            )}
                        </div>
                        {mergeError && (
                            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                                {mergeError}
                            </div>
                        )}
                        {mergeResult && (
                            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200">
                                {mergeResult}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setMergeSource(null); setMergeError(""); setMergeResult(""); }} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMerge}
                            disabled={mergeCuentas.isPending || !mergeTargetCodigo || !!mergeResult}
                            className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {mergeCuentas.isPending && <Loader2 size={14} className="animate-spin" />}
                            {mergeCuentas.isPending ? "Fusionando..." : "Fusionar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
