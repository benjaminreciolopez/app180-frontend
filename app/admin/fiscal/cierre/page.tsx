"use client";

import { useEffect, useState, useCallback } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import {
    CheckCircle2, Circle, Clock, Lock, Unlock, RefreshCw, FileText,
    TrendingUp, TrendingDown, AlertTriangle, BookOpen, Calculator,
    ArrowRightLeft, DoorOpen
} from "lucide-react";

interface CierreData {
    id: string;
    empresa_id: string;
    ejercicio: number;
    estado: string;
    facturas_revisadas: boolean;
    gastos_conciliados: boolean;
    nominas_cerradas: boolean;
    amortizaciones_calculadas: boolean;
    modelo_303_4t_presentado: boolean;
    modelo_390_presentado: boolean;
    modelo_111_4t_presentado: boolean;
    modelo_115_4t_presentado: boolean;
    modelo_130_4t_presentado: boolean;
    modelo_190_presentado: boolean;
    modelo_180_presentado: boolean;
    modelo_347_presentado: boolean;
    modelo_349_4t_presentado: boolean;
    regularizacion_iva_hecha: boolean;
    asiento_regularizacion: boolean;
    asiento_cierre: boolean;
    asiento_apertura: boolean;
    resultado_ejercicio: number | null;
    resultado_tipo: string | null;
    total_ingresos: number;
    total_gastos: number;
    total_iva_devengado: number;
    total_iva_soportado: number;
    total_retenciones: number;
    total_nominas_bruto: number;
    total_ss_empresa: number;
    notas: string | null;
    cerrado_at: string | null;
    reabierto_at: string | null;
    progress: number;
    total_items: number;
    completed_items: number;
}

interface LogEntry {
    id: string;
    accion: string;
    detalle: string | null;
    usuario_nombre: string | null;
    usuario_email: string | null;
    created_at: string;
}

const CHECKLIST_GROUPS = [
    {
        title: "Facturacion",
        items: [
            { key: "facturas_revisadas", label: "Facturas revisadas y validadas" },
            { key: "gastos_conciliados", label: "Gastos conciliados" },
        ],
    },
    {
        title: "Nominas",
        items: [
            { key: "nominas_cerradas", label: "Nominas cerradas" },
        ],
    },
    {
        title: "Modelos Trimestrales 4T",
        items: [
            { key: "modelo_303_4t_presentado", label: "Modelo 303 (IVA) 4T presentado" },
            { key: "modelo_111_4t_presentado", label: "Modelo 111 (Retenciones) 4T presentado" },
            { key: "modelo_115_4t_presentado", label: "Modelo 115 (Alquileres) 4T presentado" },
            { key: "modelo_130_4t_presentado", label: "Modelo 130 (IRPF) 4T presentado" },
            { key: "modelo_349_4t_presentado", label: "Modelo 349 (Intracomunitarias) 4T presentado" },
        ],
    },
    {
        title: "Modelos Anuales",
        items: [
            { key: "modelo_390_presentado", label: "Modelo 390 (Resumen anual IVA) presentado" },
            { key: "modelo_190_presentado", label: "Modelo 190 (Resumen retenciones) presentado" },
            { key: "modelo_180_presentado", label: "Modelo 180 (Retenciones alquileres) presentado" },
            { key: "modelo_347_presentado", label: "Modelo 347 (Operaciones >3.005,06) presentado" },
        ],
    },
    {
        title: "Contabilidad",
        items: [
            { key: "amortizaciones_calculadas", label: "Amortizaciones calculadas" },
            { key: "regularizacion_iva_hecha", label: "Regularizacion IVA realizada" },
            { key: "asiento_regularizacion", label: "Asiento de regularizacion generado" },
            { key: "asiento_cierre", label: "Asiento de cierre generado" },
            { key: "asiento_apertura", label: "Asiento de apertura generado" },
        ],
    },
];

