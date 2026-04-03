"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { NotificationBell } from "@/components/shared/NotificationBell";
import AdminSelfConfigModal from "@/components/admin/AdminSelfConfigModal";
import { AICopilot } from "@/components/shared/AICopilot";
import { QuickViewPanel } from "@/components/shared/QuickViewPanel";
import { QuickViewProvider } from "@/contexts/QuickViewContext";

type Modulos = Record<string, boolean>;

type AsesorUser = {
  id: string;
  nombre: string;
  email: string;
  role: string;
  empresa_id?: string;
  modulos?: Modulos;
};

function getUser(): AsesorUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasModule(modules: Modulos | undefined, key: string | null) {
  if (!key) return true;
  return modules?.[key] === true;
}

// Secciones del menu agrupadas (misma estructura que admin)
const menuSections = [
  {
    title: "INICIO",
    items: [
      { path: "/asesor/dashboard", label: "Dashboard", module: null },
    ],
  },
  {
    title: "CLIENTES",
    items: [
      { path: "/asesor/clientes", label: "Clientes Vinculados", module: null },
      { path: "/asesor/mis-clientes", label: "Mis Clientes", module: null },
    ],
  },
  {
    title: "RECURSOS HUMANOS",
    items: [
      { path: "/asesor/empleados", label: "Empleados", module: "empleados" },
    ],
  },
  {
    title: "PLANIFICACIÓN",
    items: [
      { path: "/asesor/calendario", label: "Calendario", module: "calendario" },
      { path: "/asesor/jornadas", label: "Configurar Jornadas", module: "fichajes" },
    ],
  },
  {
    title: "CONTROL HORARIO",
    items: [
      { path: "/asesor/fichajes", label: "Fichajes", module: "fichajes" },
      { path: "/asesor/fichajes/sospechosos", label: "Sospechosos", module: "fichajes" },
      { path: "/asesor/auditoria", label: "Auditoría", module: "fichajes" },
      { path: "/asesor/auditoria/rechazados", label: "Rechazados", module: "fichajes" },
    ],
  },
  {
    title: "TRABAJOS",
    items: [
      { path: "/asesor/partes-dia", label: "Partes del día", module: "worklogs" },
      { path: "/asesor/worklogs", label: "Partes de Trabajo", module: "worklogs" },
      { path: "/asesor/reportes/rentabilidad", label: "Reporte Rentabilidad", module: "fichajes" },
    ],
  },
  {
    title: "FACTURACIÓN",
    items: [
      { path: "/asesor/facturacion", label: "Facturación", module: "facturacion" },
      { path: "/asesor/gastos", label: "Compras y Gastos", module: "facturacion" },
      { path: "/asesor/pagos", label: "Cobros y Pagos", module: "pagos" },
    ],
  },
  {
    title: "CONTABILIDAD",
    items: [
      { path: "/asesor/contabilidad/asientos", label: "Asientos Contables", module: "contable" },
      { path: "/asesor/contabilidad/balance", label: "Balance", module: "contable" },
      { path: "/asesor/contabilidad/pyg", label: "Pérdidas y Ganancias", module: "contable" },
      { path: "/asesor/contabilidad/mayor", label: "Libro Mayor", module: "contable" },
      { path: "/asesor/contabilidad/cuentas", label: "Plan de Cuentas", module: "contable" },
      { path: "/asesor/nominas", label: "Nóminas", module: "contable" },
      { path: "/asesor/nominas/generar", label: "Generar Nóminas", module: "contable" },
    ],
  },
  {
    title: "FISCAL",
    items: [
      { path: "/asesor/fiscal", label: "Fiscal y Alertas", module: "fiscal" },
      { path: "/asesor/fiscal/cierre", label: "Cierre Ejercicio", module: "fiscal" },
      { path: "/asesor/fiscal/renta", label: "Declaración Renta", module: "fiscal" },
      { path: "/asesor/fiscal/reglas", label: "Reglas Fiscales", module: "fiscal" },
      { path: "/asesor/reta", label: "RETA Autónomos", module: "fiscal" },
    ],
  },
  {
    title: "OTROS",
    items: [
      { path: "/asesor/exportar", label: "Exportar", module: null },
    ],
  },
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/asesor/registro"];

export default function AsesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AsesorUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [selfConfigOpen, setSelfConfigOpen] = useState(false);

  useEffect(() => {
    if (isPublicRoute) {
      setChecking(false);
      return;
    }
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== "asesor") {
      setUser(null);
      setChecking(false);
      return;
    }
    setUser(currentUser);
    setChecking(false);
  }, [isPublicRoute]);

  // Clear asesor_empresa_id when NOT on client-specific pages
  useEffect(() => {
    const isClientPage = pathname.startsWith("/asesor/clientes/") && pathname.split("/").length > 3;
    if (!isClientPage) {
      sessionStorage.removeItem("asesor_empresa_id");
    }
  }, [pathname]);

  // Listen for session updates
  useEffect(() => {
    function onSessionUpdated() {
      const currentUser = getUser();
      if (!currentUser || currentUser.role !== "asesor") {
        setUser(null);
        return;
      }
      setUser(currentUser);
    }

    window.addEventListener("session-updated", onSessionUpdated);
    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // Dynamic page title
  useEffect(() => {
    const titles: Record<string, string> = {
      "/asesor/dashboard": "Dashboard",
      "/asesor/clientes": "Clientes",
      "/asesor/empleados": "Empleados",
      "/asesor/fichajes/sospechosos": "Sospechosos",
      "/asesor/fichajes/correcciones": "Correcciones",
      "/asesor/fichajes": "Fichajes",
      "/asesor/auditoria/rechazados": "Rechazados",
      "/asesor/auditoria": "Auditoría",
      "/asesor/calendario": "Calendario",
      "/asesor/jornadas": "Jornadas",
      "/asesor/nominas": "Nóminas",
      "/asesor/gastos": "Compras y Gastos",
      "/asesor/partes-dia": "Partes del día",
      "/asesor/worklogs": "Partes de Trabajo",
      "/asesor/reportes/rentabilidad": "Reporte Rentabilidad",
      "/asesor/facturacion": "Facturación",
      "/asesor/pagos": "Cobros y Pagos",
      "/asesor/contabilidad": "Contabilidad",
      "/asesor/fiscal/cierre": "Cierre Ejercicio",
      "/asesor/fiscal/renta": "Declaración Renta",
      "/asesor/fiscal/reglas": "Reglas Fiscales",
      "/asesor/fiscal": "Fiscal",
      "/asesor/exportar": "Exportar",
      "/asesor/configuracion": "Configuración",
    };

    const match = Object.entries(titles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([p]) => pathname.startsWith(p));

    document.title = match
      ? `${match[1]} | CONTENDO Asesoria`
      : "CONTENDO ASESORIA";
  }, [pathname]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("asesor_empresa_id");
    window.dispatchEvent(new Event("session-updated"));
    location.href = "/login";
  }

  // Public routes render children directly without layout chrome
  if (isPublicRoute) {
    if (checking) return null;
    return <>{children}</>;
  }

  if (checking) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  // Filtrar secciones visibles segun modulos
  const visibleSections = menuSections
    .map((section) => {
      const visibleItems = section.items.filter((item) =>
        hasModule(user.modulos, item.module)
      );
      return { ...section, items: visibleItems };
    })
    .filter((section) => section.items.length > 0);

  // Recopilar todas las rutas del menu
  const allMenuPaths = visibleSections.flatMap((s) => s.items.map((i) => i.path));

  return (
    <div className="flex h-[100svh] w-full overflow-hidden">
      {/* Overlay para cerrar sidebar */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border p-5
          transform transition-all duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
          flex flex-col overflow-hidden
          ${!menuOpen ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"}
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

        {/* Branding */}
        <div className="relative z-10">
          <h2 className="text-xl font-bold tracking-wide">CONTENDO</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] -mt-1">
            Asesoria
          </p>
        </div>

        {/* Navigation by sections */}
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
                {section.items.map((item) => {
                  let isActive = pathname === item.path;

                  if (
                    !isActive &&
                    item.path !== "/asesor/dashboard" &&
                    pathname.startsWith(item.path + "/")
                  ) {
                    const hasMoreSpecificMatch = allMenuPaths.some(
                      (p) =>
                        p !== item.path &&
                        p.length > item.path.length &&
                        p.startsWith(item.path) &&
                        (pathname === p || pathname.startsWith(p + "/"))
                    );
                    isActive = !hasMoreSpecificMatch;
                  }

                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={`block px-3 py-2 rounded-md text-sm transition ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User info and logout */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="mb-3">
            <p className="text-sm font-semibold truncate">{user.nombre}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 bg-background h-[100svh] flex flex-col relative min-w-0 w-full md:w-auto overflow-x-hidden">
        {/* Header unificado con hamburguesa */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 md:h-16 px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
            className="p-2 border rounded hover:bg-muted transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 flex justify-center">
            <h1 className="text-xs md:text-sm font-bold tracking-[0.2em] md:tracking-[0.3em] text-foreground/80 uppercase">
              CONTENDO ASESORIA
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold leading-none">
                {user.nombre}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mt-1">
                Portal Asesor
              </p>
            </div>

            <NotificationBell basePath="/asesor/notificaciones" />

            <button
              onClick={() => setSelfConfigOpen(true)}
              className="relative group p-0.5 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 hover:from-primary/40 transition-all duration-300"
            >
              <div className="relative w-9 h-9 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-background bg-muted">
                <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-sm md:text-lg font-bold">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.2)] group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all" />
            </button>

            <button
              onClick={logout}
              title="Cerrar sesion"
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors hidden md:block"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <QuickViewProvider>
          <div className="flex-1 overflow-y-auto md:p-6">{children}</div>
          <QuickViewPanel />
        </QuickViewProvider>
      </main>

      {/* AI Copilot - Bot flotante */}
      <AICopilot />

      {/* Modal Autoconfiguración */}
      {user?.id && (
        <AdminSelfConfigModal
          isOpen={selfConfigOpen}
          onClose={() => setSelfConfigOpen(false)}
          adminId={user.id}
          isAsesor={true}
        />
      )}
    </div>
  );
}
