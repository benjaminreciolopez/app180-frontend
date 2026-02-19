
import { TrendingUp, Wallet } from "lucide-react";

interface Props {
    data: {
        facturado_base: number;
        no_facturado: number;
        gastos_base: number;
        beneficio_neto: number;
        year: number;
    };
}

export function BeneficioRealCard({ data }: Props) {
    // Formatear moneda (sin decimales para limpieza visual si son importes altos, o con 0)
    const f = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    const totalIngresos = (data.facturado_base + data.no_facturado);
    // Calcular porcentaje de gastos sobre ingresos para la barra visual (si ingresos > 0)
    // Si hay pérdidas (gastos > ingresos), la barra será toda roja.
    const pctGastos = totalIngresos > 0 ? Math.min(100, (data.gastos_base / totalIngresos) * 100) : 100;

    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Fondo decorativo sutil */}
            <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <TrendingUp className="w-40 h-40" />
            </div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        Beneficio Real {data.year}
                    </p>
                    <p className={`text-2xl md:text-3xl font-black mt-1 ${data.beneficio_neto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {f(data.beneficio_neto)}
                    </p>
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${data.beneficio_neto >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {/* Barra de progreso visual: Ingresos vs Gastos */}
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex mb-2">
                    {/* Ingresos (Verde/Azul) */}
                    {data.beneficio_neto > 0 && (
                        <div className="h-full bg-emerald-500" style={{ width: `${100 - pctGastos}%` }} title="Margen de beneficio" />
                    )}
                    {/* Gastos (Rojo) */}
                    <div className="h-full bg-red-400" style={{ width: `${pctGastos}%` }} title="Gastos" />
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                    {/* Ingresos A: Facturado */}
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span>Facturado (B.I.)</span>
                        </div>
                        <p className="font-semibold text-gray-700 text-sm ml-3">{f(data.facturado_base)}</p>
                    </div>

                    {/* Ingresos B: No Facturado */}
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                            <span>Sin Factura (Cobrado)</span>
                        </div>
                        <p className="font-semibold text-gray-700 text-sm ml-3">{f(data.no_facturado)}</p>
                    </div>

                    {/* Gastos */}
                    <div className="space-y-0.5 col-span-2 pt-2 border-t border-dashed border-gray-100 mt-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                <span>Gastos Totales (B.I.)</span>
                            </div>
                            <p className="font-bold text-red-600 text-sm">-{f(data.gastos_base)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

