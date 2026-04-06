"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { FileText, AlertTriangle, CheckSquare, Square, Globe, Building, Users, Home, ReceiptEuro, ShieldAlert, CalendarDays, ExternalLink } from "lucide-react";
import FiscalAlertsPanel from "@/components/admin/fiscal/FiscalAlertsPanel";
import AeatModelLinks from "@/components/fiscal/AeatModelLinks";
import AeatQuickPanel from "@/components/fiscal/AeatQuickPanel";
import CalendarioFiscal from "@/components/fiscal/CalendarioFiscal";

const MODELOS_CONFIG = [
    { id: "303", label: "Modelo 303", desc: "IVA Trimestral", color: "blue", icon: ReceiptEuro, defaultOn: true },
    { id: "130", label: "Modelo 130", desc: "IRPF Autónomos", color: "orange", icon: Building, defaultOn: true },
    { id: "111", label: "Modelo 111", desc: "Retenciones IRPF", color: "purple", icon: Users, defaultOn: true },
    { id: "115", label: "Modelo 115", desc: "Retenciones Alquileres", color: "rose", icon: Home, defaultOn: false },
    { id: "349", label: "Modelo 349", desc: "Op. Intracomunitarias", color: "teal", icon: Globe, defaultOn: false },
];

const MODELOS_ANUALES_CONFIG = [
    { id: "390", label: "Modelo 390", desc: "IVA Resumen Anual", color: "blue", icon: FileText, defaultOn: false, annual: true },
    { id: "190", label: "Modelo 190", desc: "Retenciones Resumen Anual", color: "purple", icon: FileText, defaultOn: false, annual: true },
    { id: "180", label: "Modelo 180", desc: "Arrendamientos Resumen Anual", color: "rose", icon: FileText, defaultOn: false, annual: true },
    { id: "347", label: "Modelo 347", desc: "Operaciones Terceros", color: "emerald", icon: FileText, defaultOn: false, annual: true },
];

const BORDER_COLORS: Record<string, string> = {
    blue: "border-l-blue-500",
    orange: "border-l-orange-500",
    purple: "border-l-purple-500",
    rose: "border-l-rose-500",
    teal: "border-l-teal-500",
    emerald: "border-l-emerald-500",
};

