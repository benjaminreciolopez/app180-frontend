"use client";

import { useEffect, useCallback, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getUser } from "@/services/auth";
import { Search, Filter, ArrowUpDown, Calendar } from "lucide-react";

type ParteItem = {
  empleado_id: string;
  empleado_nombre: string;
  fecha: string;
  estado: string;
  resumen: string;
  horas_trabajadas: number | null;
  cliente_nombre: string | null;
  validado?: boolean;
  validado_at?: string | null;
};
function estadoLabel(estado: string) {
  switch (estado) {
    case "completo":
      return "Completado";
    case "abierto":
      return "En curso";
    case "incidencia":
      return "Incidencia";
    case "incompleto":
      return "Incompleto";
    case "ausente":
      return "Ausencia";
    case "solo_trabajo":
      return "Trabajo sin fichaje";
    default:
      return estado;
  }
}
function revisionLabel(it: ParteItem) {
  if (it.validado === true) return "Validado";
  if (it.validado === false) return "Incidencia";
  return "Pendiente";
}

function revisionClass(it: ParteItem) {
  if (it.validado === true) return "text-green-700";
  if (it.validado === false) return "text-red-700";
  return "text-gray-600";
}

export default function AdminPartesDiaPage() {
  const [fecha, setFecha] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("fecha");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ParteItem | null>(null);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<ParteItem[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasEmployeesModule, setHasEmployeesModule] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { sortBy, sortOrder };
      if (fecha) params.fecha = fecha;
      if (clienteId) params.cliente_id = clienteId;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await api.get("/admin/partes-dia", { params });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error(e);
      setError("No se han podido cargar los datos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fecha, clienteId, fechaInicio, fechaFin, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      const [user, clientsRes] = await Promise.all([
        getUser(),
        api.get("/admin/clientes")
      ]);

      const modulos = user?.modulos || {};
      setHasEmployeesModule(modulos.empleados !== false);
      setClientes(clientsRes.data || []);

      // Carga inicial de partes
      load();
    } catch (e) {
      console.error("Error inicializando:", e);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function validarParte(validado: boolean) {
    if (!selected) return;

    if (!validado && nota.trim().length === 0) {
      showError("La nota es obligatoria para marcar incidencia");
      return;
    }

    try {
      setSaving(true);

      await api.patch("/admin/partes-dia/validar", {
        empleado_id: selected.empleado_id,
        fecha: selected.fecha,
        validado,
        nota_admin: nota || null,
      });

      setOpen(false);
      setNota("");
      setSelected(null);
      load();
    } catch (e) {
      console.error(e);
      showError("Error validando el parte");
    } finally {
      setSaving(false);
    }
  }

  const title = hasEmployeesModule ? "Partes del día" : "Rentabilidad y Tiempos";

  return (
    <div className="app-main space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm">Auditoría de tiempos y rentabilidad por jornada</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <UniversalExportButton
            module="partes-dia"
            queryParams={{ fecha, cliente_id: clienteId, fecha_inicio: fechaInicio, fecha_fin: fechaFin }}
            label="Exportar Informe"
          />
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none w-full"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-auto">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="date"
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none w-full"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={() => {
            setFecha("");
            setFechaInicio("");
            setFechaFin("");
            setClienteId("");
          }}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {loading && <LoadingSpinner fullPage />}
      {error && <div className="p-2 text-red-600 font-semibold">{error}</div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th
                  className="p-4 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort("fecha")}
                >
                  <div className="flex items-center gap-2">
                    Fecha <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="p-4 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort("empleado_nombre")}
                >
                  <div className="flex items-center gap-2">
                    Persona <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="p-4 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort("cliente_nombre")}
                >
                  <div className="flex items-center gap-2">
                    Cliente <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="p-4 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort("horas_trabajadas")}
                >
                  <div className="flex items-center gap-2">
                    Horas <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 text-left font-semibold text-slate-700">Estado</th>
                <th className="p-4 text-left font-semibold text-slate-700">Revisión</th>
                <th className="p-4 text-left font-semibold text-slate-700 max-w-xs">Resumen / Tareas</th>
                <th className="p-4 text-right font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-slate-400" colSpan={8}>
                    No se han encontrado registros con los filtros actuales
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={`${it.empleado_id}-${it.fecha}`}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 whitespace-nowrap text-slate-600">
                      {new Date(it.fecha).toLocaleDateString("es-ES")}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{it.empleado_nombre}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                        {it.cliente_nombre || "Sin asignar"}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium text-blue-600">
                      {it.horas_trabajadas != null
                        ? `${it.horas_trabajadas} h`
                        : "—"}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-slate-600">
                        {estadoLabel(it.estado)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold uppercase ${revisionClass(it)}`}>
                        {revisionLabel(it)}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-500 text-xs" title={it.resumen}>
                      {it.resumen}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        disabled={it.validado === true}
                        className={`text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors ${it.validado === true ? "opacity-30 cursor-not-allowed" : ""
                          }`}
                        onClick={() => {
                          setSelected(it);
                          setOpen(true);
                        }}
                      >
                        {it.validado === true ? "Auditado" : "Revisar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {open && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">
              Parte de {selected.empleado_nombre}
            </h2>

            <p className="text-sm text-gray-600">{selected.resumen}</p>

            <textarea
              className="w-full border rounded p-2"
              rows={4}
              placeholder="Nota administrativa (obligatoria si hay incidencia)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => {
                  setOpen(false);
                  setNota("");
                  setSelected(null);
                }}
              >
                Cancelar
              </button>

              <button
                disabled={saving}
                className="btn-danger px-4 py-2"
                onClick={() => validarParte(false)}
              >
                Incidencia
              </button>

              <button
                disabled={saving}
                className="btn-primary px-4 py-2"
                onClick={() => validarParte(true)}
              >
                Validar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
