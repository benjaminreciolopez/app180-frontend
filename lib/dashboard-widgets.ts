import {
    Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList,
    RefreshCw, Briefcase, LayoutGrid, TrendingUp
} from "lucide-react";

export const ALL_DASHBOARD_WIDGETS = [
    { id: "kpi_beneficio", label: "KPI: Beneficio Real", module: "facturacion", icon: TrendingUp, description: "Muestra el beneficio real calculado de facturas y gastos." },
    { id: "kpi_empleados", label: "KPI: Empleados activos", module: "empleados", icon: Users, description: "Número de empleados con contrato activo actualmente." },
    { id: "kpi_fichajes", label: "KPI: Fichajes hoy", module: "fichajes", icon: Clock, description: "Resumen de fichajes realizados durante el día de hoy." },
    { id: "kpi_sospechosos", label: "KPI: Sospechosos", module: "fichajes", icon: AlertTriangle, description: "Alerta sobre fichajes con irregularidades o fuera de rango." },
    { id: "kpi_calendario", label: "KPI: Calendario", module: "calendario", icon: Calendar, description: "Acceso rápido a la vista de calendario y eventos hoy." },
    { id: "kpi_clientes", label: "KPI: Clientes", module: "clientes", icon: UserCheck, description: "Métricas de captación y estado de la cartera de clientes." },
    { id: "kpi_facturacion", label: "KPI: Facturación", module: "facturacion", icon: Euro, description: "Resumen mensual de facturación emitida y pendiente." },
    { id: "kpi_trabajos", label: "KPI: Trabajos Pendientes", module: "partes_dia", icon: ClipboardList, description: "Contador de partes de trabajo pendientes de procesar." },
    { id: "kpi_gcal_sync", label: "Google Calendar", module: "calendario", icon: RefreshCw, description: "Estado de sincronización con el calendario de Google." },
    { id: "chart_actividad", label: "Actividad semanal", module: "fichajes", icon: LayoutGrid, description: "Gráfico de barras con la actividad de la última semana." },
    { id: "chart_clientes", label: "Top clientes / Distribución", module: null, icon: LayoutGrid, description: "Ranking de clientes y distribución por tipo de trabajo." },
    { id: "list_trabajando", label: "Trabajando ahora", module: "fichajes", icon: Briefcase, description: "Lista en tiempo real de empleados con turno activo." },
    { id: "list_fichajes", label: "Últimos fichajes", module: "fichajes", icon: Clock, description: "Tabla con los movimientos de fichaje más recientes." },
    { id: "list_facturas", label: "Facturas pendientes", module: "facturacion", icon: Euro, description: "Listado de las últimas facturas pendientes de cobro." },
];
