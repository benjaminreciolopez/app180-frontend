// app180-frontend/app/admin/layout.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hasModule } from "@/lib/modules";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [nombre, setNombre] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");

      if (!token || !userRaw) {
        router.replace("/login");
        return;
      }

      const user = JSON.parse(userRaw);

      if (user.role !== "admin") {
        router.replace("/login");
        return;
      }

      setNombre(user.nombre || "Administrador");
    } catch {
      router.replace("/login");
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  if (checking) {
    return <div className="p-6">Cargando sesión…</div>;
  }

  const menu = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      module: null, // siempre
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
      module: null, // SIEMPRE
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
    (item) => !item.module || hasModule(item.module),
  );
  useEffect(() => {
    const current = menu.find((m) => pathname.startsWith(m.path));

    if (current?.module && !hasModule(current.module)) {
      router.replace("/admin/dashboard");
    }
  }, [pathname, router]);

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
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-sm text-muted-foreground"
          >
            ✕ Cerrar
          </button>
        </div>

        <h2 className="text-xl font-bold tracking-wide">CONTENDO GESTIONES</h2>

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

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-1">Sesión iniciada:</p>
          <p className="font-semibold">{nombre}</p>

          <Button
            variant="destructive"
            className="w-full mt-4"
            onClick={logout}
          >
            Cerrar sesión
          </Button>
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

        {/* Contenido: ÚNICA zona con scroll */}
        <div className="flex-1 overflow-y-auto md:p-6">{children}</div>
      </main>
    </div>
  );
}
