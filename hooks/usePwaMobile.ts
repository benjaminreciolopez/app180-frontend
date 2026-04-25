"use client";

import { useEffect, useState } from "react";
import { isStandalone, isMobileDevice, getPlatform } from "@/utils/pwaDetection";

/**
 * Hook centralizado para detectar el modo PWA móvil.
 *
 * Devuelve null durante SSR y la primera renderización en cliente,
 * y luego un objeto con flags estables. Centraliza la lógica que estaba
 * dispersa entre useIsMobile y pwaDetection para que el resto de la app
 * tome decisiones de UI consistentes (mostrar BottomNav, ocultar sidebar,
 * usar variantes "card" en vez de "table", etc.).
 */
export interface PwaMobileState {
  isPwa: boolean;
  isMobile: boolean;
  isPwaMobile: boolean;
  platform: "ios" | "android" | "desktop" | "unknown";
  width: number;
}

export function usePwaMobile(breakpoint = 1024): PwaMobileState | null {
  const [state, setState] = useState<PwaMobileState | null>(null);

  useEffect(() => {
    function compute() {
      const width = window.innerWidth;
      const pwa = isStandalone();
      const platform = getPlatform();
      const mobileViewport = width < breakpoint;
      const mobile = mobileViewport && (platform === "ios" || platform === "android" || isMobileDevice());

      setState({
        isPwa: pwa,
        isMobile: mobile,
        isPwaMobile: pwa && mobile,
        platform,
        width,
      });
    }

    compute();
    window.addEventListener("resize", compute);
    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener?.("change", compute);
    return () => {
      window.removeEventListener("resize", compute);
      mql.removeEventListener?.("change", compute);
    };
  }, [breakpoint]);

  return state;
}
