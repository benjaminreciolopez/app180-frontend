"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setAuthToken } from "@/services/api";
import { getToken, getUser, logout, updateStoredUser, refreshMe } from "@/services/auth";

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



/* ========================
   Main
======================== */

export default function AuthInit() {
  const router = useRouter();
  const pathname = usePathname();

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        setAuthToken(getToken());
        const token = getToken();
        let user = getUser();

        // Si tenemos usuario local, permitimos renderizar ya (optimistic)
        // y refrescamos en background
        if (token) {
          if (pathname === "/login" || pathname === "/") {
            try {
              await refreshMe();
              user = getUser();
            } catch (e) {
              console.log("Token inválido en login, forzando logout");
              logout();
              return;
            }
          } else {
            refreshMe().catch(() => {
              console.log(
                "Sesión background refresh falló (puede estar offline o token expirado)",
              );
            });
          }
        }
        
        // Listen for password-forced event
        const handlePasswordForced = () => {
          router.replace("/cambiar-password");
        };
        window.addEventListener("password-forced", handlePasswordForced);

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
  
        // 3. Login con sesión
        if (hasSession && (pathname === "/login" || pathname === "/")) {
          // Navegación hard para asegurar estado limpio
          window.location.href = user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard";
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
      } catch (e) {
        logout();
      }
    }

    init();

    return () => {
      window.removeEventListener("password-forced", () => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  return null;
}
