"use client";

import { formatCurrency } from "@/lib/utils";

interface ModeloAnualDetailProps {
    modelo: string;
    datos: any;
}

export default function ModeloAnualDetail({ modelo, datos }: ModeloAnualDetailProps) {
    if (!datos) return <p className="text-sm text-muted-foreground">Sin datos calculados</p>;

    switch (modelo) {
        case "390":
            return <Modelo390Detail data={datos} />;
        case "190":
            return <Modelo190Detail data={datos} />;
        case "180":
            return <Modelo180Detail data={datos} />;
        case "347":
            return <Modelo347Detail data={datos} />;
        default:
            return <pre className="text-xs overflow-auto max-h-96">{JSON.stringify(datos, null, 2)}</pre>;
    }
}

// ============================================================
// MODELO 390 - Resumen anual IVA
// ============================================================
function Modelo390Detail({ data }: { data: any }) {
    const devengado = data.devengado || {};
    const deducible = data.deducible || {};

    return (
        <div className="space-y-4 text-sm">
            <h4 className="font-semibold">IVA Devengado (Ventas)</h4>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-1">Tipo IVA</th>
                        <th className="pb-1 text-right">Base imponible</th>
                        <th className="pb-1 text-right">Cuota</th>
                    </tr>
                </thead>
                <tbody>
                    {devengado.por_tipo && Object.entries(devengado.por_tipo).map(([key, val]: [string, any]) => (
                        <tr key={key} className="border-b border-dashed">
                            <td className="py-1">{key.replace("al_", "")}%</td>
                            <td className="py-1 text-right">{formatCurrency(val.base)}</td>
                            <td className="py-1 text-right">{formatCurrency(val.cuota)}</td>
                        </tr>
                    ))}
                    <tr className="font-semibold">
                        <td className="pt-1">Total devengado</td>
                        <td className="pt-1 text-right">{formatCurrency(devengado.base_total)}</td>
                        <td className="pt-1 text-right">{formatCurrency(devengado.cuota_total)}</td>
                    </tr>
                </tbody>
            </table>

            <h4 className="font-semibold">IVA Deducible (Compras)</h4>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-1">Tipo IVA</th>
                        <th className="pb-1 text-right">Base imponible</th>
                        <th className="pb-1 text-right">Cuota</th>
                    </tr>
                </thead>
                <tbody>
                    {deducible.por_tipo && Object.entries(deducible.por_tipo).map(([key, val]: [string, any]) => (
                        <tr key={key} className="border-b border-dashed">
                            <td className="py-1">{key.replace("al_", "")}%</td>
                            <td className="py-1 text-right">{formatCurrency(val.base)}</td>
                            <td className="py-1 text-right">{formatCurrency(val.cuota)}</td>
                        </tr>
                    ))}
                    <tr className="font-semibold">
                        <td className="pt-1">Total deducible</td>
                        <td className="pt-1 text-right">{formatCurrency(deducible.base_total)}</td>
                        <td className="pt-1 text-right">{formatCurrency(deducible.cuota_total)}</td>
                    </tr>
                </tbody>
            </table>

            <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <div className="flex justify-between">
                    <span>Resultado (devengado - deducible)</span>
                    <span className="font-semibold">{formatCurrency(data.resultado)}</span>
                </div>
                {data.compensaciones > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>Compensaciones trimestres anteriores</span>
                        <span>-{formatCurrency(data.compensaciones)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1">
                    <span>Resultado final</span>
                    <span className={data.resultado_final >= 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(data.resultado_final)}
                    </span>
                </div>
                {data.operaciones_exentas > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Operaciones exentas</span>
                        <span>{formatCurrency(data.operaciones_exentas)}</span>
                    </div>
                )}
                {data.operaciones_intracomunitarias > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Operaciones intracomunitarias</span>
                        <span>{formatCurrency(data.operaciones_intracomunitarias)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Volumen de operaciones</span>
                    <span>{formatCurrency(data.volumen_operaciones)}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MODELO 190 - Retenciones IRPF
// ============================================================
function Modelo190Detail({ data }: { data: any }) {
    const trabajadores = data.trabajadores || [];
    const profesionales = data.profesionales || [];

    return (
        <div className="space-y-4 text-sm">
            {trabajadores.length > 0 && (
                <>
                    <h4 className="font-semibold">Clave A - Rendimientos del trabajo ({trabajadores.length})</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-1">NIF</th>
                                    <th className="pb-1">Perceptor</th>
                                    <th className="pb-1 text-right">Retribuciones</th>
                                    <th className="pb-1 text-right">Retenciones</th>
                                    <th className="pb-1 text-right">SS empleado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trabajadores.map((t: any, i: number) => (
                                    <tr key={i} className="border-b border-dashed">
                                        <td className="py-1 font-mono text-xs">{t.nif || "-"}</td>
                                        <td className="py-1">{t.nombre}</td>
                                        <td className="py-1 text-right">{formatCurrency(t.retribuciones_integras)}</td>
                                        <td className="py-1 text-right">{formatCurrency(t.retenciones)}</td>
                                        <td className="py-1 text-right">{formatCurrency(t.ss_empleado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {profesionales.length > 0 && (
                <>
                    <h4 className="font-semibold">Clave G - Actividades profesionales ({profesionales.length})</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[400px]">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-1">NIF</th>
                                    <th className="pb-1">Perceptor</th>
                                    <th className="pb-1 text-right">Retribuciones</th>
                                    <th className="pb-1 text-right">Retenciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profesionales.map((p: any, i: number) => (
                                    <tr key={i} className="border-b border-dashed">
                                        <td className="py-1 font-mono text-xs">{p.nif || "-"}</td>
                                        <td className="py-1">{p.nombre}</td>
                                        <td className="py-1 text-right">{formatCurrency(p.retribuciones_integras)}</td>
                                        <td className="py-1 text-right">{formatCurrency(p.retenciones)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <div className="flex justify-between">
                    <span>Total perceptores</span>
                    <span className="font-semibold">{data.total_perceptores}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total rendimientos</span>
                    <span className="font-semibold">{formatCurrency(data.total_rendimientos)}</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>Total retenciones a ingresar</span>
                    <span>{formatCurrency(data.total_retenciones)}</span>
                </div>
            </div>

            {trabajadores.length === 0 && profesionales.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                    No hay perceptores con retenciones para este ejercicio
                </p>
            )}
        </div>
    );
}

// ============================================================
// MODELO 180 - Retenciones arrendamiento
// ============================================================
function Modelo180Detail({ data }: { data: any }) {
    const arrendadores = data.arrendadores || [];

    return (
        <div className="space-y-4 text-sm">
            <h4 className="font-semibold">Arrendadores ({arrendadores.length})</h4>

            {arrendadores.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-1">Arrendador</th>
                                <th className="pb-1 text-right">Total alquileres</th>
                                <th className="pb-1 text-right">Retenciones</th>
                                <th className="pb-1 text-right">N. facturas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {arrendadores.map((a: any, i: number) => (
                                <tr key={i} className="border-b border-dashed">
                                    <td className="py-1">{a.arrendador}</td>
                                    <td className="py-1 text-right">{formatCurrency(a.total_alquileres)}</td>
                                    <td className="py-1 text-right">{formatCurrency(a.total_retenciones)}</td>
                                    <td className="py-1 text-right">{a.num_facturas}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-4">
                    No hay gastos de arrendamiento con retenciones para este ejercicio
                </p>
            )}

            <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <div className="flex justify-between">
                    <span>Total arrendadores</span>
                    <span className="font-semibold">{data.total_arrendadores}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total alquileres</span>
                    <span className="font-semibold">{formatCurrency(data.total_alquileres)}</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>Total retenciones a ingresar</span>
                    <span>{formatCurrency(data.total_retenciones)}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MODELO 347 - Operaciones con terceros >3.005,06
// ============================================================
function Modelo347Detail({ data }: { data: any }) {
    const terceros = data.terceros || [];

    return (
        <div className="space-y-4 text-sm">
            <h4 className="font-semibold">
                Terceros con operaciones &gt; 3.005,06 EUR ({terceros.length})
            </h4>

            {terceros.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-1">NIF</th>
                                <th className="pb-1">Nombre</th>
                                <th className="pb-1 text-center">Tipo</th>
                                <th className="pb-1 text-right">1T</th>
                                <th className="pb-1 text-right">2T</th>
                                <th className="pb-1 text-right">3T</th>
                                <th className="pb-1 text-right">4T</th>
                                <th className="pb-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {terceros.map((t: any, i: number) => (
                                <tr key={i} className="border-b border-dashed">
                                    <td className="py-1 font-mono text-xs">{t.nif || "-"}</td>
                                    <td className="py-1 max-w-[150px] truncate">{t.nombre}</td>
                                    <td className="py-1 text-center">
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            t.tipo === "cliente"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                                : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                                        }`}>
                                            {t.tipo === "cliente" ? "CLI" : "PROV"}
                                        </span>
                                    </td>
                                    <td className="py-1 text-right">{formatCurrency(t.q1)}</td>
                                    <td className="py-1 text-right">{formatCurrency(t.q2)}</td>
                                    <td className="py-1 text-right">{formatCurrency(t.q3)}</td>
                                    <td className="py-1 text-right">{formatCurrency(t.q4)}</td>
                                    <td className="py-1 text-right font-semibold">{formatCurrency(t.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-4">
                    No hay terceros con operaciones superiores a 3.005,06 EUR para este ejercicio
                </p>
            )}

            <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <div className="flex justify-between">
                    <span>Clientes declarados</span>
                    <span className="font-semibold">{data.total_clientes} ({formatCurrency(data.importe_total_clientes)})</span>
                </div>
                <div className="flex justify-between">
                    <span>Proveedores declarados</span>
                    <span className="font-semibold">{data.total_proveedores} ({formatCurrency(data.importe_total_proveedores)})</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total operaciones declaradas</span>
                    <span>{formatCurrency(data.importe_total)}</span>
                </div>
            </div>
        </div>
    );
}
