"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * Identifica qué empresa contable está activa en la pantalla actual y en qué
 * "contexto" estamos: mi despacho propio o un cliente gestionado.
 *
 * Reglas:
 *   - Ruta /asesor/clientes/[empresa_id]/...   → modo "cliente"
 *   - Ruta /asesor/...                         → modo "despacho"
 *   - Cualquier otra (admin, empleado, kiosk)  → modo "empresa" (cuenta propia)
 *
 * El empresaId del despacho propio NO se conoce desde la URL — se obtiene del
 * JWT/sessionStorage cuando el backend nos lo da. Aquí devolvemos null y dejamos
 * que `apiContableFetch` se encargue (no añade empresa_id a la query → backend
 * usa req.user.empresa_id como antes).
 */
export type EmpresaContableContext = {
  /** empresa_id que se debe usar para fetchear datos contables. null = usar el del JWT del usuario. */
  empresaId: string | null;
  /** Tipo de contexto para UI (banners, queries, permisos). */
  modo: "despacho" | "cliente" | "empresa";
  /** True cuando estamos viendo un cliente gestionado (no la propia empresa/despacho). */
  esCliente: boolean;
};

const CLIENTE_RE = /^\/asesor\/clientes\/([0-9a-f-]{36})/i;

export function useEmpresaContable(): EmpresaContableContext {
  const pathname = usePathname();

  return useMemo<EmpresaContableContext>(() => {
    if (!pathname) {
      return { empresaId: null, modo: "empresa", esCliente: false };
    }

    const m = pathname.match(CLIENTE_RE);
    if (m) {
      return { empresaId: m[1], modo: "cliente", esCliente: true };
    }

    if (pathname.startsWith("/asesor")) {
      return { empresaId: null, modo: "despacho", esCliente: false };
    }

    return { empresaId: null, modo: "empresa", esCliente: false };
  }, [pathname]);
}
