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

  const [nombre, setNombre] = useState("Administrador");
  const [pendingReports, setPendingReports] = useState<number | null>(null);

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setNombre(u.nombre || "Administrador");
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function loadPending() {
      try {
        const res = await api.get("/reports/pending-count");
        setPendingReports(res.data?.total ?? 0);
      } catch {
        setPendingReports(null);
      }
    }
    loadPending();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
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
      {/* SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border p-5 flex flex-col">
        <h2 className="text-xl font-bold tracking-wide">APP180</h2>

        <ul className="mt-8 space-y-2">
          {menu.map((item) => {
            const isActive = pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-3 py-2 rounded-md transition ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>

                    {item.path === "/admin/reportes" &&
                      pendingReports !== null &&
                      pendingReports > 0 && (
                        <span className="badge-danger">{pendingReports}</span>
                      )}
                  </div>
                </Link>
              </li>
            );
          })}
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

      {/* CONTENT */}
      <main className="flex-1 bg-background p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
