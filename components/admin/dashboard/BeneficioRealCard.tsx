
import { useState, useEffect } from "react";
import { TrendingUp, Wallet, Filter, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/services/api";

interface Props {
    data: {
        facturado_base: number;
        no_facturado: number;
        gastos_base: number;
        impuestos_estimados?: number;
        beneficio_neto: number;
        year: number;
    };
}

export function BeneficioRealCard({ data: initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [currentFilter, setCurrentFilter] = useState("this_year");

    // Sincronizar con props si cambian (ej. refresco global) y estamos viendo el año actual
    useEffect(() => {
        if (currentFilter === 'this_year') {
            setData(initialData);
        }
    }, [initialData, currentFilter]);

    const f = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    const totalIngresos = (data.facturado_base + data.no_facturado);
    const pctGastos = totalIngresos > 0 ? Math.min(100, (data.gastos_base / totalIngresos) * 100) : 100;

    const fetchFiltered = async (filter: string) => {
        setLoading(true);
        setCurrentFilter(filter);
        try {
            const now = new Date();
            let params: any = {};

            if (filter === 'this_year') {
                params = { period: 'year', year: now.getFullYear() };
            } else if (filter === 'prev_year') {
                params = { period: 'year', year: now.getFullYear() - 1 };
            } else if (filter === 'this_quarter') {
                params = { period: 'quarter', year: now.getFullYear() }; // Backend calcula trimestre actual por defecto si no se pasa
            } else if (filter === 'prev_quarter') {
                // Calcular anterior manual para asegurar
                const currentQ = Math.floor((now.getMonth() + 3) / 3);
                let q = currentQ - 1;
                let y = now.getFullYear();
                if (q <= 0) { q = 4; y--; }
                params = { period: 'quarter', year: y, quarter: q };
            } else if (filter === 'this_month') {
                params = { period: 'month', year: now.getFullYear() }; // Backend usa mes actual si no se pasa
            } else if (filter === 'prev_month') {
                let m = (now.getMonth() + 1) - 1;
                let y = now.getFullYear();
                if (m <= 0) { m = 12; y--; }
                params = { period: 'month', year: y, month: m };
            }

            const res = await api.get("/api/admin/dashboard/beneficio", { params });
            if (res.data) {
                setData(res.data);
            }
        } catch (e) {
            console.error("Error fetching beneficio filter", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden group h-full flex flex-col">
            {/* Fondo decorativo sutil */}
            <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <TrendingUp className="w-40 h-40" />
            </div>

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            Beneficio Real
                        </p>
                        {loading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                    </div>

                    {/* Filtro Dropdown */}
                    <div className="relative inline-block text-left">
                        <select
                            value={currentFilter}
                            onChange={(e) => fetchFiltered(e.target.value)}
                            className="text-xs border-none bg-gray-50 rounded px-2 py-1 cursor-pointer focus:ring-0 text-gray-700 font-medium hover:bg-gray-100 transition-colors appearance-none pr-6"
                            style={{ backgroundImage: 'none' }}
                            disabled={loading}
                        >
                            <option value="this_year">Año Actual</option>
                            <option value="prev_year">Año Anterior</option>
                            <option value="this_quarter">Trimestre Actual</option>
                            <option value="prev_quarter">Trimestre Anterior</option>
                            <option value="this_month">Mes Actual</option>
                            <option value="prev_month">Mes Anterior</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1.5 pointer-events-none" />
                    </div>

                    <p className={`text-2xl md:text-3xl font-black mt-2 transition-colors ${data.beneficio_neto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {f(data.beneficio_neto)}
                    </p>
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${data.beneficio_neto >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                </div>
            </div>

            <div className="space-y-4 relative z-10 flex-1">
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
                        <p className="font-semibold text-gray-700 text-sm ml-3 text-right pr-2">{f(data.facturado_base)}</p>
                    </div>

                    {/* Ingresos B: No Facturado */}
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                            <span>Sin Factura (Cobrado)</span>
                        </div>
                        <p className="font-semibold text-gray-700 text-sm ml-3 text-right pr-2">{f(data.no_facturado)}</p>
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

                    {/* Impuestos (modelos 130/303) */}
                    {(data.impuestos_estimados || 0) > 0 && (
                        <div className="space-y-0.5 col-span-2 pt-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                    <span>IRPF (Est. Modelo 130)</span>
                                </div>
                                <p className="font-bold text-red-500 text-sm">-{f(data.impuestos_estimados || 0)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
