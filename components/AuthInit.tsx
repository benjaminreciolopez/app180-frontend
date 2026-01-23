// components/AuthInit.tsx
"use client";

import { useEffect } from "react";
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
  const publicPrefixes = ["/_next", "/icons", "/static"];

  const publicExact = [
    "/",
    "/login",
    "/register",
    "/manifest.json",
    "/sw.js",
    "/favicon.ico",
  ];

  if (publicExact.includes(path)) return true;

  return (
    publicPrefixes.some((p) => path.startsWith(p)) ||
    path.startsWith("/empleado/instalar")
  );
}

export default function AuthInit() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = safeParseUser(localStorage.getItem("user"));

    // set token en axios siempre
    setAuthToken(token);

    // 1) Si está forzado el cambio, SOLO puede estar en /cambiar-password o /empleado/instalar
    const forced = user?.password_forced === true;

    if (forced) {
      const allowedWhileForced =
        pathname === "/cambiar-password" ||
        pathname.startsWith("/empleado/instalar");
      if (!allowedWhileForced) {
        router.replace("/cambiar-password");
      }
      return;
    }

    // 2) Si NO hay token/user y está intentando entrar en una ruta protegida → login
    const hasSession = !!token && !!user?.role;
    if (!hasSession && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }

    // 3) Si hay sesión y está en /login → manda al dashboard correspondiente
    if (hasSession && pathname === "/login") {
      router.replace(
        user!.role === "admin" ? "/admin/dashboard" : "/empleado/dashboard",
      );
      return;
    }

    // 4) Guard básico por rol en rutas /admin y /empleado
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
