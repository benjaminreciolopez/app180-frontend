"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface ClientTab {
  empresaId: string;
  nombre: string;
  url: string; // ruta completa del último estado (incluye segmento de tab interno)
  openedAt: number;
}

interface ClientTabsContextValue {
  tabs: ClientTab[];
  activeEmpresaId: string | null;
  openTab: (tab: { empresaId: string; nombre: string; url?: string }) => void;
  closeTab: (empresaId: string) => void;
  closeOthers: (empresaId: string) => void;
  closeAll: () => void;
  updateTabUrl: (empresaId: string, url: string) => void;
  updateTabName: (empresaId: string, nombre: string) => void;
  goToTab: (empresaId: string) => void;
}

const ClientTabsContext = createContext<ClientTabsContextValue | null>(null);

const STORAGE_KEY = "contendo_client_tabs_v1";
const MAX_TABS = 12;

function loadFromStorage(): ClientTab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => t && t.empresaId && t.nombre && t.url);
  } catch {
    return [];
  }
}

function saveToStorage(tabs: ClientTab[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    /* quota exceeded etc. */
  }
}

export function ClientTabsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [tabs, setTabs] = useState<ClientTab[]>([]);

  // Cargar de localStorage al montar
  useEffect(() => {
    setTabs(loadFromStorage());
  }, []);

  // Persistir en cada cambio
  useEffect(() => {
    saveToStorage(tabs);
  }, [tabs]);

  // Detectar empresa_id activo a partir del pathname
  const activeEmpresaId = useMemo(() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/asesor\/clientes\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  }, [pathname]);

  // Sincronizar URL del tab activo cuando cambia la ruta
  useEffect(() => {
    if (!activeEmpresaId || !pathname) return;
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.empresaId === activeEmpresaId);
      if (idx === -1) return prev;
      if (prev[idx].url === pathname) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], url: pathname };
      return next;
    });
  }, [pathname, activeEmpresaId]);

  const openTab = useCallback((tab: { empresaId: string; nombre: string; url?: string }) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.empresaId === tab.empresaId);
      if (exists) {
        // Si ya existe, no la duplicamos pero sí actualizamos nombre si cambió
        if (exists.nombre !== tab.nombre) {
          return prev.map((t) =>
            t.empresaId === tab.empresaId ? { ...t, nombre: tab.nombre } : t
          );
        }
        return prev;
      }
      const newTab: ClientTab = {
        empresaId: tab.empresaId,
        nombre: tab.nombre,
        url: tab.url || `/asesor/clientes/${tab.empresaId}`,
        openedAt: Date.now(),
      };
      const next = [...prev, newTab];
      // Limitar
      if (next.length > MAX_TABS) {
        // Quitar la más antigua que no esté activa
        const keep = next
          .sort((a, b) => b.openedAt - a.openedAt)
          .slice(0, MAX_TABS);
        return keep.sort((a, b) => a.openedAt - b.openedAt);
      }
      return next;
    });
  }, []);

  const closeTab = useCallback(
    (empresaId: string) => {
      setTabs((prev) => prev.filter((t) => t.empresaId !== empresaId));
      // Si la tab cerrada era la activa, volver a /asesor/clientes
      if (activeEmpresaId === empresaId) {
        router.push("/asesor/clientes");
      }
    },
    [activeEmpresaId, router]
  );

  const closeOthers = useCallback((empresaId: string) => {
    setTabs((prev) => prev.filter((t) => t.empresaId === empresaId));
  }, []);

  const closeAll = useCallback(() => {
    setTabs([]);
    router.push("/asesor/clientes");
  }, [router]);

  const updateTabUrl = useCallback((empresaId: string, url: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.empresaId === empresaId ? { ...t, url } : t))
    );
  }, []);

  const updateTabName = useCallback((empresaId: string, nombre: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.empresaId === empresaId ? { ...t, nombre } : t))
    );
  }, []);

  const goToTab = useCallback(
    (empresaId: string) => {
      const tab = tabs.find((t) => t.empresaId === empresaId);
      if (tab) router.push(tab.url);
    },
    [tabs, router]
  );

  const value = useMemo<ClientTabsContextValue>(
    () => ({
      tabs,
      activeEmpresaId,
      openTab,
      closeTab,
      closeOthers,
      closeAll,
      updateTabUrl,
      updateTabName,
      goToTab,
    }),
    [tabs, activeEmpresaId, openTab, closeTab, closeOthers, closeAll, updateTabUrl, updateTabName, goToTab]
  );

  return <ClientTabsContext.Provider value={value}>{children}</ClientTabsContext.Provider>;
}

export function useClientTabs() {
  const ctx = useContext(ClientTabsContext);
  if (!ctx) throw new Error("useClientTabs must be used inside <ClientTabsProvider>");
  return ctx;
}

/**
 * Hook que registra un tab automáticamente cuando el usuario entra al panel de un cliente.
 * Llamar desde el layout del cliente con el nombre cuando se conozca.
 */
export function useRegisterClientTab(empresaId: string | null, nombre: string | null) {
  const { openTab } = useClientTabs();
  useEffect(() => {
    if (empresaId && nombre) {
      openTab({ empresaId, nombre });
    }
  }, [empresaId, nombre, openTab]);
}
