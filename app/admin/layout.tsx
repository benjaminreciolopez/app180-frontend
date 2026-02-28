"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, UserCheck, RefreshCw, Clock, Plus, User, LogOut, Settings } from "lucide-react";
import { getUser, refreshMe } from "@/services/auth";
import { api } from "@/services/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AICopilot } from "@/components/shared/AICopilot";
import { isMobileDevice, isStandalone } from "@/utils/pwaDetection";
import AdminSelfConfigModal from "@/components/admin/AdminSelfConfigModal";
import AutoBackupSync from "@/components/admin/AutoBackupSync";
import { LockScreen } from "@/components/shared/LockScreen";
import { NotificationBell } from "@/components/shared/NotificationBell";

type Modulos = Record<string, boolean>;

type Session = {
  nombre: string;
  avatar_url?: string | null;
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
  const [pinConfig, setPinConfig] = useState<{
    pin_lock_enabled: boolean; pin_code: string | null;
    pin_timeout_minutes: number; screensaver_enabled: boolean;
    screensaver_style: "clock" | "logo" | "minimal";
  }>({ pin_lock_enabled: false, pin_code: null, pin_timeout_minutes: 5, screensaver_enabled: false, screensaver_style: "clock" });
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // ============================
  // Helpers
  // ============================
  function hasModule(modules: Modulos | undefined, key: string | null) {
    if (!key) return true;
    // Visibilidad estricta: Solo si existe el módulo y es explícitamente true
    return modules?.[key] === true;
  }

  // ============================
  // Cargar sesión (inicial + sync)
  // ============================
  async function loadSession(isInitial = false) {
    if (!isInitial) setChecking(true); // Mostrar carga durante refresco
    try {
      const user = getUser();
      if (!user) {
        setSession(null);
        if (isInitial) setChecking(false);
        return;
      }

      const isLargeScreen =
        typeof window !== "undefined" && window.innerWidth >= 1024;
      const isPwaMobile = isMobileDevice() && isStandalone();
      const useMobileModules = isPwaMobile && !isLargeScreen;
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
        console.warn("[AdminLayout] Detectada sesión incompleta en escritorio. Curando...");
        sessionStorage.setItem('desktop_mode_fix_attempted_v5', 'true');
        sessionStorage.removeItem('user');

        if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
          });
        }

        // Mientras se cura, mostrar sesión provisional para NO redirigir
        setSession({
          nombre: user.nombre || "Administrador",
          modulos: activeModulos,
        });
        setUserId(user.id);
        if (isInitial) setChecking(false);

        // Curar en background (refreshMe actualiza storage y dispara session-updated)
        try {
          await refreshMe();
          console.log("[AdminLayout] Datos frescos obtenidos via refreshMe.");
        } catch (err) {
          console.error("Error en curación:", err);
        }
        return;
      }

      setSession({
        nombre: user.nombre || "Administrador",
        avatar_url: user.avatar_url || null,
        modulos: activeModulos,
      });
      setUserId(user.id);
      setChecking(false);
    } catch {
      setSession(null);
      setChecking(false);
    }
  }

  useEffect(() => {
    loadSession(true);

    function onSessionUpdated() {
      loadSession(false);
    }

    window.addEventListener("session-updated", onSessionUpdated);

    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // Fetch PIN config and company logo
  useEffect(() => {
    if (!session) return;

    // Fetch PIN configuration
    api.get("/admin/configuracion").then(res => {
      if (res.data?.pin_lock_enabled) {
        setPinConfig({
          pin_lock_enabled: !!res.data.pin_lock_enabled,
          pin_code: res.data.pin_code || null,
          pin_timeout_minutes: res.data.pin_timeout_minutes || 5,
          screensaver_enabled: !!res.data.screensaver_enabled,
          screensaver_style: res.data.screensaver_style || "clock",
        });
      }
    }).catch(() => { });

    // Fetch company logo for screensaver
    api.get("/admin/facturacion/configuracion/emisor").then(res => {
      const logoPath = res.data?.data?.logo_path || res.data?.logo_path;
      if (logoPath) {
        // Handle both base64 and uploaded file paths
        const logoUrl = logoPath.startsWith('data:')
          ? logoPath
          : `/api/uploads/${logoPath}`;
        setCompanyLogo(logoUrl);
      }
    }).catch(() => { });
  }, [session]);

  // ============================
  // Guards por módulos
  // ============================
  const guards = useMemo(
    () => [
      { path: "/admin/dashboard", module: null },

      // ✅ Calendario INDEPENDIENTE de fichajes
      { path: "/admin/calendario", module: "calendario" },

      { path: "/admin/empleados", module: "empleados" },
      { path: "/admin/clientes", module: "clientes" },

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
      { path: "/admin/gastos", module: "facturacion" },
      { path: "/admin/contabilidad", module: "facturacion" }, // Nuevo: Libros
      { path: "/admin/fiscal", module: "fiscal" }, // Nuevo: Modelos (Módulo cobrable)
      { path: "/admin/fiscal/renta", module: "fiscal" },

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

  // Dynamic page title
  useEffect(() => {
    const titles: Record<string, string> = {
      "/admin/dashboard": "Dashboard",
      "/admin/empleados": "Empleados",
      "/admin/clientes": "Clientes",
      "/admin/facturacion/listado": "Facturas",
      "/admin/facturacion/crear": "Nueva Factura",
      "/admin/facturacion/pagos": "Pagos",
      "/admin/facturacion/informes": "Informes",
      "/admin/facturacion/conceptos": "Conceptos",
      "/admin/facturacion/auditoria": "Auditoría Facturas",
      "/admin/facturacion/almacenamiento": "Almacenamiento",
      "/admin/facturacion/configuracion": "Config. Facturación",
      "/admin/facturacion/dashboard": "Dashboard Facturación",
      "/admin/facturacion": "Facturación",
      "/admin/cobros-pagos": "Cobros y Pagos",
      "/admin/calendario": "Calendario",
      "/admin/jornadas": "Jornadas",
      "/admin/turnos": "Turnos",
      "/admin/fichajes/sospechosos": "Sospechosos",
      "/admin/fichajes": "Fichajes",
      "/admin/auditoria/rechazados": "Rechazados",
      "/admin/auditoria": "Auditoría",
      "/admin/partes-dia": "Partes del Día",
      "/admin/trabajos": "Trabajos diarios",
      "/admin/planings": "Planings",
      "/admin/configuracion": "Configuración",
      "/admin/perfil": "Mi Perfil",
      "/admin/reportes/rentabilidad": "Rentabilidad",
      "/admin/gastos": "Compras y Gastos",
      "/admin/contabilidad": "Contabilidad",
      "/admin/fiscal": "Fiscalidad",
      "/admin/fiscal/renta": "Declaración Renta",
      "/admin/nominas": "Nominas",
      "/admin/contabilidad/asientos": "Asientos Contables",
      "/admin/contabilidad/mayor": "Libro Mayor",
      "/admin/contabilidad/balance": "Balance de Situación",
      "/admin/contabilidad/pyg": "Pérdidas y Ganancias",
      "/admin/contabilidad/cuentas": "Plan de Cuentas",
      "/admin/mi-asesoria": "Mi Asesoría",
      "/admin/sugerencias": "Sugerencias",
      "/admin/fabricante": "Fabricante",
    };

    // Match most specific path first
    const match = Object.entries(titles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([p]) => pathname.startsWith(p));

    document.title = match ? `${match[1]} | CONTENDO` : "CONTENDO GESTIONES";
  }, [pathname]);

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
  const menuSections = [
    {
      title: "INICIO",
      items: [
        { path: "/admin/dashboard", label: "Dashboard", module: null },
      ],
    },
    {
      title: "RECURSOS HUMANOS",
      items: [
        { path: "/admin/empleados", label: "Empleados", module: "empleados" },
        { path: "/admin/nominas", label: "Nóminas", module: "empleados" },
      ],
    },
    {
      title: "PLANIFICACIÓN",
      items: [
        { path: "/admin/calendario", label: "Calendario", module: "calendario" },
        { path: "/admin/planings", label: "Gestión Planings", module: "calendario" },
        { path: "/admin/jornadas", label: "Configurar Jornadas", module: "fichajes" },
      ],
    },
    {
      title: "CONTROL HORARIO",
      items: [
        { path: "/admin/fichajes", label: "Fichajes", module: "fichajes" },
        { path: "/admin/fichajes/sospechosos", label: "Sospechosos", module: "fichajes" },
        { path: "/admin/kioscos", label: "Kioscos", module: "fichajes" },
        { path: "/admin/auditoria", label: "Auditoría", module: "fichajes" },
        { path: "/admin/auditoria/rechazados", label: "Rechazados", module: "fichajes" },
      ],
    },
    {
      title: "TRABAJOS",
      items: [
        { path: "/admin/partes-dia", label: "Partes del día", module: "worklogs" },
        { path: "/admin/trabajos", label: "Trabajos diarios", module: "worklogs" },
        { path: "/admin/reportes/rentabilidad", label: "Reporte Rentabilidad", module: "fichajes" },
      ],
    },
    {
      title: "CLIENTES",
      items: [
        { path: "/admin/clientes", label: "Clientes", module: "clientes" },
      ],
    },
    {
      title: "FACTURACIÓN",
      items: [
        { path: "/admin/facturacion", label: "Facturación", module: "facturacion" },
        { path: "/admin/gastos", label: "Compras y Gastos", module: "facturacion" },
        { path: "/admin/cobros-pagos", label: "Cobros y Pagos", module: "pagos" },
      ],
    },
    {
      title: "CONTABILIDAD",
      items: [
        { path: "/admin/contabilidad/asientos", label: "Asientos Contables", module: "facturacion" },
        { path: "/admin/contabilidad/balance", label: "Balance", module: "facturacion" },
        { path: "/admin/contabilidad/pyg", label: "Pérdidas y Ganancias", module: "facturacion" },
        { path: "/admin/contabilidad/mayor", label: "Libro Mayor", module: "facturacion" },
        { path: "/admin/contabilidad/cuentas", label: "Plan de Cuentas", module: "facturacion" },
      ],
    },
    {
      title: "FISCAL",
      items: [
        { path: "/admin/fiscal", label: "Modelos Fiscales", module: "fiscal" },
        { path: "/admin/fiscal/renta", label: "Declaración Renta", module: "fiscal" },
      ],
    },
    {
      title: "OTROS",
      items: [
        { path: "/admin/mi-asesoria", label: "Mi Asesoría", module: null },
        { path: "/admin/sugerencias", label: "Sugerencias", module: null },
        { path: "/admin/fabricante", label: "Fabricante", module: null },
        { path: "/admin/configuracion/calendario/importar", label: "Importar calendario", module: "calendario" },
        { path: "/admin/configuracion/calendario/importaciones", label: "Historial importaciones", module: "calendario" },
      ],
    },
  ];

  const isPwaMobile = isMobileDevice() && isStandalone();

  const currentUser = getUser();
  const isFabricante = currentUser?.es_fabricante === true;

  const visibleSections = menuSections
    .map((section) => {
      const visibleItems = section.items
        .filter((item) => {
          if (item.path === "/admin/fabricante") return isFabricante && isPwaMobile;
          if (isPwaMobile && (item.path.includes('/calendario/importar') || item.path.includes('/calendario/importaciones'))) return false;
          if (item.path === "/admin/jornadas") return hasModule(session.modulos, "fichajes") || hasModule(session.modulos, "calendario");
          return hasModule(session.modulos, item.module);
        })
        .map((item) => {
          if (item.path === "/admin/partes-dia" && !hasModule(session.modulos, "empleados")) {
            return { ...item, label: "Rentabilidad y Tiempos" };
          }
          return item;
        });
      return { ...section, items: visibleItems };
    })
    .filter((section) => section.items.length > 0);

  // ============================
  // Render
  // ============================
  return (
    <div className="flex h-[100svh] w-full overflow-hidden">
      <AutoBackupSync />
      {pinConfig.pin_lock_enabled && pinConfig.pin_code && (
        <LockScreen
          pinCode={pinConfig.pin_code}
          timeoutMinutes={pinConfig.pin_timeout_minutes}
          screensaverEnabled={pinConfig.screensaver_enabled}
          screensaverStyle={pinConfig.screensaver_style}
          enabled={pinConfig.pin_lock_enabled}
          companyLogo={companyLogo}
        />
      )}
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
          transform transition-all duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:flex md:flex-col
          flex flex-col overflow-hidden
          ${!menuOpen ? "pointer-events-none opacity-0 md:opacity-100 md:pointer-events-auto" : "pointer-events-auto opacity-100"}
        `}
      >
        {/* Marca de agua - Avatar de fondo sutil */}
        {session.avatar_url && (
          <div
            className="absolute -top-10 -left-10 w-64 h-64 opacity-[0.03] grayscale pointer-events-none"
            style={{
              backgroundImage: `url(${session.avatar_url})`,
              backgroundSize: 'cover',
              filter: 'blur(40px)'
            }}
          />
        )}
        {/* Mobile close */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-sm text-muted-foreground"
          >
            ✕ Cerrar
          </button>
        </div>

        <div className="relative z-10">
          <h2 className="text-xl font-bold tracking-wide">CONTENDO</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] -mt-1">Gestiones</p>
        </div>

        {/* Links por secciones */}
        <nav className="mt-6 flex-1 overflow-y-auto">
          {visibleSections.map((section, sIdx) => (
            <div key={section.title} className={sIdx > 0 ? "mt-4" : ""}>
              {section.title !== "INICIO" && (
                <div className="px-3 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section.title}
                  </span>
                </div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm transition ${pathname === item.path || (item.path !== "/admin/dashboard" && pathname.startsWith(item.path + "/"))
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                        }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

      </aside>

      {/* Main Container */}
      <main className="flex-1 bg-background h-[100svh] flex flex-col relative min-w-0 w-full md:w-auto overflow-x-hidden">

        {/* Header Premium Central */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-20">
          <div className="w-10" /> {/* Spacer */}

          <div className="flex-1 flex justify-center">
            <h1 className="text-sm font-bold tracking-[0.3em] text-foreground/80 uppercase">
              CONTENDO GESTIONES
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold leading-none">{session.nombre}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mt-1">Sesión Administrativa</p>
            </div>

            <NotificationBell />

            <button
              onClick={() => setSelfConfigOpen(true)}
              className="relative group p-0.5 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 hover:from-primary/40 transition-all duration-300"
            >
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-background bg-muted">
                {session.avatar_url ? (
                  <img
                    src={session.avatar_url}
                    alt={session.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-lg font-bold">
                    {session.nombre.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.2)] group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all" />
            </button>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors ml-2"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Header móvil */}
        <div className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b flex items-center justify-between h-14 px-4 shrink-0">
          <button
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="p-2 border rounded"
          >
            ☰
          </button>
          <h1 className="text-xs font-bold tracking-wider text-foreground/80 uppercase">CONTENDO</h1>
          <NotificationBell />
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
