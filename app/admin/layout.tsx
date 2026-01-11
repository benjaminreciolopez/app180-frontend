"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

  // ✅ Fullscreen real SOLO en calendario (y subrutas)
  const isCalendario = pathname?.startsWith("/admin/calendario");

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
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/calendario", label: "Calendario" },
    { path: "/admin/empleados", label: "Empleados" },
    { path: "/admin/turnos", label: "Turnos" },
    { path: "/admin/fichajes", label: "Fichajes" },
    { path: "/admin/fichajes/sospechosos", label: "Sospechosos" },
    { path: "/admin/partes-dia", label: "Partes del día" },
    { path: "/admin/trabajos", label: "Trabajos" },
  ];

  return (
    <div className="flex min-h-[100dvh]">
      {/* Overlay móvil */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border p-5",
          "transform transition-transform",
          menuOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:translate-x-0",
        ].join(" ")}
      >
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="text-sm text-muted-foreground"
          >
            ✕ Cerrar
          </button>
        </div>

        <h2 className="text-xl font-bold tracking-wide">APP180</h2>

        <ul className="mt-8 space-y-2">
          {menu.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                onClick={() => setMenuOpen(false)}
                className={[
                  "block px-3 py-2 rounded-md transition",
                  pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t border-border pt-4">
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

      {/* ✅ Botón ☰ flotante (A) */}
      <button
        aria-label="Abrir menú"
        onClick={() => setMenuOpen(true)}
        className={[
          "md:hidden fixed left-3 top-3 z-50",
          "h-10 w-10 grid place-items-center",
          "rounded-xl border bg-background/90 backdrop-blur",
          "shadow-sm",
        ].join(" ")}
      >
        ☰
      </button>

      {/* Main */}
      <main
        className={[
          "flex-1 bg-background overflow-hidden",
          "min-h-[100dvh]",
          // Si es calendario: 0 padding y SIN wrapper interno con padding
          isCalendario ? "p-0" : "p-0 md:p-6",
        ].join(" ")}
      >
        <div
          className={[
            "h-full w-full",
            // En páginas normales, deja scroll aquí
            isCalendario ? "overflow-hidden" : "overflow-y-auto",
          ].join(" ")}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
