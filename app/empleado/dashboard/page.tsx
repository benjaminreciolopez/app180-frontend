// app/empleado/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import FloatingActionButton from "@/components/ui/FloatingActionButton";
import IOSDrawer from "@/components/ui/IOSDrawer";

import DrawerMenu from "@/components/empleado/drawer/DrawerMenu";
import DrawerCalendario from "@/components/empleado/DrawerCalendario";
import DrawerEventoDetalle from "@/components/empleado/DrawerEventoDetalle";
import DrawerSolicitarAusencia from "@/components/empleado/DrawerSolicitarAusencia";
import DrawerMisSolicitudes from "@/components/empleado/DrawerMisSolicitudes";

import type { CalendarioEvento } from "@/components/empleado/calendarioTypes";

import { FichajeAction } from "./FichajeAction";
import type { AccionFichaje } from "./FichajeAction";
import type { EstadoAusencia } from "@/types/ausencias";
import { useEstadoFichaje } from "./useEstadoFichaje";

type FichajeHoy = { id: string; tipo_label: string; hora: string };
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
  estado_color?: string;
  minutos_trabajados_hoy?: string;
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
    default:
      return "text-gray-500";
  }
}

type DrawerKey =
  | "menu"
  | "calendario"
  | "evento"
  | "vacaciones"
  | "baja"
  | "solicitudes";

type DrawerScreen = { key: DrawerKey; title: string };

export default function EmpleadoDashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    accion: accionFichaje,
    estado: estadoFichaje,
    loading: loadingFichaje,
    reload: reloadEstadoFichaje,
  } = useEstadoFichaje();

  const [workLogsHoy, setWorkLogsHoy] = useState<WorkLogHoy[]>([]);
  const [estadoDia, setEstadoDia] = useState<{
    laborable: boolean;
    label?: string;
  } | null>(null);

  // Drawer stack
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stack, setStack] = useState<DrawerScreen[]>([
    { key: "menu", title: "Opciones" },
  ]);
  const current = stack[stack.length - 1];

  // seleccionado calendario
  const [selectedEvent, setSelectedEvent] = useState<CalendarioEvento | null>(
    null
  );

  function openDrawer() {
    setDrawerOpen(true);
    setStack([{ key: "menu", title: "Opciones" }]);
    setSelectedEvent(null);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setStack([{ key: "menu", title: "Opciones" }]);
    setSelectedEvent(null);
  }
  function push(screen: DrawerScreen) {
    setStack((prev) => [...prev, screen]);
  }
  function pop() {
    setStack((prev) => {
      if (prev.length <= 1) {
        closeDrawer();
        return prev;
      }
      return prev.slice(0, -1);
    });
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

  async function loadWorkLogsHoyFn() {
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

  async function loadEstadoDiaFn() {
    try {
      const res = await api.get("/calendario/hoy");
      setEstadoDia(res.data);
    } catch {
      setEstadoDia({ laborable: true });
    }
  }

  useEffect(() => {
    loadDashboard();
    loadWorkLogsHoyFn();
    loadEstadoDiaFn();
  }, []);

  const fichajesHoy = useMemo<FichajeHoy[]>(
    () => (Array.isArray(data?.fichajes_hoy) ? data!.fichajes_hoy! : []),
    [data]
  );

  // ======= Render =======
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
      {/* FAB iOS */}
      <FloatingActionButton ariaLabel="Abrir menú" onClick={openDrawer}>
        <Menu size={18} className="text-gray-800" />
      </FloatingActionButton>

      {/* Drawer iOS stack */}
      <IOSDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        header={{
          title: current.title,
          canGoBack: stack.length > 1,
          onBack: pop,
          onClose: closeDrawer,
        }}
      >
        {current.key === "menu" ? (
          <DrawerMenu
            onCalendario={() =>
              push({ key: "calendario", title: "Calendario" })
            }
            onVacaciones={() =>
              push({ key: "vacaciones", title: "Solicitar vacaciones" })
            }
            onBaja={() => push({ key: "baja", title: "Solicitar baja médica" })}
            onSolicitudes={() =>
              push({ key: "solicitudes", title: "Mis solicitudes" })
            }
          />
        ) : null}

        {current.key === "calendario" ? (
          <DrawerCalendario
            onSelectEvent={(ev) => {
              setSelectedEvent(ev);
              push({ key: "evento", title: "Detalle" });
            }}
          />
        ) : null}

        {current.key === "evento" && selectedEvent ? (
          <DrawerEventoDetalle event={selectedEvent} />
        ) : null}

        {current.key === "vacaciones" ? (
          <DrawerSolicitarAusencia
            tipoInicial="vacaciones"
            onDone={() => {
              // tras enviar: te dejo en calendario (mejor UX)
              setSelectedEvent(null);
              setStack([
                { key: "menu", title: "Opciones" },
                { key: "calendario", title: "Calendario" },
              ]);
              // refresca estados del dashboard por si hoy deja de ser laborable
              loadEstadoDiaFn();
            }}
          />
        ) : null}

        {current.key === "baja" ? (
          <DrawerSolicitarAusencia
            tipoInicial="baja_medica"
            onDone={() => {
              setSelectedEvent(null);
              setStack([
                { key: "menu", title: "Opciones" },
                { key: "calendario", title: "Calendario" },
              ]);
              loadEstadoDiaFn();
            }}
          />
        ) : null}

        {current.key === "solicitudes" ? (
          <DrawerMisSolicitudes
            onSelectAusencia={(a) => {
              // opcional: si luego quieres detalle de solicitud, lo abrimos como evento genérico
              setSelectedEvent({
                id: `aus-${a.id}`,
                tipo: a.tipo,
                title: a.tipo === "baja_medica" ? "Baja médica" : "Vacaciones",
                start: a.fecha_inicio,
                end: a.fecha_fin,
                allDay: true,
                estado: a.estado as EstadoAusencia,
              });
              push({ key: "evento", title: "Detalle" });
            }}
          />
        ) : null}
      </IOSDrawer>

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
              estadoFichaje === "dentro" ? "text-green-600" : "text-gray-500"
            }`}
          >
            {estadoFichaje === "dentro"
              ? "Trabajando"
              : estadoFichaje === "descanso"
              ? "En descanso"
              : "Fuera de jornada"}
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

      {estadoDia?.laborable === false ? (
        <div className="p-4 border rounded bg-gray-100 text-sm text-gray-700">
          Hoy no es un día laborable: <b>{estadoDia.label || "No laborable"}</b>
        </div>
      ) : null}

      {/* Botón principal (fichaje) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 space-y-2">
        <FichajeAction
          accion={accionFichaje}
          reload={() => {
            reloadEstadoFichaje();
            loadDashboard();
            loadWorkLogsHoyFn();
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => router.push("/empleado/trabajos")}
            className="bg-white border py-3 rounded-xl text-sm font-semibold shadow-sm active:bg-black/[0.04]"
          >
            Añadir trabajo
          </button>
          <button
            onClick={openDrawer}
            className="bg-white border py-3 rounded-xl text-sm font-semibold shadow-sm active:bg-black/[0.04]"
          >
            Menú
          </button>
        </div>
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
                  {w.cliente_nombre ? (
                    <span className="text-gray-500"> · {w.cliente_nombre}</span>
                  ) : null}
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
