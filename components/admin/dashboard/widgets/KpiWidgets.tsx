
import { Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList, RefreshCw, Upload, History } from "lucide-react";
import Link from "next/link";
import { DashboardData } from "@/types/dashboard"; // Assuming interface is exported or redefined here
import { KpiCard } from "./KpiCard"; // Generic KPI Card

// --- Individual KPI Components ---

export function KpiEmpleados({ data }: { data: number }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Empleados</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{data}</p>
                </div>
                <div className="p-2 md:p-3 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
            </div>
        </div>
    );
}

export function KpiFichajes({ data }: { data: number }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Fichajes Hoy</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{data}</p>
                </div>
                <div className="p-2 md:p-3 bg-green-50 rounded-lg">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
            </div>
        </div>
    );
}

export function KpiSospechosos({ data }: { data: number }) {
    const hasSospechosos = data > 0;
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Sospechosos</p>
                    <p className={`text-2xl md:text-3xl font-bold mt-1 ${hasSospechosos ? "text-red-600" : ""}`}>{data}</p>
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${hasSospechosos ? "bg-red-50" : "bg-gray-50"}`}>
                    <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${hasSospechosos ? "text-red-600" : "text-gray-400"}`} />
                </div>
            </div>
        </div>
    );
}

export function KpiCalendario() {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Calendario</p>
                    <Link href="/admin/calendario" className="text-sm font-semibold text-primary hover:underline mt-1 inline-block">
                        Ver planificación
                    </Link>
                </div>
                <div className="p-2 md:p-3 bg-purple-50 rounded-lg">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
            </div>
        </div>
    );
}

export function KpiClientes({ activos, nuevos }: { activos: number, nuevos: number }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Clientes</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{activos}</p>
                    <p className="text-xs text-gray-400 mt-1">+{nuevos} este mes</p>
                </div>
                <Link href="/admin/clientes" className="p-2 md:p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
                </Link>
            </div>
        </div>
    );
}

export function KpiFacturacion({ saldo, facturas }: { saldo: number, facturas: number }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Por Cobrar</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">
                        {saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{facturas} facturas</p>
                </div>
                <Link href="/admin/facturacion/pagos" className="p-2 md:p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    <Euro className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                </Link>
            </div>
        </div>
    );
}

export function KpiTrabajos({ pendientes, onOpenModal }: { pendientes: number, onOpenModal: () => void }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Trabajos</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{pendientes}</p>
                    <p className="text-xs text-gray-400 mt-1">Pendientes de cobro</p>
                </div>
                <button
                    onClick={onOpenModal}
                    className="p-2 md:p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    title="Ver lista de pendientes"
                >
                    <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                </button>
            </div>
        </div>
    );
}

export function KpiGCal({ status }: { status: { connected: boolean, lastSync: string | null, enabled: boolean } }) {
    return (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">Google Calendar</p>
                    {status.connected ? (
                        <>
                            <p className="text-sm font-semibold text-green-600 mt-1">Conectado</p>
                            <div className="flex gap-2 mt-2">
                                <Link href="/admin/configuracion" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" /> Config
                                </Link>
                                <Link href="/admin/configuracion/calendario/importaciones" className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                                    <History className="w-3 h-3" /> Historial
                                </Link>
                                <Link href="/admin/configuracion/calendario/importar" className="text-xs text-gray-600 hover:underline flex items-center gap-1">
                                    <Upload className="w-3 h-3" /> Importar
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-gray-400 mt-1">No conectado</p>
                            <Link href="/admin/configuracion" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                                Configurar
                            </Link>
                        </>
                    )}
                </div>
                <div className={`p-2 md:p-3 rounded-lg ${status.connected ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Calendar className={`w-5 h-5 md:w-6 md:h-6 ${status.connected ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
            </div>
        </div>
    );
}
