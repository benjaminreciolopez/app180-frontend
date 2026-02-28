// lib/offlineQueue.ts
//
// Cola de fichajes offline usando IndexedDB (idb-keyval).
// Los fichajes se almacenan con UUID + timestamp del dispositivo
// y se sincronizan cuando vuelve la conexión.

import { get, set, del, keys } from "idb-keyval";

export interface OfflineFichaje {
  id: string; // UUID local
  empleado_id: string;
  empleado_nombre: string;
  tipo: "entrada" | "salida" | "descanso_inicio" | "descanso_fin";
  subtipo?: string | null;
  timestamp: string; // ISO string del momento del fichaje
  offline_pin?: string;
  foto_base64?: string; // Foto de verificación capturada por cámara offline
  created_at: string; // ISO string de cuando se guardó
}

const QUEUE_PREFIX = "kiosk_offline_";

function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Añade un fichaje a la cola offline.
 */
export async function queueOfflineFichaje(fichaje: Omit<OfflineFichaje, "id" | "created_at">): Promise<OfflineFichaje> {
  const id = generateId();
  const entry: OfflineFichaje = {
    ...fichaje,
    id,
    created_at: new Date().toISOString(),
  };
  await set(`${QUEUE_PREFIX}${id}`, entry);
  return entry;
}

/**
 * Obtiene todos los fichajes pendientes de sincronización, ordenados por timestamp.
 */
export async function getPendingFichajes(): Promise<OfflineFichaje[]> {
  const allKeys = await keys();
  const offlineKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));

  const fichajes: OfflineFichaje[] = [];
  for (const key of offlineKeys) {
    const val = await get<OfflineFichaje>(key);
    if (val) fichajes.push(val);
  }

  return fichajes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Elimina fichajes ya sincronizados de la cola.
 */
export async function clearSyncedFichajes(ids: string[]): Promise<void> {
  for (const id of ids) {
    await del(`${QUEUE_PREFIX}${id}`);
  }
}

/**
 * Obtiene el número de fichajes pendientes.
 */
export async function getPendingCount(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
}

/**
 * Elimina un fichaje offline específico por su ID (para deshacer).
 */
export async function removeOfflineFichaje(id: string): Promise<void> {
  await del(`${QUEUE_PREFIX}${id}`);
}

/**
 * Limpia toda la cola offline.
 */
export async function clearAllOffline(): Promise<void> {
  const allKeys = await keys();
  const offlineKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));
  for (const key of offlineKeys) {
    await del(key);
  }
}
