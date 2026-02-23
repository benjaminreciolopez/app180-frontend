"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { FileText, AlertTriangle, CheckSquare, Square, Globe, Building, Users, Home, Receipt } from "lucide-react";

const MODELOS_CONFIG = [
    { id: "303", label: "Modelo 303", desc: "IVA Trimestral", color: "blue", icon: Receipt, defaultOn: true },
    { id: "130", label: "Modelo 130", desc: "IRPF Autónomos", color: "orange", icon: Building, defaultOn: true },
    { id: "111", label: "Modelo 111", desc: "Retenciones IRPF", color: "purple", icon: Users, defaultOn: true },
    { id: "115", label: "Modelo 115", desc: "Retenciones Alquileres", color: "rose", icon: Home, defaultOn: false },
    { id: "349", label: "Modelo 349", desc: "Op. Intracomunitarias", color: "teal", icon: Globe, defaultOn: false },
];

const BORDER_COLORS: Record<string, string> = {
    blue: "border-l-blue-500",
    orange: "border-l-orange-500",
    purple: "border-l-purple-500",
    rose: "border-l-rose-500",
    teal: "border-l-teal-500",
};

export default function FiscalPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [trimestre, setTrimestre] = useState("1");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // Checklist de modelos visibles
    const [visibleModelos, setVisibleModelos] = useState<Set<string>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("fiscal-modelos-visibles");
            if (saved) return new Set(JSON.parse(saved));
        }
        return new Set(MODELOS_CONFIG.filter(m => m.defaultOn).map(m => m.id));
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

    useEffect(() => {
        const month = new Date().getMonth() + 1;
        const currentQ = Math.ceil(month / 3).toString();
        setTrimestre(currentQ);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/models?year=${year}&trimestre=${trimestre}`);
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

    useEffect(() => {
        loadData();
    }, [year, trimestre]);

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Modelos Fiscales</h1>
                    <p className="text-muted-foreground text-sm">
                        Generaci&oacute;n y presentaci&oacute;n de impuestos trimestrales.
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
                                    <Badge variant="outline" className="text-xs">Borrador</Badge>
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
                                <div className="border-t pt-2 flex justify-between font-bold text-base">
                                    <span>Resultado:</span>
                                    <span>{formatCurrency(data.modelo303.resultado)}</span>
                                </div>
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
                                    <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
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
                                <div className="text-xs text-muted-foreground pl-2">
                                    Compras: {formatCurrency(data.modelo130.gastos_detalle.compras)} | N&oacute;minas: {formatCurrency(data.modelo130.gastos_detalle.nominas)}
                                </div>
                                <div className="border-t pt-2 flex justify-between font-medium">
                                    <span>Rendimiento:</span>
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
                                    <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
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
                                    <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
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
                                    <Badge variant="outline" className="text-xs">Simulaci&oacute;n</Badge>
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
        </div>
    );
}
