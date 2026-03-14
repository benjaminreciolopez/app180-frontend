"use client";

import { useState, useEffect } from "react";
import LibroVentasTable from "@/components/admin/contabilidad/LibroVentasTable";
import LibroGastosTable from "@/components/admin/contabilidad/LibroGastosTable";
import LibroNominasTable from "@/components/admin/contabilidad/LibroNominasTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUser } from "@/services/auth";
import { useRouter } from "next/navigation";
import ExportPaqueteButton from "@/components/admin/contabilidad/ExportPaqueteButton";

const subPages = [
    { href: "/asesor/contabilidad/asientos", label: "Asientos" },
    { href: "/asesor/contabilidad/cuentas", label: "Plan de Cuentas" },
    { href: "/asesor/contabilidad/mayor", label: "Libro Mayor" },
    { href: "/asesor/contabilidad/balance", label: "Balance" },
    { href: "/asesor/contabilidad/pyg", label: "PyG" },
    { href: "/asesor/contabilidad/extracto", label: "Extracto Bancario" },
];

export default function AsesorContabilidadPage() {
    const router = useRouter();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [showNominas, setShowNominas] = useState(false);

    useEffect(() => {
        const user = getUser();
        if (user && user.modulos) {
            const hasEmpleados = user.modulos.empleados !== false;
            const hasFacturacion = user.modulos.facturacion !== false;
            setShowNominas(hasEmpleados && hasFacturacion);
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
                    <p className="text-muted-foreground">
                        Libros oficiales de registro de facturas emitidas, recibidas{showNominas ? " y nominas" : ""}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-2">Ejercicio</span>
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
                    <ExportPaqueteButton />
                </div>
            </div>

            {/* Quick access to sub-pages */}
            <div className="flex flex-wrap gap-2">
                {subPages.map((sp) => (
                    <Button
                        key={sp.href}
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(sp.href)}
                        className="rounded-xl"
                    >
                        {sp.label}
                    </Button>
                ))}
            </div>

            <Tabs defaultValue="ventas" className="w-full">
                <TabsList className={`grid w-full ${showNominas ? "grid-cols-3" : "grid-cols-2"} lg:w-[400px]`}>
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="gastos">Gastos</TabsTrigger>
                    {showNominas && <TabsTrigger value="nominas">Nominas</TabsTrigger>}
                </TabsList>

                <TabsContent value="ventas" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Libro Registro de Facturas Emitidas</CardTitle>
                            <CardDescription>
                                Listado oficial de ingresos y facturas de venta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LibroVentasTable year={year} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gastos" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Libro Registro de Facturas Recibidas</CardTitle>
                            <CardDescription>
                                Listado oficial de compras y gastos deducibles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LibroGastosTable year={year} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {showNominas && (
                    <TabsContent value="nominas" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Libro Registro de Nominas</CardTitle>
                                <CardDescription>
                                    Listado de costes salariales y seguridad social.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LibroNominasTable year={year} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
