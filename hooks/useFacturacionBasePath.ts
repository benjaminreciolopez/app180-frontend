"use client";
import { usePathname } from "next/navigation";

/**
 * Returns the base path for facturación navigation.
 * Detects whether the user is on /asesor/ or /admin/ and returns the correct prefix.
 */
export function useFacturacionBasePath() {
  const pathname = usePathname();
  const prefix = pathname.startsWith("/asesor") ? "/asesor" : "/admin";
  return `${prefix}/facturacion`;
}
