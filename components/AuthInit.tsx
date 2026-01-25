// components/AuthInit.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setAuthToken } from "@/services/api";

type StoredUser = {
  role: "admin" | "empleado";
  password_forced?: boolean;
};

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

export default function AuthInit() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = safeParseUser(localStorage.getItem("user"));

    // Siempre setear token
    setAuthToken(token);

    const forced = user?.password_forced === true;
    const hasSession = !!token && !!user?.role;

    // ==========================
    // PASSWORD FORZADO
    // ==========================
    if (forced) {
      const allowed =
        pathname === "/cambiar-password" ||
        pathname.startsWith("/empleado/instalar");

      if (!allowed) {
        router.replace("/cambiar-password");
        return;
      }
    }

    // ==========================
    // SIN SESIÓN
    // ==========================
    if (!hasSession && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }

    // ==========================
    // LOGIN CON SESIÓN
    // ==========================
    if (hasSession && pathname === "/login") {
      router.replace(
        user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard",
      );
      return;
    }

    // ==========================
    // GUARD POR ROL
    // ==========================
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
  }, [pathname, router]);

  return null;
}
