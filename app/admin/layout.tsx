"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/services/api"; // 👈 NUEVO

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [pendingReports, setPendingReports] = useState<number | null>(null); // 👈 NUEVO

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setNombre(u.nombre || "Administrador");
      }
    } catch {}
  }, []);

  // 👇 Nuevo efecto: cargar contador de reportes pendientes
  useEffect(() => {
    async function loadPending() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await api.get("/reports/pending-count");
        setPendingReports(res.data?.total ?? 0);
      } catch (e) {
        console.error("Error cargando pendientes", e);
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
    { path: "/admin/reportes", label: "Reportes diarios" }, // 👈 ya existía / añadido
  ];

  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <aside className="w-64 bg-neutral-900 text-white p-5 flex flex-col">
        <h2 className="text-xl font-bold tracking-wide">APP180</h2>

        <ul className="mt-8 space-y-3">
          {menu.map((item) => {
            const isActive = pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-3 py-2 rounded-md transition ${
                    isActive ? "bg-blue-600" : "hover:bg-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>

                    {/* Badge solo en Reportes diarios */}
                    {item.path === "/admin/reportes" &&
                      pendingReports !== null &&
                      pendingReports > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-xs px-2 py-0.5">
                          {pendingReports}
                        </span>
                      )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto border-t border-neutral-700 pt-4">
          <p className="text-sm opacity-70 mb-2">Sesión iniciada:</p>
          <p className="font-semibold">{nombre}</p>

          <button
            onClick={logout}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 bg-neutral-100 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
