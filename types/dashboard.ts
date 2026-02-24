
export interface DashboardData {
    empleadosActivos: number;
    fichajesHoy: number;
    sospechososHoy: number;
    trabajandoAhora: { id: string; empleado_nombre: string; cliente_nombre: string | null; estado: string; desde: string }[];
    ultimosFichajes: { id: string; empleado_nombre: string; cliente_nombre: string | null; tipo: string; fecha: string }[];
    facturasPendientesList?: { id: string; numero: string; total: string; fecha_emision: string; cliente_nombre: string | null; estado_pago: string; estado: string }[];
    clientesActivos: number;
    clientesNuevos: number;
    facturasPendientes: number;
    cobrosPendientes: number;
    saldoTotal: number;
    trabajosPendientes: number;
    trabajosPendientesList?: { id: string; descripcion: string; fecha: string; cliente_nombre: string | null; estado_detalle: string }[];
    partesHoy: number;
    calendarioSyncStatus: {
        connected: boolean;
        lastSync: string | null;
        enabled: boolean;
    } | null;
    stats?: {
        fichajesUltimosDias: { dia: string; cantidad: number }[];
        fichajesPorTipoHoy: { tipo: string; cantidad: number }[];
        topClientesSemana: { nombre: string; total: number }[];
    };
    beneficioReal?: {
        facturado_base: number;
        gastos_base: number;
        impuestos_estimados?: number;
        beneficio_neto: number;
        pendiente_facturar?: number;
        year: number;
    };
}
