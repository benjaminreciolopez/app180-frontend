"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
      const raw = localStorage.getItem("user");
      if (!raw) {
        setSession(null);
        return;
      }

      const user = JSON.parse(raw);

      setSession({
        nombre: user.nombre || "Administrador",
        modulos: user.modulos || {},
      });
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

      // Jornadas y fichajes sí dependen de fichajes
      { path: "/admin/jornadas", module: "fichajes" },
      { path: "/admin/fichajes", module: "fichajes" },
      { path: "/admin/fichajes/sospechosos", module: "fichajes" },

      { path: "/admin/partes-dia", module: "worklogs" },
      { path: "/admin/trabajos", module: "worklogs" },

      // ✅ Importación OCR / historial dependen de calendario_import
      {
        path: "/admin/configuracion/calendario/importar",
        module: "calendario_import",
      },
      {
        path: "/admin/configuracion/calendario/importaciones",
        module: "calendario_import",
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
      location.href = "/admin/dashboard";
    }
  }, [pathname, session, guards]);

  // ============================
  // Logout
  // ============================
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("session-updated"));
    location.href = "/login";
  }

  // ============================
  // Estados iniciales
  // ============================
  if (checking) {
    return <div className="p-6">Cargando sesión…</div>;
  }

  if (!session) {
    return <div className="p-6">Sesión no válida</div>;
  }

  // ============================
  // Menú
  // ============================
  const menu = [
    { path: "/admin/dashboard", label: "Dashboard", module: null },

    // ✅ Calendario separado de fichajes
    { path: "/admin/calendario", label: "Calendario", module: "calendario" },

    { path: "/admin/empleados", label: "Empleados", module: "empleados" },
    { path: "/admin/clientes", label: "Clientes", module: null },
    { path: "/admin/facturacion", label: "Facturación", module: null },

    { path: "/admin/jornadas", label: "Jornadas", module: "fichajes" },
    { path: "/admin/fichajes", label: "Fichajes", module: "fichajes" },
    {
      path: "/admin/fichajes/sospechosos",
      label: "Sospechosos",
      module: "fichajes",
    },

    { path: "/admin/partes-dia", label: "Partes del día", module: "worklogs" },
    { path: "/admin/trabajos", label: "Trabajos", module: "worklogs" },

    // ✅ Importación separada
    {
      path: "/admin/configuracion/calendario/importar",
      label: "Importar calendario",
      module: "calendario_import",
    },
    {
      path: "/admin/configuracion/calendario/importaciones",
      label: "Historial importaciones",
      module: "calendario_import",
    },
  ];

  const visibleMenu = menu.filter((item) =>
    hasModule(session.modulos, item.module),
  );

  // ============================
  // Render
  // ============================
  return (
    <div className="flex h-[100svh] w-screen">
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
                className={`block px-3 py-2 rounded-md transition ${
                  pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
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
    </div>
  );
}
