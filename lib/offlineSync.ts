// lib/offlineSync.ts
//
// Motor de sincronización offline para el kiosko.
// Detecta cambios de conectividad y sincroniza automáticamente
// los fichajes pendientes cuando vuelve la conexión.

import { getPendingFichajes, clearSyncedFichajes, getPendingCount } from "./offlineQueue";
import { kioskFetch } from "./kioskFetch";

interface SyncResult {
  total: number;
  aceptados: number;
  rechazados: number;
  errores: string[];
}

type SyncCallback = (result: SyncResult) => void;
type CountCallback = (count: number) => void;

let syncInProgress = false;
let onSyncComplete: SyncCallback | null = null;
let onCountChange: CountCallback | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
const MAX_RETRIES = 5;

/**
 * Registra callbacks para eventos de sincronización.
 */
export function onSync(callback: SyncCallback) {
  onSyncComplete = callback;
}

export function onPendingCountChange(callback: CountCallback) {
  onCountChange = callback;
}

/**
 * Notifica el cambio de cuenta de pendientes.
 */
async function notifyCountChange() {
  if (onCountChange) {
    const count = await getPendingCount();
    onCountChange(count);
  }
}

/**
 * Intenta sincronizar todos los fichajes pendientes.
 * Envía en un batch al endpoint /api/kiosk/sync-offline.
 */
export async function syncOfflineFichajes(): Promise<SyncResult | null> {
  if (syncInProgress) return null;
  if (!navigator.onLine) return null;

  const pending = await getPendingFichajes();
  if (pending.length === 0) return null;

  syncInProgress = true;

  try {
    const result = await kioskFetch<SyncResult>("/api/kiosk/sync-offline", {
      method: "POST",
      body: JSON.stringify({
        fichajes: pending.map((f) => ({
          local_id: f.id,
          empleado_id: f.empleado_id,
          tipo: f.tipo,
          subtipo: f.subtipo || null,
          timestamp: f.timestamp,
          offline_pin: f.offline_pin || null,
          foto_base64: f.foto_base64 || null,
        })),
      }),
    });

    // Limpiar los fichajes sincronizados exitosamente
    const syncedIds = pending.map((f) => f.id);
    await clearSyncedFichajes(syncedIds);

    retryCount = 0;
    await notifyCountChange();

    if (onSyncComplete) onSyncComplete(result);

    return result;
  } catch (err) {
    console.error("❌ Error en sincronización offline:", err);

    // Retry con backoff exponencial
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 60000); // max 60s
      retryTimeout = setTimeout(() => syncOfflineFichajes(), delay);
    }

    return null;
  } finally {
    syncInProgress = false;
  }
}

/**
 * Inicializa los listeners de conectividad.
 * Llamar una vez al montar el componente kiosko.
 */
export function initOfflineSync() {
  const handleOnline = () => {
    retryCount = 0;
    syncOfflineFichajes();
  };

  window.addEventListener("online", handleOnline);

  // Intentar sync al inicializar si estamos online
  if (navigator.onLine) {
    syncOfflineFichajes();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    if (retryTimeout) clearTimeout(retryTimeout);
  };
}

/**
 * Verifica si hay una sincronización en progreso.
 */
export function isSyncing(): boolean {
  return syncInProgress;
}
