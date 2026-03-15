"use client";
import { usePathname } from "next/navigation";

/**
 * Returns the base path prefix ("/admin" or "/asesor") based on the current URL.
 * Use this in shared components that render under both admin and asesor layouts
 * to generate correct navigation links.
 */
export function useBasePath() {
  const pathname = usePathname();
  return pathname.startsWith("/asesor") ? "/asesor" : "/admin";
}
