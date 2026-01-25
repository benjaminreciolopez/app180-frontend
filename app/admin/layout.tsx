"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Session = {
  nombre: string;
  modulos: Record<string, boolean>;
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

    // 🔁 Escuchar cambios de sesión
    function onSessionUpdated() {
      loadSession();
    }

    window.addEventListener("session-updated", onSessionUpdated);

    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // ============================
  // Guard por módulos
  // ============================
  useEffect(() => {
    if (!session) return;

    const guards = [
      { path: "/admin/dashboard", module: null },
      { path: "/admin/calendario", module: "fichajes" },
      { path: "/admin/empleados", module: "empleados" },
      { path: "/admin/clientes", module: null },
      { path: "/admin/jornadas", module: "fichajes" },
      { path: "/admin/fichajes", module: "fichajes" },
      { path: "/admin/fichajes/sospechosos", module: "fichajes" },
      { path: "/admin/partes-dia", module: "worklogs" },
      { path: "/admin/trabajos", module: "worklogs" },
      {
        path: "/admin/configuracion/calendario/importar",
        module: "fichajes",
      },
      {
        path: "/admin/configuracion/calendario/importaciones",
        module: "fichajes",
      },
    ];

    const current = guards.find((g) => pathname.startsWith(g.path));

    if (current?.module && session.modulos[current.module] === false) {
      location.href = "/admin/dashboard";
    }
  }, [pathname, session]);

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
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      module: null,
    },
    {
      path: "/admin/calendario",
      label: "Calendario",
      module: "fichajes",
    },
    {
      path: "/admin/empleados",
      label: "Empleados",
      module: "empleados",
    },
    {
      path: "/admin/clientes",
      label: "Clientes",
      module: null,
    },
    {
      path: "/admin/jornadas",
      label: "Jornadas",
      module: "fichajes",
    },
    {
      path: "/admin/fichajes",
      label: "Fichajes",
      module: "fichajes",
    },
    {
      path: "/admin/fichajes/sospechosos",
      label: "Sospechosos",
      module: "fichajes",
    },
    {
      path: "/admin/partes-dia",
      label: "Partes del día",
      module: "worklogs",
    },
    {
      path: "/admin/trabajos",
      label: "Trabajos",
      module: "worklogs",
    },
    {
      path: "/admin/configuracion/calendario/importar",
      label: "Importar calendario",
      module: "fichajes",
    },
    {
      path: "/admin/configuracion/calendario/importaciones",
      label: "Historial importaciones",
      module: "fichajes",
    },
  ];

  const visibleMenu = menu.filter(
    (item) => !item.module || session.modulos[item.module] !== false,
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
        {/* Footer */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Sesión iniciada:</p>

          <p className="font-semibold">{session.nombre}</p>
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
