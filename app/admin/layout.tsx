"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
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
  const [pendingReports, setPendingReports] = useState<number | null>(null);

  // 🔐 VALIDACIÓN DE SESIÓN
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

  // 🔄 CONTADOR REPORTES
  useEffect(() => {
    if (checking) return;

    async function loadPending() {
      try {
        const res = await api.get("/reports/pending-count");
        setPendingReports(res.data?.total ?? 0);
      } catch {
        setPendingReports(null);
      }
    }

    loadPending();
  }, [checking]);

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
    { path: "/admin/empleados", label: "Empleados" },
    { path: "/admin/turnos", label: "Turnos" },
    { path: "/admin/fichajes", label: "Fichajes" },
    { path: "/admin/fichajes/sospechosos", label: "Sospechosos" },
    { path: "/admin/reportes", label: "Reportes diarios" },
  ];

  return (
    <div className="flex h-screen">
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`
    fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border p-5
    transform transition-transform
    ${menuOpen ? "translate-x-0" : "-translate-x-full"}
    md:static md:translate-x-0
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

        <h2 className="text-xl font-bold tracking-wide">APP180</h2>

        <ul className="mt-8 space-y-2">
          {menu.map((item) => (
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
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.path === "/admin/reportes" &&
                    pendingReports &&
                    pendingReports > 0 && (
                      <span className="badge-danger">{pendingReports}</span>
                    )}
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
      <div className="md:hidden sticky top-0 bg-background z-20 flex items-center gap-2 p-2 border-b">
        <button
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
          className="p-2 border rounded"
        >
          ☰
        </button>
        <span className="ml-3 font-semibold">APP180</span>
      </div>

      <main className="flex-1 bg-background p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
