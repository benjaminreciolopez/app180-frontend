import {
    Users, Clock, AlertTriangle, Calendar, UserCheck, Euro, ClipboardList,
    RefreshCw, Briefcase, LayoutGrid, TrendingUp, ReceiptEuro, Wallet, BarChart3
} from "lucide-react";

export const ALL_DASHBOARD_WIDGETS = [
    { id: "kpi_beneficio", label: "KPI: Beneficio Real", module: "facturacion", icon: TrendingUp, description: "Muestra el beneficio real calculado de facturas y gastos." },
    { id: "kpi_facturacion_mes", label: "Facturación mensual", module: "facturacion", icon: ReceiptEuro, description: "Facturación de este mes vs mes anterior con tendencia." },
    { id: "kpi_gastos_mes", label: "Gastos mensuales", module: "facturacion", icon: Wallet, description: "Gastos de este mes vs mes anterior con tendencia." },
    { id: "kpi_beneficio_mes", label: "Beneficio mensual", module: "facturacion", icon: BarChart3, description: "Beneficio neto del mes actual (facturación - gastos)." },
    { id: "kpi_facturacion_ytd", label: "Facturación YTD", module: "facturacion", icon: TrendingUp, description: "Facturación y beneficio acumulados del año en curso." },
    { id: "kpi_empleados", label: "KPI: Empleados activos", module: "empleados", icon: Users, description: "Número de empleados con contrato activo actualmente." },
    { id: "kpi_fichajes", label: "KPI: Fichajes hoy", module: "fichajes", icon: Clock, description: "Resumen de fichajes realizados durante el día de hoy." },
    { id: "kpi_sospechosos", label: "KPI: Sospechosos", module: "fichajes", icon: AlertTriangle, description: "Alerta sobre fichajes con irregularidades o fuera de rango." },
    { id: "kpi_calendario", label: "KPI: Calendario", module: "calendario", icon: Calendar, description: "Acceso rápido a la vista de calendario y eventos hoy." },
    { id: "kpi_clientes", label: "KPI: Clientes", module: "clientes", icon: UserCheck, description: "Métricas de captación y estado de la cartera de clientes." },
    { id: "kpi_facturacion", label: "KPI: Saldo pendiente", module: "facturacion", icon: Euro, description: "Saldo total pendiente de cobro y facturas sin cobrar." },
    { id: "kpi_trabajos", label: "KPI: Trabajos Pendientes", module: "partes_dia", icon: ClipboardList, description: "Contador de partes de trabajo pendientes de procesar." },
    { id: "kpi_gcal_sync", label: "Google Calendar", module: "calendario", icon: RefreshCw, description: "Estado de sincronización con el calendario de Google." },
    { id: "chart_actividad", label: "Actividad semanal", module: "fichajes", icon: LayoutGrid, description: "Gráfico de barras con la actividad de la última semana." },
    { id: "chart_clientes", label: "Top clientes / Distribución", module: null, icon: LayoutGrid, description: "Ranking de clientes y distribución por tipo de trabajo." },
    { id: "list_trabajando", label: "Trabajando ahora", module: "fichajes", icon: Briefcase, description: "Lista en tiempo real de empleados con turno activo." },
    { id: "list_fichajes", label: "Últimos fichajes", module: "fichajes", icon: Clock, description: "Tabla con los movimientos de fichaje más recientes." },
    { id: "list_facturas", label: "Facturas pendientes", module: "facturacion", icon: Euro, description: "Listado de las últimas facturas pendientes de cobro." },
];
