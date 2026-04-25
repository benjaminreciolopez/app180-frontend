"use client";

import { useEffect, useState, useCallback } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calculator, FileText, CheckCircle2, Clock, AlertTriangle,
    ExternalLink, RefreshCw, ChevronDown, ChevronUp, Building2,
    Download, Search
} from "lucide-react";
import ModeloAnualDetail from "@/components/fiscal/ModeloAnualDetail";
import AeatConsultaPanel from "@/components/fiscal/AeatConsultaPanel";

interface Cliente {
    empresa_id: string;
    nombre: string;
}

interface ModeloAnual {
    id: string | null;
    empresa_id: string;
    ejercicio: number;
    modelo: string;
    estado: string;
    datos_calculados: any;
    total_base_imponible: number | null;
    total_cuota: number | null;
    total_operaciones: number | null;
    numero_registros: number;
    fecha_limite: string;
    fecha_presentacion: string | null;
    csv_presentacion: string | null;
    numero_justificante: string | null;
    notas: string | null;
    descripcion: string;
}

const ESTADO_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pendiente: { variant: "outline", label: "Pendiente" },
    en_progreso: { variant: "secondary", label: "En progreso" },
    calculado: { variant: "default", label: "Calculado" },
    presentado: { variant: "default", label: "Presentado" },
    rectificado: { variant: "destructive", label: "Rectificado" },
};

const AEAT_LINKS: Record<string, string> = {
    "390": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml",
    "190": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml",
    "180": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI00.shtml",
    "347": "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml",
};

const MODELO_ICONS: Record<string, string> = {
    "390": "IVA",
    "190": "IRPF",
    "180": "ALQ",
    "347": "OPS",
};

