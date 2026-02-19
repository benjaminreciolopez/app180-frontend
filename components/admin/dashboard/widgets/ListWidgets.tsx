
import { Briefcase, Clock, Euro, RefreshCw } from "lucide-react";
import Image from "next/image";

function hora(d: string) {
    return new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fecha(d: string) {
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function labelTipo(t: string) {
    const m: Record<string, string> = { entrada: "ENTRADA", salida: "SALIDA", descanso_inicio: "INICIO DESCANSO", descanso_fin: "FIN DESCANSO" };
    return m[t] || t.toUpperCase();
}

function badgeClass(t: string) {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    const m: Record<string, string> = { entrada: `bg-green-100 text-green-800 ${base}`, salida: `bg-red-100 text-red-800 ${base}`, descanso_inicio: `bg-yellow-100 text-yellow-800 ${base}`, descanso_fin: `bg-yellow-100 text-yellow-800 ${base}` };
    return m[t] || `bg-gray-100 text-gray-800 ${base}`;
}

export function ListTrabajando({ data }: { data: { id: string; empleado_nombre: string; cliente_nombre: string | null; estado: string; desde: string }[] }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-gray-400" /> Trabajando ahora
                </h2>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{data.length}</span>
            </div>
            {!data.length ? (
                <div className="p-8 text-center text-gray-500 text-sm">Nadie fichando actualmente</div>
            ) : (
                <div className="divide-y max-h-[350px] overflow-y-auto">
                    {data.map((t) => (
                        <div key={t.id} className="p-3 md:p-4 hover:bg-gray-50 flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-sm">{t.empleado_nombre}</div>
                                <div className="text-xs text-gray-500">{t.cliente_nombre || "Sin cliente"} · Desde {hora(t.desde)}</div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ListFichajes({ data }: { data: { id: string; empleado_nombre: string; cliente_nombre: string | null; tipo: string; fecha: string }[] }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 md:p-6 border-b">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" /> Últimos fichajes
                </h2>
            </div>
            {!data.length ? (
                <div className="p-8 text-center text-gray-500 text-sm">No hay actividad reciente</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500">
                            <tr>
                                <th className="px-4 md:px-6 py-3 font-medium">Empleado</th>
                                <th className="px-4 md:px-6 py-3 font-medium hidden sm:table-cell">Cliente</th>
                                <th className="px-4 md:px-6 py-3 font-medium">Estado</th>
                                <th className="px-4 md:px-6 py-3 font-medium text-right">Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((f) => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-4 md:px-6 py-3 font-medium">{f.empleado_nombre}</td>
                                    <td className="px-4 md:px-6 py-3 text-gray-500 hidden sm:table-cell">{f.cliente_nombre || "—"}</td>
                                    <td className="px-4 md:px-6 py-3"><span className={badgeClass(f.tipo)}>{labelTipo(f.tipo)}</span></td>
                                    <td className="px-4 md:px-6 py-3 text-gray-500 text-right">
                                        <div className="flex flex-col items-end"><span>{hora(f.fecha)}</span><span className="text-xs text-gray-400">{fecha(f.fecha)}</span></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export function ListFacturas({
    data,
    loadingPdfId,
    onPreview,
    onEdit
}: {
    data: { id: string; numero: string; total: string; fecha_emision: string; cliente_nombre: string | null; estado_pago: string; estado: string }[],
    loadingPdfId: string | null,
    onPreview: (id: string, numero: string) => void,
    onEdit: (id: string) => void
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden lg:col-span-2">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                    <Euro className="w-5 h-5 text-gray-400" /> Facturas Pendientes de Cobro
                </h2>
            </div>
            {!data.length ? (
                <div className="p-8 text-center text-gray-500 text-sm">No hay facturas pendientes</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500">
                            <tr>
                                <th className="px-4 md:px-6 py-3 font-medium">Número</th>
                                <th className="px-4 md:px-6 py-3 font-medium">Cliente</th>
                                <th className="px-4 md:px-6 py-3 font-medium">Fecha</th>
                                <th className="px-4 md:px-6 py-3 font-medium">Estado Pago</th>
                                <th className="px-4 md:px-6 py-3 font-medium text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((f) => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-4 md:px-6 py-3 font-medium text-blue-600">
                                        <button
                                            onClick={() => {
                                                if (f.estado === 'BORRADOR') {
                                                    onEdit(f.id);
                                                } else {
                                                    onPreview(f.id, f.numero);
                                                }
                                            }}
                                            className="text-blue-600 hover:underline font-medium flex items-center gap-2 cursor-pointer"
                                            disabled={loadingPdfId === f.id}
                                        >
                                            {loadingPdfId === f.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : null}
                                            {f.numero}
                                        </button>
                                    </td>
                                    <td className="px-4 md:px-6 py-3">{f.cliente_nombre || "—"}</td>
                                    <td className="px-4 md:px-6 py-3 text-gray-500">{fecha(f.fecha_emision)}</td>
                                    <td className="px-4 md:px-6 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.estado_pago === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {f.estado_pago === 'parcial' ? 'PARCIAL' : 'PENDIENTE'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 font-bold text-right">{Number(f.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
