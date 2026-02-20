"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setAuthToken } from "@/services/api";
import { getToken, getUser, logout, refreshMe, registerAppClose } from "@/services/auth";
import { Loader2 } from "lucide-react";

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

export default function AuthInit() {
  const router = useRouter();
  const pathname = usePathname();
  const initialized = useRef(false);
  const [checking, setChecking] = useState(() => {
    // Solo mostrar overlay si hay token Y estamos en página pública (/ o /login)
    if (typeof window === "undefined") return false;
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const isPublic = pathname === "/" || pathname === "/login";
    return !!token && isPublic;
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      try {
        setAuthToken(getToken());
        const token = getToken();
        let user = getUser();

        if (token) {
          if (pathname === "/login" || pathname === "/") {
            try {
              await refreshMe();
              user = getUser();
            } catch {
              // Token inválido → quitar overlay y dejar ver la página
              setChecking(false);
              // Limpiar tokens sin redirigir (ya estamos en página pública)
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              sessionStorage.removeItem("token");
              sessionStorage.removeItem("user");
              setAuthToken(null);
              return;
            }
          } else {
            refreshMe().catch(() => {
              console.log("Sesión background refresh falló");
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

        // 3. Con sesión en página pública → dashboard
        if (hasSession && (pathname === "/login" || pathname === "/")) {
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

        // Si llegamos aquí sin redirigir, quitar overlay
        setChecking(false);
      } catch {
        setChecking(false);
        logout();
      }
    }

    init();

    return () => {
      window.removeEventListener("password-forced", () => { });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-100/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 bg-white rounded-2xl px-8 py-6 shadow-lg">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-600">Verificando sesión...</p>
      </div>
    </div>
  );
}
