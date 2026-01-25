"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/services/api";
import { Settings } from "lucide-react";
import Link from "next/link";

/* ========================
   Types
======================== */

interface TrabajandoAhoraItem {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  cliente_nombre: string | null;
  estado: string;
  desde: string;
}

interface UltimoFichaje {
  id: string;
  empleado_nombre: string;
  cliente_nombre: string | null;
  tipo: string;
  fecha: string;
}

interface DashboardData {
  empleadosActivos: number;
  fichajesHoy: number;
  sospechososHoy: number;
  trabajandoAhora: TrabajandoAhoraItem[];
  ultimosFichajes: UltimoFichaje[];
}

type Session = {
  modulos: Record<string, boolean>;
};

/* ========================
   Component
======================== */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* ========================
     Session
  ======================== */

  function loadSession() {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;

      const u = JSON.parse(raw);

      setSession({
        modulos: u.modulos || {},
      });
    } catch {}
  }

  /* ========================
     Data
  ======================== */

  async function loadDashboard() {
    try {
      setLoading(true);

      const res = await api.get("/admin/dashboard");

      setData(res.data);
      setError(null);
    } catch (err: any) {
      console.error(err);

      setError(err?.response?.data?.error || "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  /* ========================
     Effects
  ======================== */

  // inicial
  useEffect(() => {
    loadSession();
    loadDashboard();
  }, []);

  // sync session
  useEffect(() => {
    function onSessionUpdated() {
      loadSession();
      loadDashboard(); // 🔁 refresca KPIs
    }

    window.addEventListener("session-updated", onSessionUpdated);

    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // click outside menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ========================
     Helpers
  ======================== */

  function hasModule(name: string) {
    return session?.modulos?.[name] !== false;
  }

  function hora(d: string) {
    return new Date(d).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function fecha(d: string) {
    return new Date(d).toLocaleDateString("es-ES");
  }

  function labelTipo(tipo: string) {
    switch (tipo) {
      case "entrada":
        return "ENTRADA";
      case "salida":
        return "SALIDA";
      case "descanso_inicio":
        return "INICIO DESCANSO";
      case "descanso_fin":
        return "FIN DESCANSO";
      default:
        return tipo.toUpperCase();
    }
  }

  function badgeClass(tipo: string) {
    switch (tipo) {
      case "entrada":
        return "badge badge-success";
      case "salida":
        return "badge badge-danger";
      case "descanso_inicio":
      case "descanso_fin":
        return "badge badge-warning";
      default:
        return "badge badge-muted";
    }
  }

  /* ========================
     Render states
  ======================== */

  if (loading) return <p>Cargando dashboard…</p>;

  if (error || !data) {
    return (
      <div className="app-main">
        <p className="text-red-600 mb-4">{error}</p>

        <button onClick={loadDashboard} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  /* ========================
     Render
  ======================== */

  return (
    <div className="app-main">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Admin menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Settings className="w-5 h-5" />
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
              <Link
                href="/admin/configuracion"
                className="block px-4 py-2 text-sm hover:bg-gray-50"
                onClick={() => setOpenMenu(false)}
              >
                ⚙️ Configuración
              </Link>

              <Link
                href="/admin/perfil"
                className="block px-4 py-2 text-sm hover:bg-gray-50"
                onClick={() => setOpenMenu(false)}
              >
                👤 Perfil
              </Link>

              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                onClick={() => {
                  localStorage.clear();
                  window.dispatchEvent(new Event("session-updated"));
                  location.href = "/login";
                }}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasModule("empleados") && (
          <div className="kpi-card">
            <span className="kpi-label">Empleados activos</span>
            <span className="kpi-value">{data.empleadosActivos}</span>
          </div>
        )}

        {hasModule("fichajes") && (
          <div className="kpi-card">
            <span className="kpi-label">Fichajes de hoy</span>
            <span className="kpi-value">{data.fichajesHoy}</span>
          </div>
        )}

        {hasModule("fichajes") && (
          <div className="kpi-card">
            <span className="kpi-label">Sospechosos</span>
            <span className="kpi-value text-red-600">
              {data.sospechososHoy}
            </span>
          </div>
        )}
      </div>

      {/* Bloques inferiores */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Trabajando ahora */}
        {hasModule("fichajes") && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Empleados fichando ahora</h2>
            </div>

            {!data.trabajandoAhora.length ? (
              <p className="text-muted-foreground text-sm">
                Ningún empleado está fichando
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.trabajandoAhora.map((t) => (
                  <li key={t.id} className="py-3">
                    <div className="font-semibold">{t.empleado_nombre}</div>
                    <div className="text-sm text-muted-foreground">
                      Cliente: {t.cliente_nombre || "Sin cliente"} — desde{" "}
                      {hora(t.desde)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Últimos fichajes */}
        {hasModule("fichajes") && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Últimos fichajes</h2>
            </div>

            {!data.ultimosFichajes.length ? (
              <p className="text-muted-foreground text-sm">No hay fichajes</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-3 md:hidden">
                  {data.ultimosFichajes.map((f) => (
                    <div
                      key={f.id}
                      className="border border-border rounded-lg p-3"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">{f.empleado_nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {f.cliente_nombre || "Sin cliente"}
                          </p>
                        </div>

                        <span className={badgeClass(f.tipo)}>
                          {labelTipo(f.tipo)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {fecha(f.fecha)} · {hora(f.fecha)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden md:block">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Empleado</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.ultimosFichajes.map((f) => (
                        <tr key={f.id}>
                          <td>
                            {fecha(f.fecha)} {hora(f.fecha)}
                          </td>
                          <td>{f.empleado_nombre}</td>
                          <td>{f.cliente_nombre || "—"}</td>
                          <td>
                            <span className={badgeClass(f.tipo)}>
                              {labelTipo(f.tipo)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
