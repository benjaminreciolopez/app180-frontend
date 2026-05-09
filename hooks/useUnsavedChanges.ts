"use client";

import { useEffect, useRef } from "react";

/**
 * Avisa al usuario antes de salir de la página si hay cambios sin guardar.
 *
 * Cubre dos escenarios:
 *   1. Cierre/recarga de pestaña, salida del sitio (beforeunload nativo).
 *      El navegador muestra su diálogo estándar — no podemos personalizar
 *      el texto en navegadores modernos.
 *   2. Click en un <a href> interno o navegación con router.push de Next.
 *      Interceptamos el click en links y mostramos confirm() nuestro.
 *
 * Uso:
 *   const dirty = formStateChanged(...);
 *   useUnsavedChanges(dirty, "Tienes cambios sin guardar. ¿Salir igualmente?");
 */
export function useUnsavedChanges(
  dirty: boolean,
  message: string = "Tienes cambios sin guardar. ¿Salir igualmente?"
) {
  // Mantener una ref viva para no re-montar listeners cada render.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    // 1) beforeunload: cierre/recarga de pestaña, navegación externa.
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    }

    // 2) Interceptar clicks en links internos del documento.
    function handleClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Solo navegación interna (excluir #, mailto:, javascript:, etc.)
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      // Cmd/Ctrl/middle click → nueva pestaña, dejarla pasar.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      // Target _blank → no toca esta página.
      if (target.target === "_blank") return;

      const ok = window.confirm(message);
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [message]);
}