export default function CierreEjercicioPage() {
    const [ejercicio, setEjercicio] = useState((new Date().getFullYear() - 1).toString());
    const [loading, setLoading] = useState(false);
    const [cierre, setCierre] = useState<CierreData | null>(null);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [motivoReabrir, setMotivoReabrir] = useState("");
    const [showReabrirDialog, setShowReabrirDialog] = useState(false);

    const basePath = "/api/admin/fiscal/cierre";

    const loadCierre = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${basePath}/${ejercicio}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) setCierre(json.data);
            }
        } catch (error) {
            console.error("Error loading cierre:", error);
        } finally {
            setLoading(false);
        }
    }, [ejercicio]);

    const loadLog = useCallback(async () => {
        try {
            const res = await authenticatedFetch(`${basePath}/${ejercicio}/log`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) setLog(json.data);
            }
        } catch (error) {
            console.error("Error loading log:", error);
        }
    }, [ejercicio]);

    useEffect(() => {
        loadCierre();
        loadLog();
    }, [ejercicio, loadCierre, loadLog]);

    const handleChecklistChange = async (field: string, value: boolean) => {
        if (!cierre || cierre.estado === "cerrado") return;

        try {
            const res = await authenticatedFetch(`${basePath}/${ejercicio}/checklist`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setCierre(json.data);
                    loadLog();
                }
            }
        } catch (error) {
            console.error("Error updating checklist:", error);
        }
    };

    const handleAction = async (action: string, method = "POST", body?: any) => {
        setActionLoading(action);
        try {
            const res = await authenticatedFetch(`${basePath}/${ejercicio}/${action}`, {
                method,
                headers: { "Content-Type": "application/json" },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const json = await res.json();
            if (!res.ok) {
                alert(json.error || "Error en la operacion");
                return;
            }
            await loadCierre();
            await loadLog();
        } catch (error) {
            console.error("Error:", error);
            alert("Error ejecutando la accion");
        } finally {
            setActionLoading(null);
        }
    };

    const isClosed = cierre?.estado === "cerrado";
    const allComplete = cierre?.progress === 100;

    const estadoBadge = (estado: string) => {
        switch (estado) {
            case "cerrado":
                return <Badge className="bg-green-100 text-green-800 border-green-300">Cerrado</Badge>;
            case "en_progreso":
                return <Badge className="bg-amber-100 text-amber-800 border-amber-300">En Progreso</Badge>;
            case "reabierto":
                return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Reabierto</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-600 border-slate-300">Pendiente</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cierre de Ejercicio</h1>
                    <p className="text-muted-foreground text-sm">
                        Proceso de cierre fiscal del ejercicio. Revisa todos los puntos antes de cerrar.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={ejercicio} onValueChange={setEjercicio}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Ejercicio" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {cierre && estadoBadge(cierre.estado)}
                </div>
            </div>

            {loading && <LoadingSpinner />}

            {!loading && cierre && (
                <>
                    {/* Progress Bar */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Progreso del cierre</span>
                                <span className="text-sm text-muted-foreground">
                                    {cierre.completed_items} / {cierre.total_items} completados ({cierre.progress}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        cierre.progress === 100 ? "bg-green-500" :
                                        cierre.progress > 50 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${cierre.progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result + Summary Cards */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                        {/* Resultado del Ejercicio */}
                        <Card className={`border-2 ${
                            cierre.resultado_tipo === "beneficio" ? "border-green-300 bg-green-50" :
                            cierre.resultado_tipo === "perdida" ? "border-red-300 bg-red-50" :
                            "border-slate-200"
                        }`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    {cierre.resultado_tipo === "beneficio" ?
                                        <TrendingUp className="h-5 w-5 text-green-600" /> :
                                        cierre.resultado_tipo === "perdida" ?
                                        <TrendingDown className="h-5 w-5 text-red-600" /> :
                                        <Calculator className="h-5 w-5" />
                                    }
                                    Resultado del Ejercicio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {cierre.resultado_ejercicio !== null ? (
                                    <div className="text-center">
                                        <p className={`text-3xl font-bold ${
                                            cierre.resultado_tipo === "beneficio" ? "text-green-700" : "text-red-700"
                                        }`}>
                                            {formatCurrency(cierre.resultado_ejercicio)}
                                        </p>
                                        <p className={`text-sm font-semibold uppercase tracking-wider mt-1 ${
                                            cierre.resultado_tipo === "beneficio" ? "text-green-600" : "text-red-600"
                                        }`}>
                                            {cierre.resultado_tipo === "beneficio" ? "BENEFICIO" : "PERDIDA"}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground text-sm">
                                        Pulsa "Recalcular resumen" para obtener el resultado
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ingresos y Gastos */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Ingresos y Gastos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Ingresos:</span>
                                    <span className="font-medium text-green-600">+{formatCurrency(cierre.total_ingresos)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Gastos:</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(cierre.total_gastos)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nominas Bruto:</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(cierre.total_nominas_bruto)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">SS Empresa:</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(cierre.total_ss_empresa)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* IVA y Retenciones */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">IVA y Retenciones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IVA Devengado:</span>
                                    <span className="font-medium">{formatCurrency(cierre.total_iva_devengado)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IVA Soportado:</span>
                                    <span className="font-medium">{formatCurrency(cierre.total_iva_soportado)}</span>
                                </div>
                                <div className="border-t pt-1 flex justify-between">
                                    <span className="text-muted-foreground">Dif. IVA:</span>
                                    <span className="font-bold">
                                        {formatCurrency(cierre.total_iva_devengado - cierre.total_iva_soportado)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Retenciones:</span>
                                    <span className="font-medium">{formatCurrency(cierre.total_retenciones)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action Buttons */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Acciones</CardTitle>
                            <CardDescription>Genera los asientos contables y recalcula el resumen.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction("calcular")}
                                    disabled={!!actionLoading}
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${actionLoading === "calcular" ? "animate-spin" : ""}`} />
                                    Recalcular resumen
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction("asiento-regularizacion")}
                                    disabled={!!actionLoading || isClosed}
                                >
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    {actionLoading === "asiento-regularizacion" ? "Generando..." : "Asiento regularizacion IVA"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction("asiento-cierre")}
                                    disabled={!!actionLoading || isClosed}
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    {actionLoading === "asiento-cierre" ? "Generando..." : "Asiento de cierre"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction("asiento-apertura")}
                                    disabled={!!actionLoading || isClosed}
                                >
                                    <DoorOpen className="mr-2 h-4 w-4" />
                                    {actionLoading === "asiento-apertura" ? "Generando..." : "Asiento de apertura"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checklist */}
                    <div className="space-y-4">
                        {CHECKLIST_GROUPS.map(group => (
                            <Card key={group.title}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{group.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {group.items.map(item => {
                                        const checked = !!(cierre as any)[item.key];
                                        return (
                                            <div key={item.key} className="flex items-center justify-between py-1">
                                                <div className="flex items-center gap-3">
                                                    {checked ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-slate-300" />
                                                    )}
                                                    <span className={`text-sm ${checked ? "text-green-800" : ""}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <Switch
                                                    checked={checked}
                                                    onCheckedChange={(val) => handleChecklistChange(item.key, val)}
                                                    disabled={isClosed}
                                                />
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Cerrar / Reabrir */}
                    <Card className="border-2 border-dashed">
                        <CardContent className="pt-6">
                            {!isClosed ? (
                                <div className="text-center space-y-3">
                                    {!allComplete && (
                                        <div className="flex items-center justify-center gap-2 text-amber-600 text-sm">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span>Completa todos los items del checklist para poder cerrar el ejercicio</span>
                                        </div>
                                    )}
                                    <Button
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={!allComplete || !!actionLoading}
                                        onClick={() => handleAction("cerrar")}
                                    >
                                        <Lock className="mr-2 h-5 w-5" />
                                        {actionLoading === "cerrar" ? "Cerrando..." : "Cerrar Ejercicio"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <p className="text-green-700 font-semibold flex items-center justify-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Ejercicio {ejercicio} cerrado
                                        {cierre.cerrado_at && (
                                            <span className="text-sm font-normal text-muted-foreground">
                                                ({new Date(cierre.cerrado_at).toLocaleDateString("es-ES")})
                                            </span>
                                        )}
                                    </p>
                                    {!showReabrirDialog ? (
                                        <Button
                                            variant="outline"
                                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                            onClick={() => setShowReabrirDialog(true)}
                                        >
                                            <Unlock className="mr-2 h-4 w-4" />
                                            Reabrir Ejercicio
                                        </Button>
                                    ) : (
                                        <div className="space-y-2 max-w-md mx-auto">
                                            <input
                                                type="text"
                                                placeholder="Motivo de reapertura..."
                                                value={motivoReabrir}
                                                onChange={(e) => setMotivoReabrir(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                            />
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => { setShowReabrirDialog(false); setMotivoReabrir(""); }}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-orange-600 hover:bg-orange-700"
                                                    disabled={!motivoReabrir.trim() || !!actionLoading}
                                                    onClick={() => {
                                                        handleAction("reabrir", "POST", { motivo: motivoReabrir });
                                                        setShowReabrirDialog(false);
                                                        setMotivoReabrir("");
                                                    }}
                                                >
                                                    Confirmar reapertura
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Log */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Historial de acciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {log.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Sin acciones registradas</p>
                            ) : (
                                <div className="space-y-3">
                                    {log.map(entry => (
                                        <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3">
                                            <div className="flex-1">
                                                <p className="font-medium">{formatActionLabel(entry.accion)}</p>
                                                {entry.detalle && (
                                                    <p className="text-muted-foreground text-xs mt-0.5">{entry.detalle}</p>
                                                )}
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                                <p>{entry.usuario_nombre || entry.usuario_email || ""}</p>
                                                <p>{new Date(entry.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

function formatActionLabel(accion: string): string {
    const labels: Record<string, string> = {
        checklist_update: "Checklist actualizado",
        resumen_calculado: "Resumen recalculado",
        asiento_regularizacion_iva: "Asiento regularizacion IVA generado",
        asiento_cierre: "Asiento de cierre generado",
        asiento_apertura: "Asiento de apertura generado",
        ejercicio_cerrado: "Ejercicio cerrado",
        ejercicio_reabierto: "Ejercicio reabierto",
    };
    return labels[accion] || accion;
}