export default function AsesorModelosAnualesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState<string>("");
    const [ejercicio, setEjercicio] = useState((new Date().getFullYear() - 1).toString());
    const [modelos, setModelos] = useState<ModeloAnual[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingClientes, setLoadingClientes] = useState(true);
    const [calculando, setCalculando] = useState<string | null>(null);
    const [expandedModelo, setExpandedModelo] = useState<string | null>(null);
    const [presentarModelo, setPresentarModelo] = useState<string | null>(null);
    const [csvInput, setCsvInput] = useState("");
    const [justificanteInput, setJustificanteInput] = useState("");
    const [presentando, setPresentando] = useState(false);

    // Load clients
    useEffect(() => {
        async function loadClientes() {
            setLoadingClientes(true);
            try {
                const res = await authenticatedFetch("/asesor/clientes");
                if (res.ok) {
                    const json = await res.json();
                    const list = json.data || json.clientes || [];
                    setClientes(list.map((c: any) => ({
                        empresa_id: c.empresa_id,
                        nombre: c.nombre || c.empresa_nombre || "Sin nombre"
                    })));
                    if (list.length > 0) {
                        const stored = sessionStorage.getItem("asesor_empresa_id");
                        if (stored && list.some((c: any) => c.empresa_id === stored)) {
                            setSelectedEmpresa(stored);
                        } else {
                            setSelectedEmpresa(list[0].empresa_id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading clientes:", error);
            } finally {
                setLoadingClientes(false);
            }
        }
        loadClientes();
    }, []);

    const basePath = selectedEmpresa ? `/asesor/clientes/${selectedEmpresa}/modelos-anuales` : "";

    const loadModelos = useCallback(async () => {
        if (!selectedEmpresa || !ejercicio) return;
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${basePath}/${ejercicio}`);
            if (res.ok) {
                const json = await res.json();
                setModelos(json.data || []);
            }
        } catch (error) {
            console.error("Error loading modelos:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedEmpresa, ejercicio, basePath]);

    useEffect(() => {
        if (selectedEmpresa && ejercicio) {
            loadModelos();
        }
    }, [selectedEmpresa, ejercicio, loadModelos]);

    async function handleCalcular(modelo: string) {
        if (!selectedEmpresa) return;
        setCalculando(modelo);
        try {
            const res = await authenticatedFetch(
                `${basePath}/${ejercicio}/${modelo}/calcular`,
                { method: "POST" }
            );
            if (res.ok) {
                await loadModelos();
                setExpandedModelo(modelo);
            } else {
                const json = await res.json();
                alert(json.error || "Error al calcular");
            }
        } catch (error) {
            console.error("Error calculando:", error);
            alert("Error de conexion al calcular");
        } finally {
            setCalculando(null);
        }
    }

    async function handlePresentar(modelo: string) {
        if (!selectedEmpresa) return;
        setPresentando(true);
        try {
            const res = await authenticatedFetch(
                `${basePath}/${ejercicio}/${modelo}/presentar`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        csv_presentacion: csvInput || null,
                        numero_justificante: justificanteInput || null
                    })
                }
            );
            if (res.ok) {
                await loadModelos();
                setPresentarModelo(null);
                setCsvInput("");
                setJustificanteInput("");
            } else {
                const json = await res.json();
                alert(json.error || "Error al marcar presentado");
            }
        } catch (error) {
            console.error("Error presentando:", error);
        } finally {
            setPresentando(false);
        }
    }

    function isVencido(fechaLimite: string) {
        return new Date(fechaLimite) < new Date();
    }

    function getExtensionAeat(modelo: string): string {
        const AUTOLIQUIDACIONES_ANUALES = ['390', '100'];
        if (modelo === '200') return 'xml';
        if (AUTOLIQUIDACIONES_ANUALES.includes(modelo)) return 'ses';
        return modelo; // informativas: .190, .180, .347
    }

    async function handleDownloadAnual(modelo: string) {
        if (!selectedEmpresa) return;
        try {
            const res = await authenticatedFetch(
                `/asesor/clientes/${selectedEmpresa}/modelos-anuales/download-boe-anual?year=${ejercicio}&modelo=${modelo}`
            );
            if (!res.ok) {
                const json = await res.json();
                alert(json.error || "Error al descargar");
                return;
            }
            const blob = await res.blob();
            const ext = getExtensionAeat(modelo);
            const filename = `modelo-${modelo}-${ejercicio}.${ext}`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error descargando fichero AEAT:", error);
            alert("Error de conexion al descargar");
        }
    }

    if (loadingClientes) return <LoadingSpinner fullPage />;

    const consultaApiBasePath = selectedEmpresa
        ? `/asesor/clientes/${selectedEmpresa}/consulta`
        : "";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Modelos Anuales AEAT</h1>
                <p className="text-sm text-muted-foreground">
                    Calculo y seguimiento de modelos anuales: 390, 190, 180, 347
                </p>
            </div>

            {/* Selectores */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 min-w-[250px]">
                    <Building2 size={16} className="text-muted-foreground" />
                    <Select value={selectedEmpresa} onValueChange={(val) => {
                        setSelectedEmpresa(val);
                        sessionStorage.setItem("asesor_empresa_id", val);
                    }}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            {clientes.map(c => (
                                <SelectItem key={c.empresa_id} value={c.empresa_id}>{c.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ejercicio:</span>
                    <Select value={ejercicio} onValueChange={setEjercicio}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[2023, 2024, 2025, 2026].map(a => (
                                <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button variant="outline" size="sm" onClick={loadModelos} disabled={loading}>
                    <RefreshCw size={14} className={loading ? "animate-spin mr-1" : "mr-1"} />
                    Actualizar
                </Button>
            </div>

            {!selectedEmpresa ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">Selecciona un cliente para ver sus modelos anuales</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="modelos" className="space-y-4">
                    <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                        <TabsList className="inline-flex w-max min-w-full">
                            <TabsTrigger value="modelos" className="whitespace-nowrap">
                                <FileText size={14} className="mr-1" />
                                Modelos
                            </TabsTrigger>
                            <TabsTrigger value="consulta" className="whitespace-nowrap">
                                <Search size={14} className="mr-1" />
                                Consulta AEAT
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="modelos">
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modelos.map((m) => {
                        const badge = ESTADO_BADGE[m.estado] || ESTADO_BADGE.pendiente;
                        const vencido = m.estado !== "presentado" && isVencido(m.fecha_limite);
                        const isExpanded = expandedModelo === m.modelo;

                        return (
                            <Card key={m.modelo} className={vencido ? "border-red-300 dark:border-red-700" : ""}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <span className="text-xs font-bold text-primary">
                                                    {MODELO_ICONS[m.modelo] || m.modelo}
                                                </span>
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Modelo {m.modelo}</CardTitle>
                                                <CardDescription className="text-xs">{m.descripcion}</CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={badge.variant as any}>
                                            {m.estado === "presentado" && <CheckCircle2 size={12} className="mr-1" />}
                                            {badge.label}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    {/* Resumen rapido */}
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {m.total_operaciones !== null && (
                                            <div>
                                                <span className="text-muted-foreground text-xs">Operaciones</span>
                                                <p className="font-medium">{formatCurrency(m.total_operaciones)}</p>
                                            </div>
                                        )}
                                        {m.total_cuota !== null && m.total_cuota !== 0 && (
                                            <div>
                                                <span className="text-muted-foreground text-xs">Cuota/Retencion</span>
                                                <p className="font-medium">{formatCurrency(m.total_cuota)}</p>
                                            </div>
                                        )}
                                        {m.numero_registros > 0 && (
                                            <div>
                                                <span className="text-muted-foreground text-xs">Registros</span>
                                                <p className="font-medium">{m.numero_registros}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-muted-foreground text-xs">Fecha limite</span>
                                            <p className={`font-medium ${vencido ? "text-red-600" : ""}`}>
                                                {vencido && <AlertTriangle size={12} className="inline mr-1" />}
                                                {new Date(m.fecha_limite).toLocaleDateString("es-ES")}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Presentacion info */}
                                    {m.estado === "presentado" && m.fecha_presentacion && (
                                        <div className="bg-green-50 dark:bg-green-950 rounded-md p-2 text-xs space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Presentado:</span>
                                                <span>{new Date(m.fecha_presentacion).toLocaleDateString("es-ES")}</span>
                                            </div>
                                            {m.csv_presentacion && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">CSV:</span>
                                                    <span className="font-mono">{m.csv_presentacion}</span>
                                                </div>
                                            )}
                                            {m.numero_justificante && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Justificante:</span>
                                                    <span className="font-mono">{m.numero_justificante}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Botones */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant={m.estado === "pendiente" ? "default" : "outline"}
                                            onClick={() => handleCalcular(m.modelo)}
                                            disabled={calculando === m.modelo}
                                        >
                                            {calculando === m.modelo ? (
                                                <RefreshCw size={14} className="animate-spin mr-1" />
                                            ) : (
                                                <Calculator size={14} className="mr-1" />
                                            )}
                                            {m.datos_calculados ? "Recalcular" : "Calcular"}
                                        </Button>

                                        {m.datos_calculados && m.estado !== "presentado" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPresentarModelo(presentarModelo === m.modelo ? null : m.modelo)}
                                            >
                                                <CheckCircle2 size={14} className="mr-1" />
                                                Marcar presentado
                                            </Button>
                                        )}

                                        {m.datos_calculados && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setExpandedModelo(isExpanded ? null : m.modelo)}
                                            >
                                                <FileText size={14} className="mr-1" />
                                                Detalle
                                                {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                                            </Button>
                                        )}

                                        {m.datos_calculados && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownloadAnual(m.modelo)}
                                            >
                                                <Download size={14} className="mr-1" />
                                                Fichero AEAT
                                            </Button>
                                        )}

                                        {AEAT_LINKS[m.modelo] && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                asChild
                                            >
                                                <a href={AEAT_LINKS[m.modelo]} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink size={14} className="mr-1" />
                                                    AEAT
                                                </a>
                                            </Button>
                                        )}
                                    </div>

                                    {/* Formulario presentar */}
                                    {presentarModelo === m.modelo && (
                                        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                                            <p className="text-xs font-medium">Datos de presentacion</p>
                                            <input
                                                type="text"
                                                placeholder="CSV (Codigo Seguro Verificacion)"
                                                value={csvInput}
                                                onChange={(e) => setCsvInput(e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-sm bg-background"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Numero de justificante"
                                                value={justificanteInput}
                                                onChange={(e) => setJustificanteInput(e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-sm bg-background"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePresentar(m.modelo)}
                                                    disabled={presentando}
                                                >
                                                    {presentando ? "Guardando..." : "Confirmar presentacion"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { setPresentarModelo(null); setCsvInput(""); setJustificanteInput(""); }}
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Detalle expandido */}
                                    {isExpanded && m.datos_calculados && (
                                        <div className="border-t pt-3">
                                            <ModeloAnualDetail
                                                modelo={m.modelo}
                                                datos={m.datos_calculados}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                    )}
                    </TabsContent>

                    <TabsContent value="consulta">
                        {consultaApiBasePath && (
                            <AeatConsultaPanel
                                year={ejercicio}
                                trimestre="1"
                                apiBasePath={consultaApiBasePath}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
