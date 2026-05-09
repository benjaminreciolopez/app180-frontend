"use client";

import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/utils/api";

export interface DespachoKpi {
  empresa_id: string;
  nombre: string | null;
  ingresos: number;
  gastos: number;
  resultado: number;
  iva_repercutido: number;
  iva_soportado: number;
  num_facturas: number;
  num_borradores: number;
  num_validadas: number;
  num_gastos: number;
}

export interface ClientesKpi {
  num_clientes: number;
  ingresos_total: number;
  gastos_total: number;
  iva_repercutido_total: number;
  iva_soportado_total: number;
  num_facturas: number;
  num_borradores: number;
  num_gastos: number;
  pendientes_revision_asientos: number;
}

export interface RetaKpi {
  alertas_pendientes: number;
  cambios_comunicados: number;
  cambios_propuestos: number;
  autonomos_sin_estimacion: number;
  total_pendientes: number;
}

export interface AsesorAgregados {
  ejercicio: number;
  despacho: DespachoKpi | null;
  clientes: ClientesKpi;
  reta?: RetaKpi;
}

/**
 * Carga los KPIs separados de "Mi Despacho" vs "Mis Clientes" del año dado.
 * Se cachea con React Query — el dashboard del asesor lo invalida cuando cambia
 * de ejercicio.
 */
export function useAsesorAgregados(ejercicio?: number) {
  const year = ejercicio ?? new Date().getFullYear();
  return useQuery<AsesorAgregados>({
    queryKey: ["asesor", "agregados", "dashboard", year],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `/asesor/agregados/dashboard?ejercicio=${year}`
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error cargando agregados");
      }
      return res.json();
    },
    staleTime: 60_000,
  });
}
