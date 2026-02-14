"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, UserCheck, RefreshCw, Clock, Plus, User } from "lucide-react";
import { getUser, refreshMe } from "@/services/auth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AICopilot } from "@/components/shared/AICopilot";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import AdminSelfConfigModal from "@/components/admin/AdminSelfConfigModal";
import AutoBackupSync from "@/components/admin/AutoBackupSync";

type Modulos = Record<string, boolean>;

type Session = {
  nombre: string;
  modulos: Modulos;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [selfConfigOpen, setSelfConfigOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ============================
  // Helpers
  // ============================
  function hasModule(modules: Modulos | undefined, key: string | null) {
    if (!key) return true;
    return modules?.[key] !== false; // por defecto ON si no existe
  }

  // ============================
  // Cargar sesión (inicial + sync)
  // ============================
  function loadSession() {
    try {
      // 🆕 Usar helper que mira ambos storages (sessionStorage y localStorage)
      const user = getUser();
      if (!user) {
        setSession(null);
        return;
      }

      // Detectar si estamos en móvil PWA para usar módulos móviles
      const isLargeScreen =
        typeof window !== "undefined" && window.innerWidth >= 1024;
      const isPwaMobile = isMobileDevice() && isStandalone();

      // Solo usar módulos móviles si es PWA móvil Y pantalla pequeña
      const useMobileModules = isPwaMobile && !isLargeScreen;

      // Si tenemos módulos móviles y debemos usarlos, bien.
      // Si NO, usamos los módulos normales (desktop/web).
      const activeModulos =
        useMobileModules && user.modulos_mobile
          ? user.modulos_mobile
          : user.modulos || {};



      // Lógica de "Curación": Si detectamos pantalla grande pero la sesión parece de móvil o está incompleta.
      const enabledModulesCount = Object.values(user.modulos || {}).filter(v => v === true).length;
      const isAdmin = user.role === 'admin';
      const hasMissingModules = isAdmin && enabledModulesCount < 5;
      const fixAttempted = typeof window !== 'undefined' ? sessionStorage.getItem('desktop_mode_fix_attempted_v5') : null;

      if (isLargeScreen && hasMissingModules && !fixAttempted) {
        console.warn("[AdminLayout] 🚨 Detectada sesión incompleta en escritorio. Limpiando caché y curando V5...");
        sessionStorage.setItem('desktop_mode_fix_attempted_v5', 'true');

        // 1. Limpiar rastro de sesión
        sessionStorage.removeItem('user');

        // 2. Desregistrar SW de forma masiva para resetear cabeceras COOP
        if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => {
              r.unregister();
              console.log("[AdminLayout] 🧹 Service Worker eliminado.");
            });
          });
        }

        // 3. Curar sesión
        refreshMe().then(() => {
          console.log("[AdminLayout] ✅ Datos frescos obtenidos. Recargando...");
          window.location.reload();
        }).catch(err => {
          console.error("Error en curación radical:", err);
          // Si falla, al menos dejamos de bloquear la pantalla tras un re-esfuerzo
          setSession({
            nombre: user.nombre || "Administrador",
            modulos: activeModulos,
          });
        });
        return;
      }

      setSession({
        nombre: user.nombre || "Administrador",
        modulos: activeModulos,
      });
      setUserId(user.id);
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    loadSession();
    setChecking(false);

    function onSessionUpdated() {
      loadSession();
    }

    window.addEventListener("session-updated", onSessionUpdated);

    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // ============================
  // Guards por módulos
  // ============================
  const guards = useMemo(
    () => [
      { path: "/admin/dashboard", module: null },

      // ✅ Calendario INDEPENDIENTE de fichajes
      { path: "/admin/calendario", module: "calendario" },

      { path: "/admin/empleados", module: "empleados" },
      { path: "/admin/clientes", module: null },

      // ✅ Facturación y Pagos como módulos independientes
      { path: "/admin/cobros-pagos", module: "pagos" },
      { path: "/admin/facturacion", module: "facturacion" },

      // Jornadas y fichajes sí dependen de fichajes
      { path: "/admin/jornadas", module: "fichajes" },
      { path: "/admin/fichajes", module: "fichajes" },
      { path: "/admin/fichajes/sospechosos", module: "fichajes" },
      { path: "/admin/auditoria", module: "fichajes" },
      { path: "/admin/auditoria/rechazados", module: "fichajes" },

      { path: "/admin/partes-dia", module: "worklogs" },
      { path: "/admin/trabajos", module: "worklogs" },

      // ✅ Importación OCR / historial dependen de calendario
      {
        path: "/admin/configuracion/calendario/importar",
        module: "calendario",
      },
      {
        path: "/admin/configuracion/calendario/importaciones",
        module: "calendario",
      },
    ],
    [],
  );

  useEffect(() => {
    if (!session) return;

    // Cogemos el guard más específico (path más largo primero)
    const current = [...guards]
      .sort((a, b) => b.path.length - a.path.length)
      .find((g) => pathname.startsWith(g.path));

    if (current?.module && !hasModule(session.modulos, current.module)) {
      // Si es un admin y detectamos que faltan muchos módulos, no redirigimos agresivamente
      const trueCount = Object.values(session.modulos).filter(v => v === true).length;
      const currentUser = getUser();
      if (currentUser?.role === 'admin' && trueCount < 3 && pathname !== '/admin/dashboard') {
        return; // No bloqueamos para permitir navegación si hay error de carga
      }

      // Excepción especial para /admin/jornadas: permitir si tiene calendario
      if (current.path === "/admin/jornadas" && hasModule(session.modulos, "calendario")) {
        return;
      }
      location.href = "/admin/dashboard";
    }
  }, [pathname, session, guards]);

  // ============================
  // Logout
  // ============================
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("desktop_mode_fix_attempted_v5");

    window.dispatchEvent(new Event("session-updated"));
    location.href = "/";
  }

  // ============================
  // Estados iniciales
  // ============================
  if (checking) {
    return <LoadingSpinner fullPage />;
  }

  if (!session) {
    // Redirigir inmediatamente sin mostrar mensaje
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

  // ============================
  // Menú
  // ============================
  const menu = [
    { path: "/admin/dashboard", label: "Dashboard", module: null },
    { path: "/admin/empleados", label: "Empleados", module: "empleados" },

    // ✅ Calendario separado de fichajes
    { path: "/admin/calendario", label: "Calendario", module: "calendario" },
    { path: "/admin/planings", label: "Gestión Planings", module: "calendario" }, // Nueva ruta V5.5
    { path: "/admin/reportes/rentabilidad", label: "Reporte Rentabilidad", module: "fichajes" },

    { path: "/admin/clientes", label: "Clientes", module: null },
    { path: "/admin/facturacion", label: "Facturación", module: "facturacion" },
    { path: "/admin/cobros-pagos", label: "Cobros y Pagos", module: "pagos" },

    { path: "/admin/jornadas", label: "Configurar Jornadas", module: "fichajes" },
    { path: "/admin/fichajes", label: "Fichajes", module: "fichajes" },
    {
      path: "/admin/fichajes/sospechosos",
      label: "Sospechosos",
      module: "fichajes",
    },

    { path: "/admin/auditoria", label: "🔍 Auditoría", module: "fichajes" },
    { path: "/admin/auditoria/rechazados", label: "🚫 Rechazados", module: "fichajes" },

    { path: "/admin/partes-dia", label: "Partes del día", module: "worklogs" },
    { path: "/admin/trabajos", label: "Trabajos", module: "worklogs" },

    // ✅ Importación calendario
    {
      path: "/admin/configuracion/calendario/importar",
      label: "Importar calendario",
      module: "calendario",
    },
    {
      path: "/admin/configuracion/calendario/importaciones",
      label: "Historial importaciones",
      module: "calendario",
    },
  ];

  const visibleMenu = menu.filter((item) => {
    if (item.path === "/admin/jornadas") {
      return hasModule(session.modulos, "fichajes") || hasModule(session.modulos, "calendario");
    }
    return hasModule(session.modulos, item.module);
  }).map(item => {
    // VISIÓN RENTABILIDAD: Si no hay empleados, el enfoque es auditar tiempos y costes
    if (item.path === "/admin/partes-dia" && !hasModule(session.modulos, "empleados")) {
      return { ...item, label: "Rentabilidad y Tiempos" };
    }
    return item;
  });

  // ============================
  // Render
  // ============================
  return (
    <div className="flex h-[100svh] w-screen">
      <AutoBackupSync />
      {/* Overlay móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border p-5
          transform transition-transform
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0
          flex flex-col
        `}
      >
        {/* Mobile close */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-sm text-muted-foreground"
          >
            ✕ Cerrar
          </button>
        </div>

        <h2 className="text-xl font-bold tracking-wide">CONTENDO GESTIONES</h2>

        {/* Links */}
        <ul className="mt-8 space-y-2 flex-1 overflow-y-auto">
          {visibleMenu.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md transition ${pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
                  }`}
              >
                {item.label}
              </Link>
            </li>
          ))}

          {/* Sección Administrador si el módulo de empleados está desactivado */}
          {!hasModule(session.modulos, "empleados") && (
            <li className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setSelfConfigOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform text-xs">
                  A
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Administrador</p>
                  <p className="text-sm font-semibold truncate">{session.nombre}</p>
                </div>
              </button>
            </li>
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Sesión iniciada:</p>
          <p className="font-semibold">{session.nombre}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-background h-[100svh] flex flex-col">
        {/* Header móvil */}
        <div className="md:hidden sticky top-0 z-30 bg-background border-b flex items-center h-12 px-3 shrink-0">
          <button
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="p-2 border rounded"
          >
            ☰
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto md:p-6">{children}</div>
      </main>

      {/* AI Copilot - Bot flotante */}
      <AICopilot />

      {/* Modal Autoconfiguración Admin */}
      {userId && (
        <AdminSelfConfigModal
          isOpen={selfConfigOpen}
          onClose={() => setSelfConfigOpen(false)}
          adminId={userId}
        />
      )}
    </div>
  );
}
