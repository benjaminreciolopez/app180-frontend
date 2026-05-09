// utils/apiContable.ts
//
// Wrapper de authenticatedFetch para endpoints contables/fiscales que se ejecutan
// en contexto de "una empresa concreta" (despacho propio del asesor o cliente
// gestionado).
//
// Ya existe el mecanismo X-Empresa-Id (sessionStorage.asesor_empresa_id), pero
// para los wrappers nuevos del modo asesoría queremos pasar empresa_id de forma
// EXPLÍCITA en la query, sin depender de que sessionStorage esté seteado a tiempo.
//
// Esto deja la URL auto-documentada (puedes ver en DevTools qué empresa pidió
// cada request) y desacopla el modo cliente del wrapper de re-exportación.

import { authenticatedFetch } from "@/utils/api";

type Params = Record<string, string | number | boolean | undefined | null>;

function buildQuery(empresaId: string | null, params?: Params): string {
  const sp = new URLSearchParams();
  if (empresaId) sp.set("empresa_id", empresaId);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Construye una URL apuntando a un endpoint contable, añadiendo automáticamente
 * `empresa_id` (si se pasa) y los demás params dados.
 */
export function buildContableUrl(
  path: string,
  empresaId: string | null,
  params?: Params
): string {
  // Si el path ya tiene query string, las añadimos con `&`.
  const sep = path.includes("?") ? "&" : "?";
  const sp = new URLSearchParams();
  if (empresaId) sp.set("empresa_id", empresaId);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  if (!qs) return path;
  return `${path}${sep}${qs}`;
}

/**
 * Llamada autenticada a un endpoint contable, inyectando empresa_id en la query
 * cuando proceda. Si empresaId es null se omite (caso despacho propio: el backend
 * usa req.user.empresa_id como fallback).
 */
export async function apiContableFetch(
  path: string,
  empresaId: string | null,
  params?: Params,
  init?: RequestInit
) {
  const url = buildContableUrl(path, empresaId, params);
  return authenticatedFetch(url, init);
}
