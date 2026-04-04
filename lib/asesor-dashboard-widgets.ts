import {
  Euro, Receipt, Wallet, TrendingUp,
  Users, AlertTriangle, Activity, BarChart3
} from "lucide-react";

export const ALL_ASESOR_DASHBOARD_WIDGETS = [
  { id: "seccion_mi_asesoria", label: "Mi Asesoria", icon: Euro, description: "KPIs financieros propios: facturacion, gastos, beneficio y YTD." },
  { id: "seccion_cartera_clientes", label: "Cartera de Clientes", icon: Users, description: "KPIs agregados de facturacion y gastos de tus clientes." },
  { id: "seccion_alertas", label: "Alertas Rapidas", icon: AlertTriangle, description: "Plazos fiscales, clientes con alertas y facturas pendientes." },
  { id: "seccion_salud_clientes", label: "Salud de Clientes", icon: BarChart3, description: "Semaforo de estado de cada cliente vinculado." },
  { id: "seccion_actividad", label: "Actividad Reciente", icon: Activity, description: "Timeline de facturas y gastos recientes de tus clientes." },
];
