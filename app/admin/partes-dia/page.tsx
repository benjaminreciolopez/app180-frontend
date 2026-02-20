"use client";

import { useEffect, useCallback, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getUser } from "@/services/auth";
import { Search, Filter, ArrowUpDown, Calendar, CheckSquare, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";

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
  nota_admin?: string | null;
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

  // Multiselección
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Format: "empleado_id|fecha"
  const [bulkMode, setBulkMode] = useState<"validate" | "incident" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedIds([]); // Limpiar selección al recargar
    try {
      const params: any = { sortBy, sortOrder };
      if (fecha) params.fecha = fecha;
      if (clienteId) params.cliente_id = clienteId;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await api.get("/api/admin/partes-dia", { params });
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

  const toggleSelect = (it: ParteItem) => {
    const id = `${it.empleado_id}|${it.fecha}`;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(it => `${it.empleado_id}|${it.fecha}`));
    }
  };

  async function bulkAction(validado: boolean) {
    if (selectedIds.length === 0) return;

    if (!validado && nota.trim().length === 0) {
      showError("La nota es obligatoria para marcar incidencias masivas");
      return;
    }

    try {
      setSaving(true);
      const seleccionados = selectedIds.map(id => {
        const [empleado_id, fecha] = id.split("|");
        return { empleado_id, fecha };
      });

      await api.patch("/api/admin/partes-dia/validar-masivo", {
        seleccionados,
        validado,
        nota_admin: nota || null,
      });

      showSuccess(`Se han procesado ${seleccionados.length} partes`);
      setBulkMode(null);
      setNota("");
      setSelectedIds([]);
      load();
    } catch (e) {
      console.error(e);
      showError("Error en la acción masiva");
    } finally {
      setSaving(false);
    }
  }

  async function validarParte(validado: boolean) {
    if (!selected) return;

    if (!validado && nota.trim().length === 0) {
      showError("La nota es obligatoria para marcar incidencia");
      return;
    }

    try {
      setSaving(true);

      await api.patch("/api/admin/partes-dia/validar", {
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-slate-500 text-sm">Auditoría de tiempos y rentabilidad por jornada</p>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                {selectedIds.length} seleccionados
              </span>
              <button
                onClick={() => setBulkMode("validate")}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                title="Validar seleccionados"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Validar todo
              </button>
              <button
                onClick={() => setBulkMode("incident")}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                title="Marcar incidencia en seleccionados"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Incidencia
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Cancelar
              </button>
            </div>
          )}
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

      {error && <div className="p-2 text-red-600 font-semibold">{error}</div>}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-10"><Skeleton className="h-4 w-4" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-20" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-14" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-28" /></th>
                <th className="p-4 text-left"><Skeleton className="h-4 w-20" /></th>
                <th className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-4"><Skeleton className="h-4 w-4" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-4 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={toggleSelectAll}
                  />
                </th>
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
                <th className="p-4 text-left font-semibold text-slate-700">Revision</th>
                <th className="p-4 text-left font-semibold text-slate-700 max-w-xs">Resumen / Tareas</th>
                <th className="p-4 text-left font-semibold text-slate-700">Notas Admin</th>
                <th className="p-4 text-right font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState icon={ClipboardList} title="Sin registros" description="No se han encontrado registros con los filtros actuales." />
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={`${it.empleado_id}-${it.fecha}`}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${selectedIds.includes(`${it.empleado_id}|${it.fecha}`) ? 'bg-blue-50/40' : ''
                      }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(`${it.empleado_id}|${it.fecha}`)}
                        onChange={() => toggleSelect(it)}
                      />
                    </td>
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
                    <td className="p-4 max-w-xs truncate text-slate-600 text-xs font-medium italic" title={it.nota_admin || ""}>
                      {it.nota_admin || "—"}
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
      {bulkMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${bulkMode === 'validate' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {bulkMode === 'validate' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {bulkMode === 'validate' ? 'Validación Masiva' : 'Reportar Incidencias'}
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              Vas a procesar <strong>{selectedIds.length}</strong> partes seleccionados.
              {bulkMode === 'validate' ? ' ¿Estás seguro de que quieres validarlos todos?' : ' Por favor, indica el motivo de la incidencia para estos registros.'}
            </p>

            <textarea
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={4}
              placeholder="Nota común para toda la selección (opcional para validación, obligatoria para incidencias)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                onClick={() => {
                  setBulkMode(null);
                  setNota("");
                }}
              >
                Cancelar
              </button>

              <button
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2 text-white font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 ${bulkMode === 'validate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                onClick={() => bulkAction(bulkMode === 'validate')}
              >
                {saving ? <LoadingSpinner size="sm" showText={false} /> : (bulkMode === 'validate' ? 'Validar Todo' : 'Confirmar Incidencias')}
              </button>
            </div>
          </div>
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
                className="btn-danger px-4 py-2 flex items-center justify-center min-w-[100px]"
                onClick={() => validarParte(false)}
              >
                {saving ? <LoadingSpinner size="sm" showText={false} /> : "Incidencia"}
              </button>

              <button
                disabled={saving}
                className="btn-primary px-4 py-2 flex items-center justify-center min-w-[100px]"
                onClick={() => validarParte(true)}
              >
                {saving ? <LoadingSpinner size="sm" showText={false} /> : "Validar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
