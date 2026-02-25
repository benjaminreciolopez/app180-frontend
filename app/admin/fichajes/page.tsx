"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, ShieldCheck, ShieldX, ShieldAlert, ChevronDown, ChevronUp, Loader2, RefreshCw, AlertTriangle, MessageSquareWarning } from "lucide-react";

type TipoFichaje = "entrada" | "salida" | "descanso_inicio" | "descanso_fin";

interface FichajeAPI {
  id: string;
  jornada_id: string | null;
  empleado_id?: string | null; // si lo devuelves
  nombre_empleado: string;
  fecha: string; // ISO
  tipo: TipoFichaje;
  sospechoso?: boolean;
  nota?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
}

type Movimiento = {
  id: string;
  tipo: TipoFichaje;
  fecha: string; // ISO
  sospechoso?: boolean;
  nota?: string | null;
  ubicacion?: string | null;
};

interface JornadaUI {
  jornada_id: string;
  empleado: string;
  fechaDia: string; // YYYY-MM-DD (local)
  entrada?: string; // ISO
  salida?: string; // ISO
  estado: "OK" | "Sospechoso";
  motivo?: string | null;
  movimientos: Movimiento[];
}

function ymdLocal(d = new Date()) {
  // YYYY-MM-DD en zona local del navegador
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fechaDiaLocal(iso: string) {
  // Convierte ISO -> YYYY-MM-DD en zona local (evita UTC)
  const d = new Date(iso);
  return ymdLocal(d);
}

function horaLocal(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ubicacionLine(f: Pick<FichajeAPI, "direccion" | "ciudad" | "pais">) {
  const parts = [f.direccion, f.ciudad, f.pais].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function agruparPorJornada(fichajes: FichajeAPI[]): JornadaUI[] {
  const map = new Map<string, JornadaUI>();

  for (const f of fichajes) {
    const dia = fechaDiaLocal(f.fecha);
    const key = f.jornada_id ?? `${f.nombre_empleado}-${dia}`; // fallback

    if (!map.has(key)) {
      map.set(key, {
        jornada_id: key,
        empleado: f.nombre_empleado,
        fechaDia: dia,
        estado: f.sospechoso ? "Sospechoso" : "OK",
        motivo: f.nota || null,
        movimientos: [],
      });
    }

    const j = map.get(key)!;

    // acumula motivo
    if (f.nota) {
      j.motivo = j.motivo ? `${j.motivo} | ${f.nota}` : f.nota;
    }

    // estado
    if (f.sospechoso) j.estado = "Sospechoso";

    // movimientos (ordenaremos luego)
    j.movimientos.push({
      id: f.id,
      tipo: f.tipo,
      fecha: f.fecha,
      sospechoso: f.sospechoso,
      nota: f.nota ?? null,
      ubicacion: ubicacionLine(f),
    });
  }

  // post-proceso: ordenar movimientos y definir entrada/salida visibles
  const out = Array.from(map.values()).map((j) => {
    j.movimientos.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // primera entrada y última salida del día/jornada (si existen)
    const entradas = j.movimientos.filter((m) => m.tipo === "entrada");
    const salidas = j.movimientos.filter((m) => m.tipo === "salida");
    if (entradas.length) j.entrada = entradas[0].fecha;
    if (salidas.length) j.salida = salidas[salidas.length - 1].fecha;

    return j;
  });

  // Orden: más reciente primero por día, y dentro por última marca
  out.sort((a, b) => {
    const aLast = a.movimientos[a.movimientos.length - 1]?.fecha ?? a.fechaDia;
    const bLast = b.movimientos[b.movimientos.length - 1]?.fecha ?? b.fechaDia;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });

  return out;
}

function withLocalOffset(dateStr: string, timeStr: string) {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  const off = -d.getTimezoneOffset(); // minutos
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`;
}

export default function FichajesPage() {
  const [loading, setLoading] = useState(true);

  // datos raw
  const [raw, setRaw] = useState<FichajeAPI[]>([]);

  // filtros globales
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>(""); // nombre (o id si lo tienes)
  const [modoFecha, setModoFecha] = useState<"todos" | "hoy" | "fecha">(
    "todos"
  );
  const [fechaFiltro, setFechaFiltro] = useState<string>(ymdLocal());

  // modal fichaje manual (tu código)
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    empleado_id: "",
    fecha: "",
    tipo: "entrada", // entrada | salida | completa
    hora: "",
    horaEntrada: "",
    horaSalida: "",
    motivo: "",
  });

  // saving state for manual fichaje
  const [saving, setSaving] = useState(false);

  // integridad panel
  const [integridadOpen, setIntegridadOpen] = useState(false);
  const [integridadLoading, setIntegridadLoading] = useState(false);
  const [integridadResult, setIntegridadResult] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [regenerando, setRegenerando] = useState(false);
  const [correccionesPendientes, setCorreccionesPendientes] = useState(0);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await api.get("/api/admin/fichajes/integridad/estadisticas");
      setStats(res.data);
    } catch { /* silencio */ } finally {
      setStatsLoading(false);
    }
  }

  async function verificarIntegridad() {
    setIntegridadLoading(true);
    try {
      const res = await api.get("/api/admin/fichajes/integridad/verificar");
      setIntegridadResult(res.data?.verificacion || res.data);
    } catch (e: any) {
      showError("Error verificando integridad");
    } finally {
      setIntegridadLoading(false);
    }
  }

  async function regenerarHashes() {
    setRegenerando(true);
    try {
      const res = await api.post("/api/admin/fichajes/integridad/regenerar");
      showSuccess(`${res.data.procesados} fichajes sellados con hash`);
      await loadStats();
      setIntegridadResult(null);
    } catch {
      showError("Error regenerando hashes");
    } finally {
      setRegenerando(false);
    }
  }

  async function loadCorreccionesPendientes() {
    try {
      const res = await api.get("/api/admin/fichajes/correcciones?estado=pendiente");
      const data = Array.isArray(res.data) ? res.data : [];
      setCorreccionesPendientes(data.length);
    } catch { /* silencio */ }
  }

  // detalle jornada (al clicar)
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [jornadaSel, setJornadaSel] = useState<JornadaUI | null>(null);

  async function loadEmpleados() {
    const res = await api.get("/employees");
    setEmpleados(res.data || []);
  }

  async function loadFichajes() {
    setLoading(true);
    try {
      const res = await api.get("/fichajes"); // siempre el mismo endpoint
      setRaw(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Error cargando fichajes", e);
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpleados();
    loadFichajes();
    loadStats();
    loadCorreccionesPendientes();
  }, []);

  // aplica filtros en frontend (estable en zona local)
  const rawFiltrado = useMemo(() => {
    const hoy = ymdLocal();

    return raw.filter((f) => {
      // filtro empleado por nombre (si luego devuelves empleado_id, cámbialo a id)
      if (empleadoFiltro) {
        if (
          (f.nombre_empleado || "").toLowerCase() !==
          empleadoFiltro.toLowerCase()
        ) {
          return false;
        }
      }

      // filtro fecha
      if (modoFecha === "hoy") {
        return fechaDiaLocal(f.fecha) === hoy;
      }
      if (modoFecha === "fecha") {
        return fechaDiaLocal(f.fecha) === fechaFiltro;
      }
      return true;
    });
  }, [raw, empleadoFiltro, modoFecha, fechaFiltro]);

  const jornadas = useMemo(() => agruparPorJornada(rawFiltrado), [rawFiltrado]);

  async function registrarManual() {
    if (!form.empleado_id || !form.fecha) {
      showError("Empleado y fecha obligatorios");
      return;
    }

    setSaving(true);
    try {
      if (form.tipo !== "completa") {
        if (!form.hora) {
          showError("Debes indicar la hora");
          return;
        }
        const fechaHora = withLocalOffset(form.fecha, form.hora);

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: form.tipo,
          fecha_hora: fechaHora,
          motivo: form.motivo || null,
        });
      } else {
        if (!form.horaEntrada || !form.horaSalida) {
          showError("Debes indicar hora de entrada y salida");
          return;
        }

        const entrada = withLocalOffset(form.fecha, form.horaEntrada);
        const salida = withLocalOffset(form.fecha, form.horaSalida);

        if (entrada >= salida) {
          showError("La salida debe ser posterior a la entrada");
          return;
        }

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: "entrada",
          fecha_hora: entrada,
          motivo: form.motivo || null,
        });

        await api.post("/fichajes/manual", {
          empleado_id: form.empleado_id,
          tipo: "salida",
          fecha_hora: salida,
          motivo: form.motivo || null,
        });
      }

      showSuccess('Fichaje creado correctamente');
      setShowModal(false);
      setForm({
        empleado_id: "",
        fecha: "",
        tipo: "entrada",
        hora: "",
        horaEntrada: "",
        horaSalida: "",
        motivo: "",
      });
      await loadFichajes();
    } catch (e) {
      console.error(e);
      showError('Error creando fichaje');
    } finally {
      setSaving(false);
    }
  }

  function openDetalle(j: JornadaUI) {
    setJornadaSel(j);
    setDetalleOpen(true);
  }

  function closeDetalle() {
    setDetalleOpen(false);
    setJornadaSel(null);
  }

  // detalle: filtros dentro (hoy/fecha) aplicados a movimientos
  const [detalleModoFecha, setDetalleModoFecha] = useState<
    "todos" | "hoy" | "fecha"
  >("todos");
  const [detalleFecha, setDetalleFecha] = useState<string>(ymdLocal());

  const movimientosDetalle = useMemo(() => {
    if (!jornadaSel) return [];
    const hoy = ymdLocal();

    return jornadaSel.movimientos.filter((m) => {
      const dia = fechaDiaLocal(m.fecha);
      if (detalleModoFecha === "hoy") return dia === hoy;
      if (detalleModoFecha === "fecha") return dia === detalleFecha;
      return true;
    });
  }, [jornadaSel, detalleModoFecha, detalleFecha]);

  if (loading) return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded" />
      <div className="bg-white border rounded overflow-hidden">
        <div className="bg-gray-100 p-3 flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Fichajes (Jornadas)</h1>

        <div className="flex gap-2">
            <UniversalExportButton 
                module="fichajes" 
                queryParams={{ 
                    desde: modoFecha === 'fecha' ? fechaFiltro : (modoFecha === 'hoy' ? ymdLocal() : undefined),
                    hasta: modoFecha === 'fecha' ? fechaFiltro : (modoFecha === 'hoy' ? ymdLocal() : undefined),
                    // Buscamos el ID si hay nombre seleccionado
                    empleado_id: empleadoFiltro ? empleados.find(e => e.nombre === empleadoFiltro)?.id : undefined
                }} 
                label="Exportar"
            />
            <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => setShowModal(true)}
            >
            + Registrar fichaje manual
            </button>
        </div>
      </div>

      {/* FILTROS GLOBAL */}
      <div className="bg-white border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Empleado */}
          <div>
            <label className="text-sm font-semibold">Empleado</label>
            <select
              className="border p-2 w-full rounded"
              value={empleadoFiltro}
              onChange={(e) => setEmpleadoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {empleados.map((e) => (
                <option value={e.nombre} key={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-sm font-semibold">Fecha</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setModoFecha("todos")}
                className={`px-3 py-2 rounded ${
                  modoFecha === "todos"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setModoFecha("hoy")}
                className={`px-3 py-2 rounded ${
                  modoFecha === "hoy" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setModoFecha("fecha")}
                className={`px-3 py-2 rounded ${
                  modoFecha === "fecha"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                Por fecha
              </button>
            </div>
            {modoFecha === "fecha" ? (
              <input
                type="date"
                className="border p-2 rounded w-full mt-2"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
              />
            ) : null}
          </div>

          {/* Acciones */}
          <div className="flex items-end gap-2">
            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                setEmpleadoFiltro("");
                setModoFecha("todos");
                setFechaFiltro(ymdLocal());
              }}
            >
              Limpiar
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
              onClick={loadFichajes}
              disabled={loading}
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Jornadas: <b>{jornadas.length}</b> · Fichajes filtrados:{" "}
          <b>{rawFiltrado.length}</b>
        </div>
      </div>

      {/* INTEGRIDAD + CORRECCIONES PANEL */}
      <div className="bg-white border rounded overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          onClick={() => { setIntegridadOpen(!integridadOpen); if (!integridadOpen && !stats) loadStats(); }}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm">Integridad y Compliance (RD 8/2019)</span>
            {correccionesPendientes > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {correccionesPendientes} correcciones pendientes
              </span>
            )}
            {stats && stats.sin_hash > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.sin_hash} sin sellar
              </span>
            )}
            {stats && stats.sin_hash === 0 && stats.total_fichajes > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                100% sellado
              </span>
            )}
          </div>
          {integridadOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {integridadOpen && (
          <div className="border-t p-4 space-y-4">
            {/* Estadísticas */}
            {statsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando estadísticas...
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded p-3 text-center">
                  <p className="text-2xl font-bold">{stats.total_fichajes}</p>
                  <p className="text-xs text-gray-500">Total fichajes</p>
                </div>
                <div className="bg-gray-50 rounded p-3 text-center">
                  <p className="text-2xl font-bold">{stats.total_empleados}</p>
                  <p className="text-xs text-gray-500">Empleados</p>
                </div>
                <div className={`rounded p-3 text-center ${stats.sin_hash > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-2xl font-bold">{stats.con_hash}</p>
                  <p className="text-xs text-gray-500">Con hash SHA-256</p>
                </div>
                <div className={`rounded p-3 text-center ${stats.sin_hash > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${stats.sin_hash > 0 ? 'text-amber-600' : 'text-green-600'}`}>{stats.sin_hash}</p>
                  <p className="text-xs text-gray-500">Sin sellar (legacy)</p>
                </div>
              </div>
            ) : null}

            {/* Acciones */}
            <div className="flex flex-wrap gap-3">
              {/* Verificar cadena */}
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                onClick={verificarIntegridad}
                disabled={integridadLoading}
              >
                {integridadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {integridadLoading ? "Verificando..." : "Verificar cadena de hashes"}
              </button>

              {/* Regenerar legacy */}
              {stats && stats.sin_hash > 0 && (
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  onClick={regenerarHashes}
                  disabled={regenerando}
                >
                  {regenerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {regenerando ? "Sellando..." : `Sellar ${stats.sin_hash} fichajes legacy`}
                </button>
              )}

              {/* Correcciones pendientes */}
              {correccionesPendientes > 0 && (
                <a
                  href="/admin/fichajes/correcciones"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded text-sm font-medium hover:bg-amber-200"
                >
                  <MessageSquareWarning className="w-4 h-4" />
                  {correccionesPendientes} correcciones pendientes
                </a>
              )}
            </div>

            {/* Resultado de verificación */}
            {integridadResult && (
              <div className={`rounded-lg p-4 ${integridadResult.valido ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {integridadResult.valido
                    ? <ShieldCheck className="w-6 h-6 text-green-600" />
                    : <ShieldX className="w-6 h-6 text-red-600" />
                  }
                  <div>
                    <p className={`font-semibold ${integridadResult.valido ? 'text-green-800' : 'text-red-800'}`}>
                      {integridadResult.valido ? "Cadena íntegra" : "Errores detectados"}
                    </p>
                    <p className="text-sm text-gray-600">{integridadResult.mensaje}</p>
                  </div>
                </div>
                {integridadResult.errores?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {integridadResult.errores.slice(0, 5).map((err: any, i: number) => (
                      <div key={i} className="text-xs text-red-700 bg-red-100 rounded px-2 py-1 font-mono">
                        {err.tipo}: fichaje {err.fichaje_id?.substring(0, 8)}... ({new Date(err.fecha).toLocaleDateString("es-ES")})
                      </div>
                    ))}
                    {integridadResult.errores.length > 5 && (
                      <p className="text-xs text-red-600">...y {integridadResult.errores.length - 5} errores más</p>
                    )}
                  </div>
                )}
                {integridadResult.valido && (
                  <p className="text-xs text-green-600 mt-1">
                    {integridadResult.total_fichajes} fichajes de {integridadResult.empleados_verificados} empleado(s) verificados correctamente
                  </p>
                )}
              </div>
            )}

            {/* Info legal */}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              RD 8/2019, art. 34.9 ET: Los fichajes se sellan con hash SHA-256 encadenado. Cada registro incluye el hash del anterior, formando una cadena verificable. Las correcciones generan nuevos registros sin modificar los originales.
            </p>
          </div>
        )}
      </div>

      {/* TABLA JORNADAS */}
      {jornadas.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin fichajes"
          description="No hay jornadas para el filtro actual. Prueba a cambiar los filtros o registra un fichaje manual."
        />
      ) : (
        <table className="w-full bg-white border rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Empleado</th>
              <th className="p-3 text-left">Día</th>
              <th className="p-3 text-left">Entrada</th>
              <th className="p-3 text-left">Salida</th>
              <th className="p-3 text-left">Movimientos</th>
              <th className="p-3 text-left">Estado</th>
              <th className="p-3 text-left">Motivo</th>
              <th className="p-3 text-left">Acción</th>
            </tr>
          </thead>
          <tbody>
            {jornadas.map((j) => (
              <tr key={j.jornada_id} className="border-b">
                <td className="p-3 font-semibold">{j.empleado}</td>
                <td className="p-3">{j.fechaDia}</td>

                <td className="p-3">
                  {j.entrada ? horaLocal(j.entrada) : "-"}
                </td>
                <td className="p-3">{j.salida ? horaLocal(j.salida) : "-"}</td>

                <td className="p-3 text-sm text-gray-700">
                  {j.movimientos
                    .map(
                      (m) => `${m.tipo.replace("_", " ")} ${horaLocal(m.fecha)}`
                    )
                    .join(" · ")}
                </td>

                <td className="p-3">
                  {j.estado === "Sospechoso" ? (
                    <span className="text-red-600 font-semibold">
                      Sospechoso
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">OK</span>
                  )}
                </td>

                <td className="p-3">{j.motivo || "-"}</td>

                <td className="p-3">
                  <button
                    className="px-3 py-1 bg-neutral-800 text-white rounded"
                    onClick={() => openDetalle(j)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL NUEVO FICHAJE MANUAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-[400px] space-y-3">
            <h2 className="text-xl font-bold mb-2">Nuevo fichaje manual</h2>

            <select
              className="border p-2 w-full"
              value={form.empleado_id}
              onChange={(e) =>
                setForm({ ...form, empleado_id: e.target.value })
              }
            >
              <option value="">Seleccionar empleado</option>
              {empleados.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>

            <select
              className="border p-2 w-full"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="completa">Jornada completa</option>
            </select>

            <input
              type="date"
              className="border p-2 w-full"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />

            {form.tipo !== "completa" && (
              <input
                type="time"
                className="border p-2 w-full"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            )}

            {form.tipo === "completa" && (
              <>
                <input
                  type="time"
                  className="border p-2 w-full"
                  placeholder="Hora de entrada"
                  value={form.horaEntrada}
                  onChange={(e) =>
                    setForm({ ...form, horaEntrada: e.target.value })
                  }
                />
                <input
                  type="time"
                  className="border p-2 w-full"
                  placeholder="Hora de salida"
                  value={form.horaSalida}
                  onChange={(e) =>
                    setForm({ ...form, horaSalida: e.target.value })
                  }
                />
              </>
            )}

            <textarea
              className="border p-2 w-full"
              placeholder="Motivo (opcional)"
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-3 py-2 bg-gray-300 rounded disabled:opacity-50"
                disabled={saving}
                onClick={() => {
                  setShowModal(false);
                  setForm({
                    empleado_id: "",
                    fecha: "",
                    tipo: "entrada",
                    hora: "",
                    horaEntrada: "",
                    horaSalida: "",
                    motivo: "",
                  });
                }}
              >
                Cancelar
              </button>

              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={registrarManual}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALLE JORNADA */}
      {detalleOpen && jornadaSel && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded p-6 w-[900px] max-w-[95vw] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Detalle jornada</h2>
                <div className="text-sm text-gray-600">
                  <b>{jornadaSel.empleado}</b> · {jornadaSel.fechaDia} ·{" "}
                  {jornadaSel.movimientos.length} movimientos
                </div>
              </div>
              <button
                className="px-3 py-2 bg-gray-200 rounded"
                onClick={closeDetalle}
              >
                Cerrar
              </button>
            </div>

            {/* filtros detalle */}
            <div className="bg-gray-50 border rounded p-3">
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-semibold">
                  Filtrar movimientos:
                </span>
                <button
                  onClick={() => setDetalleModoFecha("todos")}
                  className={`px-3 py-2 rounded ${
                    detalleModoFecha === "todos"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setDetalleModoFecha("hoy")}
                  className={`px-3 py-2 rounded ${
                    detalleModoFecha === "hoy"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDetalleModoFecha("fecha")}
                  className={`px-3 py-2 rounded ${
                    detalleModoFecha === "fecha"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Por fecha
                </button>

                {detalleModoFecha === "fecha" ? (
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={detalleFecha}
                    onChange={(e) => setDetalleFecha(e.target.value)}
                  />
                ) : null}
              </div>
            </div>

            <table className="w-full border rounded overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Hora</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Ubicación</th>
                  <th className="p-3 text-left">Nota</th>
                  <th className="p-3 text-left">Sospechoso</th>
                </tr>
              </thead>
              <tbody>
                {movimientosDetalle.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-3">{horaLocal(m.fecha)}</td>
                    <td className="p-3">{m.tipo}</td>
                    <td className="p-3">{m.ubicacion || "-"}</td>
                    <td className="p-3">{m.nota || "-"}</td>
                    <td className="p-3">
                      {m.sospechoso ? (
                        <span className="text-red-600 font-semibold">Sí</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                  </tr>
                ))}
                {movimientosDetalle.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={5}>
                      No hay movimientos con el filtro actual.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
