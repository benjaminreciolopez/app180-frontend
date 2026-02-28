"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { showSuccess, showError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import {
  Tablet,
  Plus,
  Trash2,
  Users,
  Power,
  PowerOff,
  MapPin,
  Clock,
  Key,
  X,
  Check,
} from "lucide-react";

interface KioskDevice {
  id: string;
  nombre: string;
  activo: boolean;
  ultimo_uso: string | null;
  created_at: string;
  centro_trabajo_id: string | null;
  centro_nombre: string | null;
  offline_pin: string | null;
}

interface CentroTrabajo {
  id: string;
  nombre: string;
}

interface Empleado {
  id: string;
  nombre: string;
  codigo_empleado: string | null;
  foto_url: string | null;
  activo: boolean;
}

export default function KioscosAdminPage() {
  const confirm = useConfirm();
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);

  // Register modal
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCentro, setRegCentro] = useState("");
  const [regPin, setRegPin] = useState("");
  const [registering, setRegistering] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  // Assign employees modal
  const [assignDevice, setAssignDevice] = useState<KioskDevice | null>(null);
  const [allEmployees, setAllEmployees] = useState<Empleado[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [savingAssign, setSavingAssign] = useState(false);

  // Employee counts per device
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDevices();
    loadCentros();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/kiosk/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        // Load employee counts for each device
        const counts: Record<string, number> = {};
        for (const d of data) {
          try {
            const r = await authenticatedFetch(`/api/kiosk/devices/${d.id}/employees`);
            if (r.ok) {
              const emps = await r.json();
              counts[d.id] = emps.length;
            }
          } catch { /* ignore */ }
        }
        setEmpCounts(counts);
      }
    } catch {
      showError("Error al cargar dispositivos");
    }
    setLoading(false);
  };

  const loadCentros = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/centros-trabajo");
      if (res.ok) {
        const data = await res.json();
        setCentros(data.centros || data || []);
      }
    } catch { /* ignore */ }
  };

  const handleRegister = async () => {
    if (!regName.trim()) return;
    setRegistering(true);
    try {
      const res = await authenticatedFetch("/api/kiosk/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: regName.trim(),
          centro_trabajo_id: regCentro || null,
          offline_pin: regPin || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewToken(data.device_token);
        showSuccess("Dispositivo registrado");
        loadDevices();
      } else {
        const data = await res.json();
        showError(data.error || "Error al registrar");
      }
    } catch {
      showError("Error de conexión");
    }
    setRegistering(false);
  };

  const handleToggleActive = async (device: KioskDevice) => {
    const label = device.activo ? "desactivar" : "activar";
    const ok = await confirm({
      description: `¿${device.activo ? "Desactivar" : "Activar"} el kiosco "${device.nombre}"?`,
      confirmLabel: device.activo ? "Desactivar" : "Activar",
      variant: device.activo ? "destructive" : "default",
    });
    if (!ok) return;

    try {
      const res = await authenticatedFetch(`/api/kiosk/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !device.activo }),
      });
      if (res.ok) {
        showSuccess(`Kiosco ${label === "activar" ? "activado" : "desactivado"}`);
        loadDevices();
      }
    } catch {
      showError("Error al actualizar");
    }
  };

  const handleDelete = async (device: KioskDevice) => {
    const ok = await confirm({
      title: "Eliminar kiosco",
      description: `¿Eliminar "${device.nombre}"? Se eliminarán todas las asignaciones de empleados.`,
      confirmLabel: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      const res = await authenticatedFetch(`/api/kiosk/devices/${device.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccess("Kiosco eliminado");
        loadDevices();
      }
    } catch {
      showError("Error al eliminar");
    }
  };

  const openAssignModal = async (device: KioskDevice) => {
    setAssignDevice(device);
    // Load all employees
    try {
      const res = await authenticatedFetch("/api/admin/empleados");
      if (res.ok) {
        const data = await res.json();
        setAllEmployees(data);
      }
    } catch { /* ignore */ }
    // Load current assignments
    try {
      const res = await authenticatedFetch(`/api/kiosk/devices/${device.id}/employees`);
      if (res.ok) {
        const assigned = await res.json();
        setAssignedIds(new Set(assigned.map((e: Empleado) => e.id)));
      }
    } catch { /* ignore */ }
  };

  const handleSaveAssignments = async () => {
    if (!assignDevice) return;
    setSavingAssign(true);
    try {
      const res = await authenticatedFetch(`/api/kiosk/devices/${assignDevice.id}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empleado_ids: Array.from(assignedIds) }),
      });
      if (res.ok) {
        showSuccess("Empleados asignados");
        setAssignDevice(null);
        loadDevices();
      }
    } catch {
      showError("Error al asignar");
    }
    setSavingAssign(false);
  };

  const toggleAssign = (id: string) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Nunca";
    return new Date(d).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Tablet className="h-6 w-6 text-blue-500" />
            Kioscos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de puntos de fichaje
          </p>
        </div>
        <button
          onClick={() => { setShowRegister(true); setNewToken(null); setRegName(""); setRegCentro(""); setRegPin(""); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo kiosco
        </button>
      </div>

      {/* Empty */}
      {devices.length === 0 && (
        <EmptyState
          icon={Tablet}
          title="Sin kioscos"
          description="Registra un dispositivo para empezar a fichar con kiosco"
        />
      )}

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div key={d.id} className={`border rounded-xl p-5 space-y-3 transition-colors ${d.activo ? "border-border bg-card" : "border-red-500/20 bg-red-500/5 opacity-70"}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{d.nombre}</h3>
                {d.centro_nombre && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {d.centro_nombre}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.activo ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                {d.activo ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Último uso: {formatDate(d.ultimo_uso)}
              </p>
              <p className="flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                {empCounts[d.id] !== undefined ? `${empCounts[d.id]} empleados asignados` : "Cargando..."}
                {empCounts[d.id] === 0 && <span className="text-amber-500">(todos pueden fichar)</span>}
              </p>
              {d.offline_pin && (
                <p className="flex items-center gap-1.5">
                  <Key className="h-3 w-3" />
                  PIN offline configurado
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                onClick={() => openAssignModal(d)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Empleados
              </button>
              <button
                onClick={() => handleToggleActive(d)}
                className={`p-1.5 rounded-lg transition-colors ${d.activo ? "hover:bg-amber-500/10 text-amber-500" : "hover:bg-emerald-500/10 text-emerald-500"}`}
                title={d.activo ? "Desactivar" : "Activar"}
              >
                {d.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDelete(d)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !newToken && setShowRegister(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            {!newToken ? (
              <>
                <h2 className="text-lg font-semibold">Registrar nuevo kiosco</h2>
                <div>
                  <label className="text-sm font-medium">Nombre del dispositivo *</label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Tablet Recepción"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Centro de trabajo</label>
                  <select
                    value={regCentro}
                    onChange={(e) => setRegCentro(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">Sin asignar</option>
                    {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">PIN offline (opcional)</label>
                  <input
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="4-6 dígitos"
                    maxLength={6}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowRegister(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegister}
                    disabled={!regName.trim() || registering}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                  >
                    {registering ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-emerald-500">Kiosco registrado</h2>
                <p className="text-sm text-muted-foreground">
                  Guarda este token. Lo necesitarás para configurar el dispositivo en <code>/kiosko/setup</code>.
                </p>
                <div className="bg-muted p-3 rounded-lg break-all text-xs font-mono select-all">
                  {newToken}
                </div>
                <button
                  onClick={() => { setShowRegister(false); setNewToken(null); }}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {assignDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAssignDevice(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Asignar empleados</h2>
                <p className="text-xs text-muted-foreground">{assignDevice.nombre} — {assignedIds.size} seleccionados</p>
              </div>
              <button onClick={() => setAssignDevice(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-amber-500 mb-3">
              Si no asignas ningún empleado, todos los empleados de la empresa podrán fichar en este kiosco.
            </p>

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {allEmployees.filter((e) => e.activo).map((emp) => (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    assignedIds.has(emp.id) ? "bg-blue-600/10 border border-blue-500/30" : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={assignedIds.has(emp.id)}
                    onChange={() => toggleAssign(emp.id)}
                    className="rounded"
                  />
                  {emp.foto_url ? (
                    <img src={emp.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {emp.nombre.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{emp.nombre}</p>
                    {emp.codigo_empleado && (
                      <p className="text-xs text-muted-foreground">{emp.codigo_empleado}</p>
                    )}
                  </div>
                  {assignedIds.has(emp.id) && (
                    <Check className="h-4 w-4 text-blue-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
              <button
                onClick={() => { setAssignedIds(new Set()); }}
                className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              >
                Limpiar todo
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssign}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                {savingAssign ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
