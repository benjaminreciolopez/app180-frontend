"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/utils/api";

export interface Cuenta {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  grupo: number;
  subgrupo: number | null;
  nivel: number;
  padre_codigo: string | null;
  activa: boolean;
  es_estandar: boolean;
}

const CUENTAS_KEY = ["admin", "contabilidad", "cuentas"] as const;

/** Fetch cuentas with server-side filters */
export function useCuentas(filters: { grupo?: string; tipo?: string; search?: string }) {
  return useQuery<Cuenta[]>({
    queryKey: [...CUENTAS_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.grupo && filters.grupo !== "todos") params.set("grupo", filters.grupo);
      if (filters.tipo && filters.tipo !== "todos") params.set("tipo", filters.tipo);
      if (filters.search) params.set("search", filters.search);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await authenticatedFetch(`/api/admin/contabilidad/cuentas${query}`);
      if (!res.ok) throw new Error("Error cargando cuentas");
      const data = await res.json();
      return Array.isArray(data) ? data : data.cuentas || [];
    },
    staleTime: 30_000,
  });
}

/** Create a cuenta */
export function useCreateCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cuenta: { codigo: string; nombre: string; tipo: string; grupo: number }) => {
      const res = await authenticatedFetch("/api/admin/contabilidad/cuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuenta),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error creando cuenta");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUENTAS_KEY });
    },
  });
}

/** Update a cuenta */
export function useUpdateCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nombre, activa }: { id: number; nombre: string; activa: boolean }) => {
      const res = await authenticatedFetch(`/api/admin/contabilidad/cuentas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, activa }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error actualizando cuenta");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUENTAS_KEY });
    },
  });
}

/** Merge (fusionar) two cuentas */
export function useMergeCuentas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ source_codigo, target_codigo }: { source_codigo: string; target_codigo: string }) => {
      const res = await authenticatedFetch("/api/admin/contabilidad/cuentas/fusionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_codigo, target_codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error fusionando cuentas");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUENTAS_KEY });
    },
  });
}

/** Initialize PGC */
export function useInitializePGC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch("/api/admin/contabilidad/cuentas/inicializar-pgc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error inicializando PGC");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUENTAS_KEY });
    },
  });
}
