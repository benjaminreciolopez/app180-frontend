"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import { FichajeAction } from "./FichajeAction";
import type { AccionFichaje } from "./FichajeAction";

import FloatingActionButton from "@/components/ui/FloatingActionButton";
import Drawer from "@/components/ui/Drawer";

type FichajeHoy = {
  id: string;
  tipo_label: string;
  hora: string;
};

type WorkLogHoy = {
  id: string;
  descripcion: string;
  minutos: number | null;
  cliente_nombre?: string | null;
};

type DashboardData = {
  nombre?: string;
  turno?: { nombre?: string | null } | null;
  fichando?: boolean;
  estado_label?: string;
  estado_color?: string; // "green-600" | "red-600" ...
  minutos_trabajados_hoy?: string;
  accion?: AccionFichaje | null;
  fichajes_hoy?: FichajeHoy[];
};

function colorClass(color?: string) {
  switch (color) {
    case "green-600":
      return "text-green-600";
    case "red-600":
      return "text-red-600";
    case "yellow-600":
      return "text-yellow-600";
    case "blue-600":
      return "text-blue-600";
    case "gray-500":
      return "text-gray-500";
    default:
      return "text-gray-500";
  }
}

type DrawerScreenKey =
  | "menu"
  | "calendario"
  | "vacaciones"
  | "baja"
  | "solicitudes";

type DrawerScreen = {
  key: DrawerScreenKey;
  title: string;
};

