// lib/empleadoOfflineSync.ts
//
// Motor de sincronización offline para empleados.
// Cuando vuelve la conexión, envía los fichajes pendientes uno a uno.

import {
  getEmpleadoPending,
  clearEmpleadoSynced,
  getEmpleadoPendingCount,
} from "./empleadoOfflineQueue";
import { api } from "@/services/api";

type SyncCallback = (synced: number, failed: number) => void;
type CountCallback = (count: number) => void;

let syncInProgress = false;
let onSyncComplete: SyncCallback | null = null;
let onCountChange: CountCallback | null = null;

export function onEmpleadoSync(callback: SyncCallback) {
  onSyncComplete = callback;
}

export function onEmpleadoPendingChange(callback: CountCallback) {
  onCountChange = callback;
}

async function notifyCountChange() {
  if (onCountChange) {
    const count = await getEmpleadoPendingCount();
    onCountChange(count);
  }
}

export async function syncEmpleadoFichajes(): Promise<{
  synced: number;
  failed: number;
} | null> {
  if (syncInProgress) return null;
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;

  const pending = await getEmpleadoPending();
  if (pending.length === 0) return null;

  syncInProgress = true;
  let synced = 0;
  let failed = 0;
  const syncedIds: string[] = [];

  try {
    for (const f of pending) {
      try {
        await api.post("/fichajes", {
          tipo: f.tipo,
          subtipo: f.subtipo || undefined,
          lat: f.lat,
          lng: f.lng,
          offline_timestamp: f.timestamp,
        });
        syncedIds.push(f.id);
        synced++;
      } catch {
        failed++;
      }
    }

    if (syncedIds.length > 0) {
      await clearEmpleadoSynced(syncedIds);
    }

    await notifyCountChange();
    if (onSyncComplete) onSyncComplete(synced, failed);

    return { synced, failed };
  } finally {
    syncInProgress = false;
  }
}

export function initEmpleadoOfflineSync() {
  const handleOnline = () => {
    syncEmpleadoFichajes();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      syncEmpleadoFichajes();
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
    }
  };
}

export function isEmpleadoSyncing(): boolean {
  return syncInProgress;
}
