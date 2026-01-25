"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setAuthToken } from "@/services/api";

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

function safeParseUser(v: string | null): StoredUser | null {
  if (!v) return null;

  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function isPublicPath(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
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

  localStorage.setItem("user", JSON.stringify(r.data));

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
        const token = localStorage.getItem("token");

        // 👉 Siempre configurar axios primero
        setAuthToken(token);

        let user = safeParseUser(localStorage.getItem("user"));

        // 👉 Si hay token → refrescar sesión real
        if (token) {
          try {
            user = await refreshMe();
          } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.replace("/login");
            return;
          }
        }

        if (cancelled) return;

        const forced = user?.password_forced === true;
        const hasSession = !!token && !!user?.role;

        /* ==========================
           PASSWORD FORZADO
        ========================== */

        if (forced) {
          const allowed =
            pathname === "/cambiar-password" ||
            pathname.startsWith("/empleado/instalar");

          if (!allowed) {
            router.replace("/cambiar-password");
            return;
          }
        }

        /* ==========================
           SIN SESIÓN
        ========================== */

        if (!hasSession && !isPublicPath(pathname)) {
          router.replace("/login");
          return;
        }

        /* ==========================
           LOGIN CON SESIÓN
        ========================== */

        if (hasSession && pathname === "/login") {
          router.replace(
            user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard",
          );
          return;
        }

        /* ==========================
           GUARD POR ROL
        ========================== */

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
        console.error("AuthInit error:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