export default function EmpleadoDashboard() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workLogsHoy, setWorkLogsHoy] = useState<WorkLogHoy[]>([]);
  const [estadoDia, setEstadoDia] = useState<{
    laborable: boolean;
    label?: string;
  } | null>(null);

  // Drawer iOS
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stack, setStack] = useState<DrawerScreen[]>([
    { key: "menu", title: "Opciones" },
  ]);

  const current = stack[stack.length - 1];

  function push(screen: DrawerScreen) {
    setStack((prev) => [...prev, screen]);
  }
  function popOrClose() {
    setStack((prev) => {
      if (prev.length <= 1) {
        setDrawerOpen(false);
        return [{ key: "menu", title: "Opciones" }];
      }
      return prev.slice(0, -1);
    });
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setStack([{ key: "menu", title: "Opciones" }]);
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/empleado/dashboard");
      setData((res.data || {}) as DashboardData);
    } catch (e) {
      console.error(e);
      setError("No se ha podido cargar el dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkLogsHoy() {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const res = await api.get("/worklogs/mis", {
        params: { desde: hoy, hasta: hoy },
      });
      setWorkLogsHoy(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error cargando work logs hoy", e);
      setWorkLogsHoy([]);
    }
  }

  async function loadEstadoDia() {
    try {
      const res = await api.get("/calendario/hoy");
      setEstadoDia(res.data);
    } catch {
      setEstadoDia({ laborable: true });
    }
  }

  useEffect(() => {
    loadDashboard();
    loadWorkLogsHoy();
    loadEstadoDia();
  }, []);

  const fichajesHoy = useMemo<FichajeHoy[]>(
    () => (Array.isArray(data?.fichajes_hoy) ? data!.fichajes_hoy! : []),
    [data]
  );

  if (loading) return <p className="p-4">Cargando…</p>;

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-600 font-semibold">{error}</div>
        <button className="btn-primary px-4 py-2" onClick={loadDashboard}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="app-main space-y-6 pb-24">
      {/* Botón flotante iOS */}
      <FloatingActionButton
        ariaLabel="Abrir menú"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={18} className="text-gray-800" />
      </FloatingActionButton>

      {/* Drawer iOS */}
      <Drawer open={drawerOpen} onClose={closeDrawer}>
        <div className="h-full flex flex-col bg-gray-50">
          {/* Header iOS */}
          <div className="h-14 flex items-center px-4 border-b border-black/5 bg-white">
            <button
              onClick={popOrClose}
              className="text-[15px] font-medium text-blue-600"
            >
              {stack.length > 1 ? "Volver" : "Cerrar"}
            </button>

            <div className="flex-1 text-center">
              <div className="text-[15px] font-semibold text-gray-900 truncate">
                {current.title}
              </div>
            </div>

            <div className="min-w-[64px]" />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {current.key === "menu" && (
              <div className="px-3 pt-4 space-y-4">
                <div className="px-1">
                  <div className="text-[18px] font-bold text-gray-900">
                    Opciones
                  </div>
                  <div className="text-[13px] text-gray-500 mt-1">
                    Calendario, vacaciones, bajas y solicitudes.
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                  <MenuRow
                    title="Calendario laboral"
                    subtitle="Festivos, vacaciones y bajas"
                    onClick={() =>
                      push({ key: "calendario", title: "Calendario" })
                    }
                  />
                  <Divider />
                  <MenuRow
                    title="Solicitar vacaciones"
                    subtitle="Enviar solicitud al administrador"
                    onClick={() =>
                      push({ key: "vacaciones", title: "Solicitar vacaciones" })
                    }
                  />
                  <Divider />
                  <MenuRow
                    title="Solicitar baja médica"
                    subtitle="Con adjuntos (PDF/PNG)"
                    onClick={() =>
                      push({ key: "baja", title: "Solicitar baja médica" })
                    }
                  />
                  <Divider />
                  <MenuRow
                    title="Mis solicitudes"
                    subtitle="Pendientes, aprobadas, rechazadas"
                    onClick={() =>
                      push({ key: "solicitudes", title: "Mis solicitudes" })
                    }
                  />
                </div>
              </div>
            )}

            {current.key === "calendario" && (
              <div className="p-4 text-sm text-gray-600">
                Aquí montaremos FullCalendar del empleado (con
                /calendario/usuario).
              </div>
            )}

            {current.key === "vacaciones" && (
              <div className="p-4 text-sm text-gray-600">
                Aquí irá el formulario iOS de vacaciones (POST
                /empleado/ausencias).
              </div>
            )}

            {current.key === "baja" && (
              <div className="p-4 text-sm text-gray-600">
                Aquí irá el formulario iOS de baja + adjuntos (tabla
                ausencias_adjuntos_180).
              </div>
            )}

            {current.key === "solicitudes" && (
              <div className="p-4 text-sm text-gray-600">
                Aquí irá el listado de ausencias del empleado.
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {data.nombre || "Empleado"}
        </h1>
        <p className="text-muted">
          Turno: {data.turno?.nombre ? data.turno.nombre : "Sin turno"}
        </p>
      </div>

      {/* Estado de hoy */}
      <div className="bg-white border rounded p-4 space-y-2">
        <h2 className="font-semibold text-lg">Estado de hoy</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Situación actual</span>
          <span
            className={`font-bold ${
              data.fichando ? "text-green-600" : "text-gray-500"
            }`}
          >
            {data.fichando ? "Trabajando" : "Fuera de jornada"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estado</span>
          <span className={`font-semibold ${colorClass(data.estado_color)}`}>
            {data.estado_label || "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Hoy</span>
          <span className="font-semibold">
            {data.minutos_trabajados_hoy || "—"}
          </span>
        </div>
      </div>

      {estadoDia?.laborable === false && (
        <div className="p-4 border rounded bg-gray-100 text-sm text-gray-700">
          Hoy no es un día laborable: <b>{estadoDia.label}</b>
        </div>
      )}

      {/* Botón principal (fichaje) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 space-y-2">
        {estadoDia?.laborable !== false && (
          <FichajeAction
            accion={data.accion ?? null}
            reload={() => {
              loadDashboard();
              loadWorkLogsHoy();
            }}
          />
        )}

        {/* Secundarios (si quieres mantenerlos) */}
        <div className="grid grid-cols-2 gap-2"></div>
      </div>

      {/* Fichajes hoy */}
      <div className="card">
        <h3 className="font-semibold mb-3">Fichajes de hoy</h3>

        {fichajesHoy.length === 0 ? (
          <p className="text-sm text-gray-500">No hay fichajes hoy</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {fichajesHoy.map((f) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.tipo_label}</span>
                <span>{f.hora}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Worklogs hoy */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Trabajos de hoy</h3>

          <button
            className="btn-primary text-sm px-3 py-1"
            onClick={() => router.push("/empleado/trabajos")}
          >
            Añadir
          </button>
        </div>

        {workLogsHoy.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay trabajos registrados hoy
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {workLogsHoy.map((w) => (
              <li key={w.id} className="flex justify-between">
                <span className="truncate">
                  {w.descripcion}
                  {w.cliente_nombre && (
                    <span className="text-gray-500"> · {w.cliente_nombre}</span>
                  )}
                </span>
                <span>{w.minutos ?? "—"} min</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MenuRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-100 transition"
    >
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-gray-900">{title}</div>
        {subtitle ? (
          <div className="text-[13px] text-gray-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
      <div className="text-gray-400">›</div>
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-black/5" />;
}
