"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setAuthToken(getToken());
        const token = getToken();
        let user = getUser();

        console.log("AuthInit: token present?", !!token, "user present?", !!user);
  
        // 👉 Si hay token → refrescar sesión real
        if (token) {
          try {
            console.log("AuthInit: refreshing...");
            const newUser = await refreshMe();
            // Actualizamos user en memoria para la validación posterior
            user = newUser;
            console.log("AuthInit: refresh success", { role: user?.role });
          } catch (error) {
             console.error("Error refreshing session:", error);
             // No hacemos logout explícito...
          }
        }
  
        if (cancelled) return;
  
        const forced = user?.password_forced === true;
        const hasSession = !!token && !!user?.role;
        console.log("AuthInit: hasSession?", hasSession, "pathname", pathname);
        console.log("AuthInit: password_forced?", forced, "user.password_forced:", user?.password_forced);
  
        /* ==========================
           PASSWORD FORZADO
        ========================== */
  
        if (forced) {
          const allowed =
            pathname === "/cambiar-password" ||
            pathname.startsWith("/empleado/instalar");
  
          if (!allowed) {
            console.log("AuthInit: Redirecting to CHANGE PASSWORD (forced)");
            router.replace("/cambiar-password");
            return;
          }
        }
  
        /* ==========================
           SIN SESIÓN
        ========================== */
  
        if (!hasSession && !isPublicPath(pathname)) {
          console.log("AuthInit: Redirecting to LOGIN (No Session)");
          router.replace("/login");
          return;
        }
  

        /* ==========================
           LOGIN CON SESIÓN (O LANDING O INSTALACIÓN)
        ========================== */
  
        if (hasSession && (pathname === "/login" || pathname === "/" || pathname.startsWith("/empleado/instalar"))) {
          console.log("AuthInit: Redirecting to DASHBOARD (Has Session)");
          // Usamos window.location.href para forzar una navegación limpia
          // y evitar problemas de estado con Next.js Router en bucles raros
          window.location.href = user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard";
          return;
        }
  
        /* ==========================
           GUARD POR ROL
        ========================== */
  
        if (hasSession) {
          if (pathname.startsWith("/admin") && user!.role !== "admin") {
            console.log("AuthInit: Role Mismatch (Admin -> Empleado)");
            router.replace("/empleado/dashboard");
            return;
          }
  
          if (pathname.startsWith("/empleado") && user!.role !== "empleado") {
            console.log("AuthInit: Role Mismatch (Empleado -> Admin)");
            router.replace("/admin/dashboard");
            return;
          }
        }
      } catch (e) {
        console.error("AuthInit error:", e);
        logout();
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
