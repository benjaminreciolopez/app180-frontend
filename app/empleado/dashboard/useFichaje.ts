import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";
import { getCurrentPosition } from "@/hooks/useGeolocation";
import { checkGeoPermission } from "@/hooks/useGeoPermission";
import { showSuccess, showError, showWarning } from "@/lib/toast";
import { queueEmpleadoFichaje, getEmpleadoPendingCount } from "@/lib/empleadoOfflineQueue";
import { initEmpleadoOfflineSync, onEmpleadoSync, onEmpleadoPendingChange } from "@/lib/empleadoOfflineSync";

export function useFichaje(reload: () => void) {
  const [loading, setLoading] = useState(false);
  const [pendingOffline, setPendingOffline] = useState(0);

  // Initialize offline sync on mount
  useEffect(() => {
    const cleanup = initEmpleadoOfflineSync();

    // Load initial pending count
    getEmpleadoPendingCount().then(setPendingOffline);

    // Listen for sync events
    onEmpleadoSync((synced, failed) => {
      if (synced > 0) {
        showSuccess(`${synced} fichaje(s) sincronizado(s)`);
        reload();
      }
      if (failed > 0) {
        showWarning(`${failed} fichaje(s) no se pudieron sincronizar`);
      }
    });

    onEmpleadoPendingChange(setPendingOffline);

    return cleanup;
  }, [reload]);

  const fichar = useCallback(async (accion: AccionFichaje, subtipo?: string) => {
    setLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const perm = await checkGeoPermission();
        if (perm === "granted" || perm === "prompt") {
          const pos = await getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
        }
      } catch {
        console.warn("GPS no disponible, usando IP");
      }

      // Try online first
      try {
        await api.post("/fichajes", {
          tipo: accion,
          subtipo: subtipo || undefined,
          lat,
          lng,
        });
        showSuccess(`Registro de ${accion} realizado con éxito`);
        reload();
      } catch (err: unknown) {
        // Check if it's a network error (offline)
        const isNetworkError =
          !navigator.onLine ||
          (err instanceof Error && (
            err.message.includes("Failed to fetch") ||
            err.message.includes("Network") ||
            err.message.includes("ERR_INTERNET_DISCONNECTED")
          ));

        if (isNetworkError) {
          // Save offline
          await queueEmpleadoFichaje({
            tipo: accion,
            subtipo: subtipo || null,
            lat,
            lng,
            timestamp: new Date().toISOString(),
          });
          const count = await getEmpleadoPendingCount();
          setPendingOffline(count);
          showWarning(`Sin conexión. Fichaje guardado localmente (${count} pendiente${count > 1 ? "s" : ""})`);
        } else {
          // It's a real API error, not a network issue
          const apiErr = err as { response?: { data?: { error?: string } } };
          showError(apiErr?.response?.data?.error || "No se ha podido registrar el fichaje");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [reload]);

  return { fichar, loading, pendingOffline };
}