export default function FiscalPage() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const initialTab = tabParam === "alertas" ? "alertas" : tabParam === "aeat" ? "aeat" : "modelos";
    const autoOpenSimulator = searchParams.get("openSimulator") === "true";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [trimestre, setTrimestre] = useState("1");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loadingAnual, setLoadingAnual] = useState(false);
    const [dataAnual, setDataAnual] = useState<Record<string, any>>({});
    const [cuotasCompensar303, setCuotasCompensar303] = useState("");

    // Checklist de modelos visibles
    const [visibleModelos, setVisibleModelos] = useState<Set<string>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("fiscal-modelos-visibles");
            if (saved) return new Set(JSON.parse(saved));
        }
        return new Set(MODELOS_CONFIG.filter(m => m.defaultOn).map(m => m.id));
    });

    const [visibleAnuales, setVisibleAnuales] = useState<Set<string>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("fiscal-anuales-visibles");
            if (saved) return new Set(JSON.parse(saved));
        }
        return new Set(MODELOS_ANUALES_CONFIG.filter(m => m.defaultOn).map(m => m.id));
    });

    const toggleModelo = (id: string) => {
        setVisibleModelos(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            localStorage.setItem("fiscal-modelos-visibles", JSON.stringify([...next]));
            return next;
        });
    };

    const toggleAnual = (id: string) => {
        setVisibleAnuales(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            localStorage.setItem("fiscal-anuales-visibles", JSON.stringify([...next]));
            return next;
        });
    };

    useEffect(() => {
        const month = new Date().getMonth() + 1;
        const currentQ = Math.ceil(month / 3).toString();
        setTrimestre(currentQ);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/fiscal/models?year=${year}&trimestre=${trimestre}`;
            if (cuotasCompensar303 && parseFloat(cuotasCompensar303) > 0) {
                url += `&cuotas_compensar_303=${cuotasCompensar303}`;
            }
            const res = await authenticatedFetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.success) setData(json.data);
            }
        } catch (error) {
            console.error("Error loading fiscal data:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadAnualData = async () => {
        if (visibleAnuales.size === 0) return;
        setLoadingAnual(true);
        const results: Record<string, any> = {};
        try {
            const modeloIds = ["390", "190", "180", "347"];
            const endpoints: Record<string, string> = {
                "390": "modelo390",
                "190": "modelo190",
                "180": "modelo180",
                "347": "modelo347",
            };
            await Promise.all(
                modeloIds.filter(id => visibleAnuales.has(id)).map(async (id) => {
                    const res = await authenticatedFetch(`/api/admin/fiscal/${endpoints[id]}?year=${year}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) results[id] = json.data;
                    }
                })
            );
            setDataAnual(results);
        } catch (error) {
            console.error("Error loading annual data:", error);
        } finally {
            setLoadingAnual(false);
        }
    };

    useEffect(() => {
        if (activeTab === "modelos") loadData();
    }, [year, trimestre, activeTab]);

    useEffect(() => {
        if (activeTab === "modelos") loadAnualData();
    }, [year, activeTab, visibleAnuales.size]);

    const handleDownload = async (modelo: string) => {
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/download-boe?year=${year}&trimestre=${trimestre}&modelo=${modelo}`);
            if (!res.ok) throw new Error("Error en la descarga");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Modelo_${modelo}_${year}_T${trimestre}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Error al descargar el fichero BOE");
        }
    };

    const handleDownloadAnual = async (modelo: string) => {
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/download-boe-anual?year=${year}&modelo=${modelo}`);
            if (!res.ok) throw new Error("Error en la descarga");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Modelo_${modelo}_${year}_Anual.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Error al descargar el fichero BOE anual");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fiscal</h1>
                    <p className="text-muted-foreground text-sm">
                        Modelos fiscales e inteligencia preventiva frente a Hacienda.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={trimestre} onValueChange={setTrimestre}>
                        <SelectTrigger className="w-full md:w-[140px]">
                            <SelectValue placeholder="Trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1T (Ene-Mar)</SelectItem>
                            <SelectItem value="2">2T (Abr-Jun)</SelectItem>
                            <SelectItem value="3">3T (Jul-Sep)</SelectItem>
                            <SelectItem value="4">4T (Oct-Dic)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-full md:w-[100px]">
                            <SelectValue placeholder="A&ntilde;o" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="modelos" className="gap-1.5">
                        <ReceiptEuro className="w-4 h-4" /> Modelos Fiscales
                    </TabsTrigger>
                    <TabsTrigger value="alertas" className="gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> Inteligencia Fiscal
                    </TabsTrigger>
                    <TabsTrigger value="aeat" className="gap-1.5">
                        <ExternalLink className="w-4 h-4" /> AEAT
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Modelos Fiscales (existing content) */}
                <TabsContent value="modelos" className="space-y-6 mt-4">
                    {/* Checklist de modelos */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Modelos a mostrar</p>
                        <div className="flex flex-wrap gap-2">
                            {MODELOS_CONFIG.map(m => {
                                const isActive = visibleModelos.has(m.id);
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => toggleModelo(m.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                            isActive
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                        }`}
                                    >
                                        {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{m.label}</span>
                                        <span className="sm:hidden">{m.id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {loading && <LoadingSpinner />}

                    {!loading && data && (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

                            {/* Modelo 303 - IVA */}
                            {visibleModelos.has("303") && data.modelo303 && (
                                <Card className={`border-l-4 ${BORDER_COLORS.blue}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 303 (IVA)</CardTitle>
                                                <CardDescription className="text-xs">Autoliquidaci&oacute;n Trimestral</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AeatModelLinks modelo="303" trimestre={trimestre} />
                                                <Badge variant="outline" className="text-xs">Borrador</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA Devengado:</span>
                                            <span className="font-medium text-green-600">+{formatCurrency(data.modelo303.devengado.cuota)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA Deducible:</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(data.modelo303.deducible.cuota)}</span>
                                        </div>
                                        {data.modelo303.resultado_regimen_general !== undefined && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Resultado r&eacute;g. general [46]:</span>
                                                <span>{formatCurrency(data.modelo303.resultado_regimen_general)}</span>
                                            </div>
                                        )}
                                        {data.modelo303.cuotas_compensar_pendientes > 0 && (
                                            <div className="space-y-1 text-xs bg-blue-50 p-2 rounded-md">
                                                <div className="flex justify-between text-blue-700">
                                                    <span>Cuotas a compensar pend. [110]:</span>
                                                    <span>{formatCurrency(data.modelo303.cuotas_compensar_pendientes)}</span>
                                                </div>
                                                <div className="flex justify-between text-blue-800 font-medium">
                                                    <span>Aplicadas este periodo [78]:</span>
                                                    <span>-{formatCurrency(data.modelo303.cuotas_compensar_aplicadas)}</span>
                                                </div>
                                                {data.modelo303.cuotas_compensar_pendientes_posterior > 0 && (
                                                    <div className="flex justify-between text-blue-600">
                                                        <span>Pend. periodos posteriores [87]:</span>
                                                        <span>{formatCurrency(data.modelo303.cuotas_compensar_pendientes_posterior)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Resultado:</span>
                                            <span>{formatCurrency(data.modelo303.resultado)}</span>
                                        </div>
                                        {!data.modelo303.cuotas_compensar_pendientes && (
                                            <div className="text-xs space-y-1">
                                                <label className="text-muted-foreground">Cuotas a compensar per. anteriores [110]:</label>
                                                <div className="flex gap-2 items-center">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0,00"
                                                        value={cuotasCompensar303}
                                                        onChange={(e) => setCuotasCompensar303(e.target.value)}
                                                        className="h-7 text-xs w-28"
                                                    />
                                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadData}>
                                                        Aplicar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="bg-yellow-50 p-2 rounded-md text-xs text-yellow-800 flex gap-2 items-start">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                            <p>Revisa que todas las facturas y gastos del {trimestre}T est&eacute;n contabilizados.</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownload('303')}>
                                            <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 130 - IRPF */}
                            {visibleModelos.has("130") && data.modelo130 && (
                                <Card className={`border-l-4 ${BORDER_COLORS.orange}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 130 (IRPF)</CardTitle>
                                                <CardDescription className="text-xs">Pago Fraccionado IRPF</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AeatModelLinks modelo="130" trimestre={trimestre} />
                                                <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Ingresos Acum.:</span>
                                            <span className="font-medium">+{formatCurrency(data.modelo130.ingresos)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Gastos Acum.:</span>
                                            <span className="font-medium">-{formatCurrency(data.modelo130.gastos)}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                                            <div>Compras: {formatCurrency(data.modelo130.gastos_detalle.compras)} | N&oacute;minas: {formatCurrency(data.modelo130.gastos_detalle.nominas)}</div>
                                            {data.modelo130.gastos_detalle.gastos_dificil_justificacion > 0 && (
                                                <div className="text-orange-600">
                                                    5% Gastos dif&iacute;cil justificaci&oacute;n: {formatCurrency(data.modelo130.gastos_detalle.gastos_dificil_justificacion)}
                                                    {data.modelo130.rendimiento_previo > 0 && (
                                                        <span className="text-muted-foreground"> (5% s/ {formatCurrency(data.modelo130.rendimiento_previo)})</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-medium">
                                            <span>Rendimiento Neto:</span>
                                            <span>{formatCurrency(data.modelo130.rendimiento)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Pago fraccionado (20%):</span>
                                            <span>{formatCurrency(data.modelo130.pago_fraccionado)}</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>A Ingresar:</span>
                                            <span>{formatCurrency(data.modelo130.a_ingresar)}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownload('130')}>
                                            <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 111 - Retenciones */}
                            {visibleModelos.has("111") && data.modelo111 && (
                                <Card className={`border-l-4 ${BORDER_COLORS.purple}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 111 (Retenciones)</CardTitle>
                                                <CardDescription className="text-xs">Retenciones trabajadores y profesionales</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AeatModelLinks modelo="111" trimestre={trimestre} />
                                                <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rend. Trabajo:</span>
                                            <span className="font-medium">{formatCurrency(data.modelo111.trabajo.rendimientos || 0)}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            {data.modelo111.trabajo.perceptores} perceptores - Ret: {formatCurrency(data.modelo111.trabajo.retenciones)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Act. Econ&oacute;micas:</span>
                                            <span className="font-medium">{formatCurrency(data.modelo111.actividades.rendimientos || 0)}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            {data.modelo111.actividades.perceptores} perceptores - Ret: {formatCurrency(data.modelo111.actividades.retenciones)}
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Total Retenciones:</span>
                                            <span>{formatCurrency(data.modelo111.total_retenciones)}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownload('111')}>
                                            <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 115 - Retenciones Alquileres */}
                            {visibleModelos.has("115") && data.modelo115 && (
                                <Card className={`border-l-4 ${BORDER_COLORS.rose}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 115 (Alquileres)</CardTitle>
                                                <CardDescription className="text-xs">Retenciones arrendamientos inmobiliarios</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AeatModelLinks modelo="115" trimestre={trimestre} />
                                                <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total alquileres:</span>
                                            <span className="font-medium">{formatCurrency(data.modelo115.total_alquileres)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">N&ordm; gastos alquiler:</span>
                                            <span className="font-medium">{data.modelo115.num_gastos}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total retenciones:</span>
                                            <span className="font-medium text-red-600">{formatCurrency(data.modelo115.total_retenciones)}</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>A Ingresar:</span>
                                            <span>{formatCurrency(data.modelo115.a_ingresar)}</span>
                                        </div>
                                        {data.modelo115.num_gastos === 0 && (
                                            <div className="bg-slate-50 p-2 rounded-md text-xs text-slate-500 text-center">
                                                Sin gastos de alquiler en este trimestre
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownload('115')}>
                                            <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 349 - Operaciones Intracomunitarias */}
                            {visibleModelos.has("349") && data.modelo349 && (
                                <Card className={`border-l-4 ${BORDER_COLORS.teal}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 349 (Intracom.)</CardTitle>
                                                <CardDescription className="text-xs">Operaciones intracomunitarias</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <AeatModelLinks modelo="349" trimestre={trimestre} />
                                                <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total intracomunit.:</span>
                                            <span className="font-medium">{formatCurrency(data.modelo349.total_intracomunitario)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">N&ordm; clientes UE:</span>
                                            <span className="font-medium">{data.modelo349.num_clientes}</span>
                                        </div>
                                        {data.modelo349.operaciones?.length > 0 && (
                                            <div className="border-t pt-2 space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Desglose</p>
                                                {data.modelo349.operaciones.map((op: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground truncate mr-2">{op.cliente}</span>
                                                        <span className="font-medium whitespace-nowrap">{formatCurrency(parseFloat(op.total))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {data.modelo349.num_clientes === 0 && (
                                            <div className="bg-slate-50 p-2 rounded-md text-xs text-slate-500 text-center">
                                                Sin operaciones intracomunitarias en este trimestre
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownload('349')}>
                                            <FileText className="mr-2 h-4 w-4" /> Descargar datos
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Modelos Anuales */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Modelos Anuales</p>
                        <div className="flex flex-wrap gap-2">
                            {MODELOS_ANUALES_CONFIG.map(m => {
                                const isActive = visibleAnuales.has(m.id);
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => toggleAnual(m.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                            isActive
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                        }`}
                                    >
                                        {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{m.label}</span>
                                        <span className="sm:hidden">{m.id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {loadingAnual && <LoadingSpinner />}

                    {!loadingAnual && visibleAnuales.size > 0 && (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

                            {/* Modelo 390 - IVA Resumen Anual */}
                            {visibleAnuales.has("390") && dataAnual["390"] && (
                                <Card className={`border-l-4 ${BORDER_COLORS.blue}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 390 (IVA Anual)</CardTitle>
                                                <CardDescription className="text-xs">Resumen Anual IVA - {year}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="text-xs">Anual</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA Devengado Total:</span>
                                            <span className="font-medium text-green-600">+{formatCurrency(dataAnual["390"].devengado.cuota_total)}</span>
                                        </div>
                                        {/* Desglose por tipo */}
                                        <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                                            <div className="flex justify-between"><span>4%:</span><span>{formatCurrency(dataAnual["390"].devengado.por_tipo.al_4.cuota)}</span></div>
                                            <div className="flex justify-between"><span>10%:</span><span>{formatCurrency(dataAnual["390"].devengado.por_tipo.al_10.cuota)}</span></div>
                                            <div className="flex justify-between"><span>21%:</span><span>{formatCurrency(dataAnual["390"].devengado.por_tipo.al_21.cuota)}</span></div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">IVA Deducible Total:</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(dataAnual["390"].deducible.cuota_total)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Compensaciones:</span>
                                            <span className="font-medium">{formatCurrency(dataAnual["390"].compensaciones)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Op. exentas:</span>
                                            <span>{formatCurrency(dataAnual["390"].operaciones_exentas)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Op. intracomunitarias:</span>
                                            <span>{formatCurrency(dataAnual["390"].operaciones_intracomunitarias)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Volumen operaciones:</span>
                                            <span>{formatCurrency(dataAnual["390"].volumen_operaciones)}</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Resultado Anual:</span>
                                            <span>{formatCurrency(dataAnual["390"].resultado_final)}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button variant="outline" className="flex-1" size="sm" onClick={() => handleDownloadAnual('390')}>
                                            <FileText className="mr-2 h-4 w-4" /> Generar BOE
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/admin/fiscal/modelo390?year=${year}`}>
                                            Ver detalle
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 190 - Retenciones Resumen Anual */}
                            {visibleAnuales.has("190") && dataAnual["190"] && (
                                <Card className={`border-l-4 ${BORDER_COLORS.purple}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 190 (Retenciones)</CardTitle>
                                                <CardDescription className="text-xs">Resumen Anual Retenciones - {year}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="text-xs">Anual</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Perceptores trabajo:</span>
                                            <span className="font-medium">{dataAnual["190"].totales_trabajo.perceptores}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            Rend: {formatCurrency(dataAnual["190"].totales_trabajo.rendimientos)} | Ret: {formatCurrency(dataAnual["190"].totales_trabajo.retenciones)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Perceptores profesionales:</span>
                                            <span className="font-medium">{dataAnual["190"].totales_profesionales.perceptores}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            Rend: {formatCurrency(dataAnual["190"].totales_profesionales.rendimientos)} | Ret: {formatCurrency(dataAnual["190"].totales_profesionales.retenciones)}
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Total Retenciones:</span>
                                            <span>{formatCurrency(dataAnual["190"].total_retenciones)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Total perceptores:</span>
                                            <span>{dataAnual["190"].total_perceptores}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownloadAnual('190')}>
                                            <FileText className="mr-2 h-4 w-4" /> Generar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 180 - Arrendamientos Resumen Anual */}
                            {visibleAnuales.has("180") && dataAnual["180"] && (
                                <Card className={`border-l-4 ${BORDER_COLORS.rose}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 180 (Alquileres)</CardTitle>
                                                <CardDescription className="text-xs">Resumen Anual Arrendamientos - {year}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="text-xs">Anual</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Arrendadores:</span>
                                            <span className="font-medium">{dataAnual["180"].total_arrendadores}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total alquileres:</span>
                                            <span className="font-medium">{formatCurrency(dataAnual["180"].total_alquileres)}</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Total Retenciones:</span>
                                            <span>{formatCurrency(dataAnual["180"].total_retenciones)}</span>
                                        </div>
                                        {dataAnual["180"].arrendadores?.length > 0 && (
                                            <div className="border-t pt-2 space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Desglose</p>
                                                {dataAnual["180"].arrendadores.map((a: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground truncate mr-2">{a.arrendador}</span>
                                                        <span className="font-medium whitespace-nowrap">{formatCurrency(a.total_retenciones)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {dataAnual["180"].total_arrendadores === 0 && (
                                            <div className="bg-slate-50 p-2 rounded-md text-xs text-slate-500 text-center">
                                                Sin gastos de arrendamiento en este ejercicio
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownloadAnual('180')}>
                                            <FileText className="mr-2 h-4 w-4" /> Generar BOE
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            {/* Modelo 347 - Operaciones con Terceros */}
                            {visibleAnuales.has("347") && dataAnual["347"] && (
                                <Card className={`border-l-4 ${BORDER_COLORS.emerald}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">Modelo 347 (Terceros)</CardTitle>
                                                <CardDescription className="text-xs">Op. con terceros &gt;3.005,06 EUR - {year}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="text-xs">Anual</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Clientes declarados:</span>
                                            <span className="font-medium">{dataAnual["347"].total_clientes}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            Importe: {formatCurrency(dataAnual["347"].importe_total_clientes)}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Proveedores declarados:</span>
                                            <span className="font-medium">{dataAnual["347"].total_proveedores}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground pl-2">
                                            Importe: {formatCurrency(dataAnual["347"].importe_total_proveedores)}
                                        </div>
                                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                                            <span>Total Declarados:</span>
                                            <span>{dataAnual["347"].total_terceros} ({formatCurrency(dataAnual["347"].importe_total)})</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button variant="outline" className="flex-1" size="sm" onClick={() => handleDownloadAnual('347')}>
                                            <FileText className="mr-2 h-4 w-4" /> Generar BOE
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/admin/fiscal/modelo347?year=${year}`}>
                                            Ver detalle
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* AEAT Quick Panel */}
                    <AeatQuickPanel year={year} />
                </TabsContent>

                {/* Tab: Inteligencia Fiscal */}
                <TabsContent value="alertas" className="mt-4">
                    <FiscalAlertsPanel year={year} trimestre={trimestre} autoOpenSimulator={autoOpenSimulator} />
                </TabsContent>

                {/* Tab: AEAT */}
                <TabsContent value="aeat" className="space-y-6 mt-4">
                    <AeatQuickPanel year={year} collapsed={false} />
                    <div>
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                            Calendario Fiscal {year}
                        </h2>
                        <CalendarioFiscal year={year} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
