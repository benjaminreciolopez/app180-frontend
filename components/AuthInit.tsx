"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setAuthToken } from "@/services/api";
import { getToken, getUser, logout, updateStoredUser } from "@/services/auth";

/* ========================
   Types
======================== */

type StoredUser = {
  role: "admin" | "empleado";
  password_forced?: boolean;
};

/* ========================
   Utils
======================== */
// (safeParseUser y isPublicPath se mantienen igual, pero safeParseUser ya no lo usamos directamente)
// Aunque AuthInit lo usaba... mejor eliminamos safeParseUser si usamos getUser() del service

function isPublicPath(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path === "/cambiar-password" ||
    path.startsWith("/empleado/instalar") ||
    path.startsWith("/_next") ||
    path.startsWith("/icons") ||
    path === "/manifest.json" ||
    path === "/sw.js" ||
    path === "/favicon.ico"
  );
}

/* ========================
   Refresh Session
======================== */

async function refreshMe() {
  const r = await api.get("/auth/me");

  updateStoredUser(r.data); // 🆕 Usar helper que respeta storage

  return r.data as StoredUser;
}

/* ========================
   Main
======================== */

export default function AuthInit() {
  const router = useRouter();
  const pathname = usePathname();

  const initialized = useRef(false);

  // Callback estable para el evento password-forced
  const handlePasswordForced = useCallback(() => {
    router.replace("/cambiar-password");
  }, [router]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        setAuthToken(getToken());
        const token = getToken();
        const user = getUser();

        // Si tenemos usuario local, permitimos renderizar ya (optimistic)
        // y refrescamos en background
        if (token) {
          try {
            await refreshMe();
          } catch {
            // Sesión background refresh falló (puede estar offline o token expirado)
          }
        }

        const forced = user?.password_forced === true;
        const hasSession = !!token && !!user?.role;

        // 1. Password Forzado
        if (forced) {
          const allowed =
            pathname === "/cambiar-password" ||
            pathname.startsWith("/empleado/instalar");

          if (!allowed) {
            router.replace("/cambiar-password");
            return;
          }
        }

        // 2. Sin sesión
        if (!hasSession && !isPublicPath(pathname)) {
          router.replace("/login");
          return;
        }

        // 3. Login con sesión - usar router.replace en vez de window.location.href
        if (hasSession && (pathname === "/login" || pathname === "/")) {
          router.replace(user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard");
          return;
        }

        // 4. Role Guard
        if (hasSession) {
          if (pathname.startsWith("/admin") && user!.role !== "admin") {
            router.replace("/empleado/dashboard");
            return;
          }

          if (pathname.startsWith("/empleado") && user!.role !== "empleado") {
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch {
        logout();
      }
    }

    // Listen for password-forced event
    window.addEventListener("password-forced", handlePasswordForced);

    init();

    return () => {
      window.removeEventListener("password-forced", handlePasswordForced);
    };
  }, [pathname, router, handlePasswordForced]);

  return null;
}
