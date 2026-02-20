"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { FileText, Send, AlertTriangle } from "lucide-react";

export default function FiscalPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [trimestre, setTrimestre] = useState("1"); // 1T por defecto o calcular actual
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // Calcular trimestre actual por defecto
    useEffect(() => {
        const month = new Date().getMonth() + 1;
        const currentQ = Math.ceil(month / 3).toString();
        // setTrimestre(currentQ); // Opcional: auto-seleccionar
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
            const url = `/api/admin/fiscal/download-boe?year=${year}&trimestre=${trimestre}&modelo=${modelo}`;
            // Simular clic en link para descarga directa
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Modelo_${modelo}_${year}_T${trimestre}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error(e);
            alert("Error al descargar el fichero");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Modelos Fiscales</h1>
                    <p className="text-muted-foreground">
                        Generación y presentación de impuestos (IVA e IRPF).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={trimestre} onValueChange={setTrimestre}>
                        <SelectTrigger className="w-[140px]">
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
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading && <LoadingSpinner />}

            {!loading && data && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Modelo 303 */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Modelo 303 (IVA)</CardTitle>
                                    <CardDescription>Autoliquidación Trimestral</CardDescription>
                                </div>
                                <Badge variant="outline">Borrador</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IVA Devengado (Ventas):</span>
                                <span className="font-medium text-green-600">+{formatCurrency(data.modelo303.devengado.cuota)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IVA Deducible (Gastos):</span>
                                <span className="font-medium text-red-600">-{formatCurrency(data.modelo303.deducible.cuota)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>Resultado:</span>
                                <span>{formatCurrency(data.modelo303.resultado)}</span>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md text-xs text-yellow-800 dark:text-yellow-200 flex gap-2 items-start">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>Antes de presentar, revisa que todas las facturas y gastos del periodo {trimestre}T estén contabilizados.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => handleDownload('303')}>
                                <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Modelo 130 */}
                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Modelo 130 (IRPF)</CardTitle>
                                    <CardDescription>Pago Fraccionado IRPF</CardDescription>
                                </div>
                                <Badge variant="outline">Simulación</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Ingresos Acumulados:</span>
                                <span className="font-medium">+{formatCurrency(data.modelo130.ingresos)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Gastos Acumulados:</span>
                                <span className="font-medium">-{formatCurrency(data.modelo130.gastos)}</span>
                            </div>
                            <div className="flex justify-between text-sm pl-4 text-xs text-muted-foreground">
                                <span>(Compras: {formatCurrency(data.modelo130.gastos_detalle.compras)} | Nóminas: {formatCurrency(data.modelo130.gastos_detalle.nominas)})</span>
                            </div>

                            <div className="border-t pt-2 flex justify-between font-medium">
                                <span>Rendimiento Neto:</span>
                                <span>{formatCurrency(data.modelo130.rendimiento)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pago Fraccionado (20%):</span>
                                <span className="font-medium">{formatCurrency(data.modelo130.pago_fraccionado)}</span>
                            </div>

                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>A Ingresar:</span>
                                <span>{formatCurrency(data.modelo130.a_ingresar)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => handleDownload('130')}>
                                <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Modelo 111 */}
                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Modelo 111 (Retenciones)</CardTitle>
                                    <CardDescription>Retenciones trabajadores y profesionales</CardDescription>
                                </div>
                                <Badge variant="outline">Simulación</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Rendimientos Trabajo:</span>
                                <span className="font-medium">{formatCurrency(data.modelo111.trabajo.rendimientos || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm pl-4 text-xs text-muted-foreground">
                                <span>({data.modelo111.trabajo.perceptores} perceptores - Retención: {formatCurrency(data.modelo111.trabajo.retenciones)})</span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Actividades Económicas:</span>
                                <span className="font-medium">{formatCurrency(data.modelo111.actividades.rendimientos || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm pl-4 text-xs text-muted-foreground">
                                <span>({data.modelo111.actividades.perceptores} perceptores - Retención: {formatCurrency(data.modelo111.actividades.retenciones)})</span>
                            </div>

                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>Total Retenciones:</span>
                                <span>{formatCurrency(data.modelo111.total_retenciones)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => handleDownload('111')}>
                                <FileText className="mr-2 h-4 w-4" /> Descargar BOE
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
