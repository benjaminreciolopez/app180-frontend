"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users } from "lucide-react";

type EmpleadoLite = { id: string; nombre: string; centro_trabajo_id?: string | null; centro_trabajo_nombre?: string | null };
type ClienteLite = { id: string; nombre: string; codigo?: string };
type CentroLite = { id: string; nombre: string; activo: boolean };

type AsignacionCliente = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
};

type TipoUbicacion = "cliente" | "centro";

export default function UbicacionAsignacionPanel() {
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [centros, setCentros] = useState<CentroLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Selección
  const [empleadoSel, setEmpleadoSel] = useState<string>("");
  const [tipo, setTipo] = useState<TipoUbicacion>("cliente");

  // Historial clientes
  const [hist, setHist] = useState<AsignacionCliente[]>([]);

  // Form cliente
  const [clienteSel, setClienteSel] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [fechaFin, setFechaFin] = useState<string>("");

  // Form centro
  const [centroSel, setCentroSel] = useState<string>("");

  // Loading states
  const [asignando, setAsignando] = useState(false);
  const [reseteando, setReseteando] = useState(false);

  // Info actual del empleado
  const [empleadoInfo, setEmpleadoInfo] = useState<{
    centro_trabajo_nombre?: string | null;
    cliente_actual_nombre?: string | null;
  } | null>(null);

  async function loadBase() {
    setLoading(true);
    try {
      const [e, c, ct] = await Promise.all([
        api.get("/employees"),
        api.get("/admin/clientes"),
        api.get("/admin/centros-trabajo"),
      ]);

      const empList = (e.data || []).map((x: any) => ({
        id: x.id,
        nombre: x.nombre,
        centro_trabajo_id: x.centro_trabajo_id,
        centro_trabajo_nombre: x.centro_trabajo_nombre,
      }));
      setEmpleados(empList);

      setClientes(
        (c.data || []).map((x: any) => ({
          id: x.id,
          nombre: x.nombre,
          codigo: x.codigo,
        })),
      );

      setCentros(
        (ct.data || []).filter((x: any) => x.activo).map((x: any) => ({
          id: x.id,
          nombre: x.nombre,
          activo: x.activo,
        })),
      );
    } catch (e) {
      console.error(e);
      showError("Error cargando datos base");
    } finally {
      setLoading(false);
    }
  }

  async function loadHist(empleado_id: string) {
    if (!empleado_id) {
      setHist([]);
      return;
    }
    try {
      const r = await api.get(`/admin/clientes/asignaciones/${empleado_id}`);
      setHist(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (empleadoSel) {
      loadHist(empleadoSel);
      // Buscar info del empleado
      const emp = empleados.find((e) => e.id === empleadoSel);
      if (emp) {
        setEmpleadoInfo({
          centro_trabajo_nombre: emp.centro_trabajo_nombre,
        });
        // Detectar tipo actual
        if (emp.centro_trabajo_id) {
          setTipo("centro");
          setCentroSel(emp.centro_trabajo_id);
        } else {
          setTipo("cliente");
        }
      }
    } else {
      setHist([]);
      setEmpleadoInfo(null);
    }
  }, [empleadoSel, empleados]);

  /* ---- Asignar Cliente ---- */
  async function asignarCliente() {
    if (!empleadoSel || !clienteSel || !fechaInicio) {
      showError("Empleado, cliente y fecha inicio son obligatorios");
      return;
    }
    try {
      setAsignando(true);
      await api.post("/admin/clientes/asignar", {
        empleado_id: empleadoSel,
        cliente_id: clienteSel,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
      });

      await loadHist(empleadoSel);
      await loadBase();
      showSuccess("Cliente asignado correctamente");
    } catch (e: any) {
      console.error(e);
      showError(e.response?.data?.error || "Error al asignar cliente");
    } finally {
      setAsignando(false);
    }
  }

  async function quitarCliente() {
    if (!empleadoSel) {
      showError("Selecciona un empleado primero");
      return;
    }
    const ok = confirm("¿Seguro que quieres quitar el cliente actual de este empleado?");
    if (!ok) return;

    try {
      setReseteando(true);
      await api.post("/admin/clientes/desasignar", {
        empleado_id: empleadoSel,
      });
      await loadHist(empleadoSel);
      await loadBase();
      showSuccess("Cliente eliminado correctamente");
    } catch (e: any) {
      console.error(e);
      showError(e.response?.data?.error || "Error al eliminar cliente");
    } finally {
      setReseteando(false);
    }
  }

  /* ---- Asignar Centro ---- */
  async function asignarCentro() {
    if (!empleadoSel || !centroSel) {
      showError("Empleado y centro de trabajo son obligatorios");
      return;
    }
    try {
      setAsignando(true);
      await api.post("/admin/centros-trabajo/asignar", {
        empleado_id: empleadoSel,
        centro_trabajo_id: centroSel,
      });
      await loadBase();
      showSuccess("Centro de trabajo asignado");
    } catch (e: any) {
      console.error(e);
      showError(e.response?.data?.error || "Error al asignar centro");
    } finally {
      setAsignando(false);
    }
  }

  async function quitarCentro() {
    if (!empleadoSel) {
      showError("Selecciona un empleado primero");
      return;
    }
    const ok = confirm("¿Seguro que quieres quitar el centro de trabajo de este empleado?");
    if (!ok) return;

    try {
      setReseteando(true);
      await api.post("/admin/centros-trabajo/desasignar", {
        empleado_id: empleadoSel,
      });
      await loadBase();
      showSuccess("Centro de trabajo eliminado");
    } catch (e: any) {
      console.error(e);
      showError(e.response?.data?.error || "Error al desasignar centro");
    } finally {
      setReseteando(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Encontrar la asignación activa de cliente
  const clienteActivo = hist.find((h) => h.activo);
  const centroActualNombre = empleados.find((e) => e.id === empleadoSel)?.centro_trabajo_nombre;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded p-4 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold border-b pb-2">Asignar Ubicación a Empleado</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Columna Izquierda: Formulario */}
          <div className="space-y-3">
            {/* Empleado */}
            <div>
              <label className="block text-sm font-semibold mb-1">Empleado</label>
              <select
                className="border p-2 rounded w-full bg-gray-50"
                value={empleadoSel}
                onChange={(e) => setEmpleadoSel(e.target.value)}
              >
                <option value="">-- Selecciona empleado --</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Ubicación actual */}
            {empleadoSel && (
              <div className="bg-gray-50 border rounded p-2.5 text-sm">
                <span className="font-medium text-gray-600">Ubicación actual: </span>
                {centroActualNombre ? (
                  <span className="inline-flex items-center gap-1 text-blue-700">
                    <Building2 size={13} /> {centroActualNombre}
                  </span>
                ) : clienteActivo ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Users size={13} /> {clienteActivo.cliente_nombre}
                  </span>
                ) : (
                  <span className="text-gray-400">Sin asignar</span>
                )}
              </div>
            )}

            {/* Toggle tipo */}
            {empleadoSel && (
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo de ubicación</label>
                <div className="flex rounded overflow-hidden border">
                  <button
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      tipo === "cliente"
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setTipo("cliente")}
                  >
                    <Users size={14} className="inline mr-1.5 -mt-0.5" />
                    Cliente
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      tipo === "centro"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setTipo("centro")}
                  >
                    <Building2 size={14} className="inline mr-1.5 -mt-0.5" />
                    Centro de Trabajo
                  </button>
                </div>
              </div>
            )}

            {/* Form: Cliente */}
            {empleadoSel && tipo === "cliente" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">Cliente</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={clienteSel}
                    onChange={(e) => setClienteSel(e.target.value)}
                  >
                    <option value="">-- Selecciona cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo ? `${c.codigo} · ` : ""}
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Fecha Inicio</label>
                    <input
                      className="border p-2 rounded w-full"
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Fin (Opcional)</label>
                    <input
                      className="border p-2 rounded w-full"
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={asignarCliente}
                    disabled={asignando || reseteando}
                  >
                    {asignando ? "Asignando..." : "Asignar Cliente"}
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={quitarCliente}
                    disabled={!empleadoSel || !clienteActivo || asignando || reseteando}
                  >
                    {reseteando ? "Eliminando..." : "Quitar Cliente"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Asignar un cliente cierra la asignación anterior automáticamente.
                </p>
              </>
            )}

            {/* Form: Centro */}
            {empleadoSel && tipo === "centro" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">Centro de Trabajo</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={centroSel}
                    onChange={(e) => setCentroSel(e.target.value)}
                  >
                    <option value="">-- Selecciona centro --</option>
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={asignarCentro}
                    disabled={asignando || reseteando}
                  >
                    {asignando ? "Asignando..." : "Asignar Centro"}
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={quitarCentro}
                    disabled={!empleadoSel || !centroActualNombre || asignando || reseteando}
                  >
                    {reseteando ? "Eliminando..." : "Quitar Centro"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Asignar un centro de trabajo quita la asignación de cliente automáticamente.
                </p>
              </>
            )}
          </div>

          {/* Columna Derecha: Historial */}
          <div className="bg-gray-50 rounded p-3 border">
            <h3 className="font-bold text-sm mb-2 text-gray-700">Historial de Ubicaciones</h3>
            {!empleadoSel ? (
              <div className="text-gray-500 text-sm italic">Selecciona un empleado</div>
            ) : (
              <div className="space-y-3">
                {/* Centro actual */}
                {centroActualNombre && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                    <span className="font-medium text-blue-700 flex items-center gap-1.5">
                      <Building2 size={14} /> Centro: {centroActualNombre}
                    </span>
                    <span className="text-blue-600 text-xs block mt-0.5">Asignación activa</span>
                  </div>
                )}

                {/* Historial de clientes */}
                {hist.length === 0 && !centroActualNombre ? (
                  <div className="text-gray-500 text-sm">Sin historial de ubicaciones.</div>
                ) : hist.length > 0 ? (
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-600 sticky top-0 bg-gray-50">
                        <tr>
                          <th className="pb-2">Cliente</th>
                          <th className="pb-2">Inicio</th>
                          <th className="pb-2">Fin</th>
                          <th className="pb-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {hist.map((h) => (
                          <tr key={h.id}>
                            <td className="py-2 pr-2 font-medium">{h.cliente_nombre}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{h.fecha_inicio}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{h.fecha_fin || "-"}</td>
                            <td className="py-2">
                              {h.activo ? (
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                  Activo
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs">Inactivo</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
