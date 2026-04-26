import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 min: datos considerados frescos. Si vuelves a la pestaña antes,
      // se sirve directamente del cache sin volver a llamar al backend.
      staleTime: 5 * 60 * 1000,
      // 30 min: cuánto tiempo se conserva el cache aunque ya nadie lo use.
      gcTime: 30 * 60 * 1000,
      retry: 1,
      // No refetch automático al volver a la ventana — confiamos en el staleTime.
      // El usuario tiene botones explícitos de refrescar donde haga falta.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Si los datos están todavía frescos, no refetch al re-montar el componente.
      refetchOnMount: false,
    },
  },
})
