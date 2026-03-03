// lib/empleadoOfflineQueue.ts
//
// Cola de fichajes offline para empleados usando IndexedDB (idb-keyval).
// Patrón idéntico al kiosko pero con prefijo diferente y sin PIN/foto.

import { get, set, del, keys } from "idb-keyval";

export interface OfflineEmpleadoFichaje {
  id: string;
  tipo: "entrada" | "salida" | "descanso_inicio" | "descanso_fin";
  subtipo?: string | null;
  lat: number | null;
  lng: number | null;
  timestamp: string; // ISO del momento del fichaje
  created_at: string;
}

const QUEUE_PREFIX = "emp_offline_";

function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function queueEmpleadoFichaje(
  fichaje: Omit<OfflineEmpleadoFichaje, "id" | "created_at">
): Promise<OfflineEmpleadoFichaje> {
  const id = generateId();
  const entry: OfflineEmpleadoFichaje = {
    ...fichaje,
    id,
    created_at: new Date().toISOString(),
  };
  await set(`${QUEUE_PREFIX}${id}`, entry);
  return entry;
}

export async function getEmpleadoPending(): Promise<OfflineEmpleadoFichaje[]> {
  const allKeys = await keys();
  const offlineKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));

  const fichajes: OfflineEmpleadoFichaje[] = [];
  for (const key of offlineKeys) {
    const val = await get<OfflineEmpleadoFichaje>(key);
    if (val) fichajes.push(val);
  }
  return fichajes.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function clearEmpleadoSynced(ids: string[]): Promise<void> {
  for (const id of ids) {
    await del(`${QUEUE_PREFIX}${id}`);
  }
}

export async function getEmpleadoPendingCount(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
}
