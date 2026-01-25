"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setAuthToken } from "@/services/api";

type StoredUser = {
  id: string;
  email: string;
  nombre: string;
  role: "admin" | "empleado";
  empresa_id?: string | null;
  empleado_id?: string | null;
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

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const token = localStorage.getItem("token");
    const user = safeParseUser(localStorage.getItem("user"));

    setAuthToken(token);

    const forced = user?.password_forced === true;
    const hasSession = !!token && !!user?.role;

    // =============================
    // FORZAR PASSWORD
    // =============================
    if (forced) {
      const allowed =
        pathname === "/cambiar-password" ||
        pathname.startsWith("/empleado/instalar");

      if (!allowed) {
        router.replace("/cambiar-password");
        return;
      }
    }

    // =============================
    // SIN SESIÓN
    // =============================
    if (!hasSession && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }

    // =============================
    // LOGIN CON SESIÓN
    // =============================
    if (hasSession && pathname === "/login") {
      router.replace(
        user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard",
      );
      return;
    }

    // =============================
    // GUARD POR ROL
    // =============================
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

    // ✅ solo aquí marcamos ready
    setReady(true);
  }, [pathname, router, ready]);

  return null;
}
