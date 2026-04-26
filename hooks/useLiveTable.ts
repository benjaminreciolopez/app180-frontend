"use client";

import { useState } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

interface UseLiveTableOptions<T> {
  /** Identificador de la query (igual que queryKey de React Query) */
  queryKey: QueryKey;
  /** Función fetcher — devuelve los datos */
  queryFn: () => Promise<T>;
  /** Intervalo de polling en ms cuando live=true. Default 60s. */
  intervalMs?: number;
  /** Si false, deshabilita la query (útil cuando faltan parámetros). */
  enabled?: boolean;
  /** Polling activo por defecto. Default true. */
  livePollingDefault?: boolean;
  /** No hacer polling si la pestaña está oculta. Default true. */
  pauseInBackground?: boolean;
}

interface UseLiveTableResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** Última vez que llegaron datos del backend */
  lastUpdated: Date | null;
  /** Polling encendido/apagado */
  livePolling: boolean;
  setLivePolling: (v: boolean) => void;
  /** Forzar invalidación inmediata (refetch) */
  refresh: () => void;
}

/**
 * Hook unificado para tablas que se refrescan en vivo.
 * Envuelve React Query con un toggle Live/Pausado y refetch periódico.
 *
 * Uso típico:
 *   const { data, livePolling, setLivePolling, lastUpdated, refresh } =
 *     useLiveTable({
 *       queryKey: ["clientes", empresaId],
 *       queryFn: () => api.get(`/asesor/clientes`).then(r => r.data),
 *       intervalMs: 30_000,
 *     });
 */
export function useLiveTable<T>(opts: UseLiveTableOptions<T>): UseLiveTableResult<T> {
  const {
    queryKey,
    queryFn,
    intervalMs = 60_000,
    enabled = true,
    livePollingDefault = true,
    pauseInBackground = true,
  } = opts;

  const queryClient = useQueryClient();
  const [livePolling, setLivePolling] = useState(livePollingDefault);

  const { data, isLoading, error, dataUpdatedAt } = useQuery<T, Error>({
    queryKey,
    queryFn,
    enabled,
    refetchInterval: livePolling ? intervalMs : false,
    refetchIntervalInBackground: !pauseInBackground ? true : false,
  });

  return {
    data,
    loading: isLoading,
    error: (error as Error) || null,
    lastUpdated: dataUpdatedAt > 0 ? new Date(dataUpdatedAt) : null,
    livePolling,
    setLivePolling,
    refresh: () => queryClient.invalidateQueries({ queryKey }),
  };
}
