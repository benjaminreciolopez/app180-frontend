"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogOut, Menu, ChevronDown, ChevronRight, Home, Briefcase, Users, Calculator, MoreHorizontal } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { NotificationBell } from "@/components/shared/NotificationBell";
import AdminSelfConfigModal from "@/components/admin/AdminSelfConfigModal";
import { AICopilot } from "@/components/shared/AICopilot";
import { QuickViewPanel } from "@/components/shared/QuickViewPanel";
import { QuickViewProvider } from "@/contexts/QuickViewContext";
import { usePwaMobile } from "@/hooks/usePwaMobile";
import { BottomNav, BottomNavItem } from "@/components/shared/BottomNav";
import { MoreSheet, MoreSheetSection } from "@/components/shared/MoreSheet";

type Modulos = Record<string, boolean>;

type AsesorUser = {
  id: string;
  nombre: string;
  email: string;
  role: string;
  empresa_id?: string;
  modulos?: Modulos;
  modulos_mobile?: Modulos | null;
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

// ─────────────────────────────────────────────────────────
// MI DESPACHO: gestión interna de la propia asesoría
// Replica la estructura del modo empresa (admin)
// ─────────────────────────────────────────────────────────
const miDespachoSections = [
  {
    title: "INICIO",
    items: [
      { path: "/asesor/dashboard", label: "Dashboard", module: null },
    ],
  },
  {
    title: "EQUIPO",
    items: [
      { path: "/asesor/mi-equipo", label: "Empleados", module: "empleados" },
      { path: "/asesor/calendario", label: "Calendario", module: "calendario" },
      { path: "/asesor/planings", label: "Gestión Planings", module: "calendario" },
      { path: "/asesor/jornadas", label: "Configurar Jornadas", module: "fichajes" },
      { path: "/asesor/fichajes", label: "Fichajes", module: "fichajes" },
      { path: "/asesor/fichajes/sospechosos", label: "Sospechosos", module: "fichajes" },
      { path: "/asesor/kioscos", label: "Kioscos", module: "fichajes" },
      { path: "/asesor/auditoria", label: "Auditoria", module: "fichajes" },
      { path: "/asesor/auditoria/rechazados", label: "Rechazados", module: "fichajes" },
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
      { path: "/asesor/contabilidad/extracto", label: "Extracto Bancario", module: "contable" },
      { path: "/asesor/nominas", label: "Nóminas", module: "contable" },
      { path: "/asesor/nominas/entregas", label: "Entregas Nóminas", module: "contable" },
    ],
  },
  {
    title: "FISCAL",
    items: [
      { path: "/asesor/fiscal", label: "Fiscal y Alertas", module: "fiscal" },
      { path: "/asesor/fiscal/cierre", label: "Cierre Ejercicio", module: "fiscal" },
      { path: "/asesor/fiscal/modelos-anuales", label: "Modelos Anuales", module: "fiscal" },
      { path: "/asesor/fiscal/renta", label: "Declaración Renta", module: "fiscal" },
      { path: "/asesor/fiscal/reglas", label: "Reglas Fiscales", module: "fiscal" },
      { path: "/asesor/sii", label: "SII", module: "fiscal" },
    ],
  },
  {
    title: "CONFIGURACIÓN",
    items: [
      { path: "/asesor/configuracion", label: "Configuración", module: null },
      { path: "/asesor/certificados", label: "Certificados", module: null },
      { path: "/asesor/exportar", label: "Exportar", module: null },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// MIS CLIENTES: gestión profesional de la cartera
// Cross-client views + acceso per-client
// ─────────────────────────────────────────────────────────
const misClientesSections = [
  {
    title: "CLIENTES",
    items: [
      { path: "/asesor/clientes", label: "Clientes Vinculados", module: null },
      { path: "/asesor/mis-clientes", label: "Directorio Clientes", module: null },
    ],
  },
  {
    title: "LABORAL",
    items: [
      { path: "/asesor/empleados", label: "Empleados", module: "empleados" },
      { path: "/asesor/laboral", label: "Laboral", module: "empleados" },
      { path: "/asesor/nominas/generar", label: "Generar Nóminas", module: "contable" },
    ],
  },
  {
    title: "ESPECIALIZADO",
    items: [
      { path: "/asesor/reta", label: "RETA Autónomos", module: "fiscal" },
      { path: "/asesor/certificados-clientes", label: "Certificados Digitales", module: null },
    ],
  },
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/asesor/registro"];

export default function AsesorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <AsesorLayoutInner>{children}</AsesorLayoutInner>
    </Suspense>
  );
}

function AsesorLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPopup = searchParams.get("popup") === "true";

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [user, setUser] = useState<AsesorUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [selfConfigOpen, setSelfConfigOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const pwaMobile = usePwaMobile();
  const isPwaMobile = pwaMobile?.isPwaMobile ?? false;

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

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
      "/asesor/mis-clientes": "Directorio Clientes",
      "/asesor/mi-equipo": "Equipo del Despacho",
      "/asesor/empleados": "Empleados Clientes",
      "/asesor/fichajes/sospechosos": "Sospechosos",
      "/asesor/fichajes/correcciones": "Correcciones",
      "/asesor/fichajes": "Fichajes",
      "/asesor/auditoria/rechazados": "Rechazados",
      "/asesor/auditoria": "Auditoria",
      "/asesor/calendario": "Calendario",
      "/asesor/planings": "Planings",
      "/asesor/jornadas": "Jornadas",
      "/asesor/laboral": "Laboral",
      "/asesor/nominas/generar": "Generar Nóminas",
      "/asesor/nominas/entregas": "Entregas Nóminas",
      "/asesor/nominas": "Nóminas",
      "/asesor/gastos": "Compras y Gastos",
      "/asesor/worklogs": "Partes de Trabajo",
      "/asesor/reportes/rentabilidad": "Reporte Rentabilidad",
      "/asesor/facturacion": "Facturación",
      "/asesor/pagos": "Cobros y Pagos",
      "/asesor/contabilidad/asientos": "Asientos Contables",
      "/asesor/contabilidad/balance": "Balance",
      "/asesor/contabilidad/pyg": "Pérdidas y Ganancias",
      "/asesor/contabilidad/mayor": "Libro Mayor",
      "/asesor/contabilidad/cuentas": "Plan de Cuentas",
      "/asesor/contabilidad/extracto": "Extracto Bancario",
      "/asesor/contabilidad": "Contabilidad",
      "/asesor/fiscal/cierre": "Cierre Ejercicio",
      "/asesor/fiscal/modelos-anuales": "Modelos Anuales",
      "/asesor/fiscal/renta": "Declaración Renta",
      "/asesor/fiscal/reglas": "Reglas Fiscales",
      "/asesor/fiscal": "Fiscal",
      "/asesor/sii": "SII",
      "/asesor/reta": "RETA Autónomos",
      "/asesor/exportar": "Exportar",
      "/asesor/configuracion": "Configuración",
      "/asesor/certificados": "Certificados",
      "/asesor/certificados-clientes": "Certificados Clientes",
      "/asesor/kioscos": "Kioscos",
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

  // En PWA móvil, usar el subset modulos_mobile si está definido
  const activeModulos: Modulos =
    isPwaMobile && user.modulos_mobile ? user.modulos_mobile : user.modulos || {};

  // ─── Filtrar secciones visibles según módulos ───
  type MenuSection = { title: string; items: { path: string; label: string; module: string | null }[] };
  function filterSections(sections: MenuSection[]) {
    return sections
      .map((section) => {
        const visibleItems = section.items.filter((item) =>
          hasModule(activeModulos, item.module)
        );
        return { ...section, items: visibleItems };
      })
      .filter((section) => section.items.length > 0);
  }

  const visibleDespacho = filterSections(miDespachoSections);
  const visibleClientes = filterSections(misClientesSections);

  // Recopilar todas las rutas del menú para active-state matching
  const allMenuPaths = [
    ...visibleDespacho.flatMap((s) => s.items.map((i) => i.path)),
    ...visibleClientes.flatMap((s) => s.items.map((i) => i.path)),
  ];

  // ─── Render de una sección del menú ───
  function renderSection(section: { title: string; items: { path: string; label: string; module: string | null }[] }, sIdx: number) {
    return (
      <div key={section.title} className={sIdx > 0 ? "mt-3" : ""}>
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
                  className={`block px-3 py-1.5 rounded-md text-sm transition ${
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
    );
  }

  // ─── Render de un grupo (MI DESPACHO / MIS CLIENTES) ───
  function renderGroup(groupKey: string, groupLabel: string, sections: typeof visibleDespacho) {
    if (sections.length === 0) return null;
    const isCollapsed = collapsedGroups[groupKey] ?? false;

    return (
      <div className="mb-2">
        {/* Group header — clickable to collapse */}
        <button
          onClick={() => toggleGroup(groupKey)}
          className="flex items-center justify-between w-full px-3 py-2 mb-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/80">
            {groupLabel}
          </span>
          {isCollapsed ? (
            <ChevronRight size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>

        {/* Sections inside group */}
        {!isCollapsed && (
          <div className="ml-1 border-l-2 border-primary/10 pl-1">
            {sections.map((section, sIdx) => renderSection(section, sIdx))}
          </div>
        )}
      </div>
    );
  }

  // Modo popup: renderizar solo el contenido sin sidebar, header ni copilot
  if (isPopup) {
    return (
      <div className="h-[100svh] w-full overflow-hidden bg-background flex flex-col">
        {children}
      </div>
    );
  }

  // ─── BottomNav PWA móvil ───
  const bottomNavPrimary = [
    { href: "/asesor/dashboard", label: "Inicio", icon: Home, module: null as string | null },
    { href: "/asesor/clientes", label: "Clientes", icon: Briefcase, module: null as string | null },
    { href: "/asesor/mi-equipo", label: "Equipo", icon: Users, module: "empleados" },
    { href: "/asesor/fiscal", label: "Fiscal", icon: Calculator, module: "fiscal" },
  ].filter((item) => hasModule(activeModulos, item.module));

  const primaryPaths = new Set(bottomNavPrimary.map((i) => i.href));
  const moreSections: MoreSheetSection[] = [
    ...visibleDespacho.map((s) => ({
      title: s.title,
      items: s.items
        .filter((i) => !primaryPaths.has(i.path))
        .map((i) => ({ path: i.path, label: i.label })),
    })),
    ...visibleClientes.map((s) => ({
      title: s.title,
      items: s.items
        .filter((i) => !primaryPaths.has(i.path))
        .map((i) => ({ path: i.path, label: i.label })),
    })),
  ].filter((s) => s.items.length > 0);

  const bottomNavItems: BottomNavItem[] = [
    ...bottomNavPrimary,
    {
      label: "Más",
      icon: MoreHorizontal,
      onClick: () => setMoreOpen(true),
      match: () => moreOpen,
    },
  ];

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

        {/* Navigation — two groups */}
        <nav className="mt-5 flex-1 overflow-y-auto pr-1">
          {renderGroup("despacho", "Mi Despacho", visibleDespacho)}

          {/* Separator between groups */}
          {visibleDespacho.length > 0 && visibleClientes.length > 0 && (
            <div className="my-2 border-t border-border/50" />
          )}

          {renderGroup("clientes", "Mis Clientes", visibleClientes)}
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
          {isPwaMobile ? (
            <div className="w-10" aria-hidden="true" />
          ) : (
            <button
              aria-label="Abrir menu"
              onClick={() => setMenuOpen(true)}
              className="p-2 border rounded hover:bg-muted transition-colors"
            >
              <Menu size={20} />
            </button>
          )}

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

        {/* TopNav PWA móvil — debajo del header, encima del contenido */}
        {isPwaMobile && <BottomNav items={bottomNavItems} />}

        {/* Page content */}
        <QuickViewProvider>
          <div className="flex-1 overflow-y-auto md:p-6">
            {children}
          </div>
          <QuickViewPanel />
        </QuickViewProvider>
      </main>

      {/* MoreSheet PWA móvil */}
      {isPwaMobile && (
        <>
          <MoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            sections={moreSections}
            title="Menú"
          />
        </>
      )}

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
