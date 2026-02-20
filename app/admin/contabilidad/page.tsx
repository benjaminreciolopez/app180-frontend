"use client";

import { useState, useEffect } from "react";
import LibroVentasTable from "@/components/admin/contabilidad/LibroVentasTable";
import LibroGastosTable from "@/components/admin/contabilidad/LibroGastosTable";
import LibroNominasTable from "@/components/admin/contabilidad/LibroNominasTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/services/auth";

export default function ContabilidadPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [showNominas, setShowNominas] = useState(false);

    useEffect(() => {
        const user = getUser();
        if (user && user.modulos) {
            // Requisito: Empleados + Facturación para ver Nóminas
            // (La parte Fiscal se separa en otra ruta protegida por módulo fiscal)
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
                        Libros oficiales de registro de facturas emitidas, recibidas{showNominas ? " y nóminas" : ""}.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight ml-2">Ejercicio</span>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[110px] h-9 border-none bg-slate-50 font-bold text-slate-700 rounded-xl">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100">
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="ventas" className="w-full">
                <TabsList className={`grid w-full ${showNominas ? "grid-cols-3" : "grid-cols-2"} lg:w-[400px]`}>
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="gastos">Gastos</TabsTrigger>
                    {showNominas && <TabsTrigger value="nominas">Nóminas</TabsTrigger>}
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
                                <CardTitle>Libro Registro de Nóminas</CardTitle>
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
