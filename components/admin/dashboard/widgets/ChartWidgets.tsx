
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { LayoutGrid } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function fechaGrafico(d: string) {
    const p = d.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}

export function ChartActividad({ data }: { data: { dia: string; cantidad: number }[] }) {
    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
            <h3 className="text-base md:text-lg font-semibold">Actividad Semanal</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4">Fichajes últimos 7 días</p>
            <div className="h-52 md:h-64 w-full min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dia" tickFormatter={fechaGrafico} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                        <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function ChartClientesOrTipos({
    topClientes,
    distribucionTipos,
    hasClientesModule,
    hasFichajesModule,
    forceHideClientKpis
}: {
    topClientes?: { nombre: string; total: number }[];
    distribucionTipos?: { tipo: string; cantidad: number }[];
    hasClientesModule: boolean;
    hasFichajesModule: boolean;
    forceHideClientKpis?: boolean;
}) {
    const showClientes = hasClientesModule && !forceHideClientKpis && topClientes && topClientes.length > 0;
    const showTipos = hasFichajesModule && distribucionTipos && distribucionTipos.length > 0;

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
            <h3 className="text-base md:text-lg font-semibold mb-4">
                {hasClientesModule ? "Top Clientes (Semana)" : "Distribución Tipos Hoy"}
            </h3>
            <div className="h-52 md:h-64 w-full min-h-[200px] relative">
                {showClientes ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={topClientes} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                            <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : showTipos ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie data={distribucionTipos} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="cantidad">
                                {distribucionTipos.map((_, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <LayoutGrid className="w-8 h-8 opacity-20" />
                        <p className="text-xs">No hay datos suficientes para mostrar el gráfico</p>
                    </div>
                )}
            </div>
        </div>
    );
}
