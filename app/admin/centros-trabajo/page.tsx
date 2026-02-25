"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  X,
  Building2,
  MapPin,
  Users,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { showSuccess, showError } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";

const GeoPicker = dynamic(() => import("@/components/GeoPicker"), {
  ssr: false,
});

/* =====================================================
   Types
===================================================== */

interface Centro {
  id: string;
  nombre: string;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  radio_m: number | null;
  geo_policy: string;
  activo: boolean;
  notas: string | null;
  num_empleados: number;
  created_at: string;
}

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

interface EmpleadoDisponible {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  centro_trabajo_nombre: string | null;
  cliente_actual_nombre: string | null;
}

const GEO_POLICIES = [
  { value: "none", label: "Sin validar", desc: "No se valida ubicación" },
  { value: "info", label: "Informativo", desc: "Registra pero no alerta" },
  { value: "soft", label: "Suave", desc: "Avisa si está fuera del radio" },
  { value: "strict", label: "Estricto", desc: "Marca como sospechoso" },
];

/* =====================================================
   Component
===================================================== */

export default function CentrosTrabajoPage() {
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [editing, setEditing] = useState<Partial<Centro> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);

  // Employee assignment
  const [showEmpleados, setShowEmpleados] = useState<string | null>(null);
  const [empleadosCentro, setEmpleadosCentro] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [showAsignar, setShowAsignar] = useState(false);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<EmpleadoDisponible[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const loadCentros = useCallback(async () => {
    try {
      const res = await api.get("/admin/centros-trabajo");
      setCentros(res.data || []);
    } catch (err) {
      console.error("Error cargando centros", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCentros();
  }, [loadCentros]);

  /* ---- CRUD ---- */

  function openNew() {
    setEditing({
      nombre: "",
      direccion: "",
      lat: null,
      lng: null,
      radio_m: 100,
      geo_policy: "info",
      notas: "",
    });
    setIsNew(true);
  }

  function openEdit(c: Centro) {
    setEditing({ ...c });
    setIsNew(false);
  }

  async function save() {
    if (!editing?.nombre?.trim()) {
      showError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.post("/admin/centros-trabajo", editing);
        showSuccess("Centro creado");
      } else {
        await api.put(`/admin/centros-trabajo/${editing.id}`, editing);
        showSuccess("Centro actualizado");
      }
      setEditing(null);
      loadCentros();
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error al guardar");
    }
    setSaving(false);
  }

  async function toggleActivo(c: Centro) {
    if (processingAction) return;
    setProcessingAction(`toggle-${c.id}`);
    try {
      if (c.activo) {
        await api.delete(`/admin/centros-trabajo/${c.id}`);
        showSuccess("Centro desactivado");
      } else {
        await api.put(`/admin/centros-trabajo/${c.id}`, { activo: true });
        showSuccess("Centro activado");
      }
      loadCentros();
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error");
    } finally {
      setProcessingAction(null);
    }
  }

  /* ---- Employee management ---- */

  async function loadEmpleadosCentro(centroId: string) {
    setLoadingEmpleados(true);
    try {
      const res = await api.get(`/admin/centros-trabajo/${centroId}/empleados`);
      setEmpleadosCentro(res.data || []);
    } catch (err) {
      console.error("Error cargando empleados", err);
    }
    setLoadingEmpleados(false);
  }

  async function loadEmpleadosDisponibles() {
    setLoadingDisponibles(true);
    try {
      const res = await api.get("/employees");
      setEmpleadosDisponibles(
        (res.data || []).filter((e: EmpleadoDisponible) => e.activo)
      );
    } catch (err) {
      console.error("Error cargando empleados disponibles", err);
    }
    setLoadingDisponibles(false);
  }

  async function asignarEmpleado(empleadoId: string, centroId: string) {
    if (processingAction) return;
    setProcessingAction(`asignar-${empleadoId}`);
    try {
      await api.post("/admin/centros-trabajo/asignar", {
        empleado_id: empleadoId,
        centro_trabajo_id: centroId,
      });
      showSuccess("Empleado asignado");
      loadEmpleadosCentro(centroId);
      loadCentros();
      setShowAsignar(false);
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error al asignar");
    } finally {
      setProcessingAction(null);
    }
  }

  async function desasignarEmpleado(empleadoId: string, centroId: string) {
    if (processingAction) return;
    setProcessingAction(`desasignar-${empleadoId}`);
    try {
      await api.post("/admin/centros-trabajo/desasignar", {
        empleado_id: empleadoId,
      });
      showSuccess("Empleado desasignado");
      loadEmpleadosCentro(centroId);
      loadCentros();
    } catch (err: any) {
      showError(err?.response?.data?.error || "Error al desasignar");
    } finally {
      setProcessingAction(null);
    }
  }

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 size={24} />
            Centros de Trabajo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura las sedes y oficinas de tu empresa con geolocalización para validar fichajes
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> Nuevo Centro
        </Button>
      </div>

      {/* List */}
      {centros.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin centros de trabajo"
          description="Crea tu primer centro de trabajo para validar fichajes por ubicación."
          actionLabel="+ Nuevo Centro"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {centros.map((c) => (
            <Card
              key={c.id}
              className={`relative transition-all ${!c.activo ? "opacity-50" : ""}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Name & Status */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{c.nombre}</h3>
                    {c.direccion && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.direccion}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                </div>

                {/* Geo Info */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {c.lat && c.lng ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      <MapPin size={10} />
                      {c.radio_m}m
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <MapPin size={10} />
                      Sin ubicación
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {GEO_POLICIES.find((p) => p.value === c.geo_policy)?.label || c.geo_policy}
                  </span>
                  {!c.activo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Employees */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      if (showEmpleados === c.id) {
                        setShowEmpleados(null);
                      } else {
                        setShowEmpleados(c.id);
                        loadEmpleadosCentro(c.id);
                      }
                    }}
                  >
                    <Users size={14} />
                    {c.num_empleados} empleado{c.num_empleados !== 1 ? "s" : ""}
                  </button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                    onClick={() => toggleActivo(c)}
                    disabled={!!processingAction}
                  >
                    {processingAction === `toggle-${c.id}` ? "Procesando..." : c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>

                {/* Employees panel */}
                <AnimatePresence>
                  {showEmpleados === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 border-t space-y-2">
                        {loadingEmpleados ? (
                          <Skeleton className="h-8 w-full" />
                        ) : empleadosCentro.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Sin empleados asignados
                          </p>
                        ) : (
                          empleadosCentro.map((emp) => (
                            <div
                              key={emp.id}
                              className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-2 py-1.5"
                            >
                              <div>
                                <span className="font-medium">{emp.nombre}</span>
                                <span className="text-muted-foreground ml-2">{emp.email}</span>
                              </div>
                              <button
                                className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50 disabled:pointer-events-none"
                                onClick={() => desasignarEmpleado(emp.id, c.id)}
                                title="Desasignar"
                                disabled={!!processingAction}
                              >
                                {processingAction === `desasignar-${emp.id}` ? (
                                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full" />
                                ) : (
                                  <UserMinus size={14} />
                                )}
                              </button>
                            </div>
                          ))
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1 text-xs h-7"
                          onClick={() => {
                            setShowAsignar(true);
                            loadEmpleadosDisponibles();
                          }}
                        >
                          <UserPlus size={12} /> Asignar empleado
                        </Button>

                        {/* Assign modal inline */}
                        <AnimatePresence>
                          {showAsignar && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-muted/50 rounded-md p-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">Seleccionar empleado</span>
                                  <button onClick={() => setShowAsignar(false)}>
                                    <X size={12} />
                                  </button>
                                </div>
                                {loadingDisponibles ? (
                                  <Skeleton className="h-6 w-full" />
                                ) : (
                                  <div className="max-h-40 overflow-y-auto space-y-1">
                                    {empleadosDisponibles
                                      .filter(
                                        (ed) =>
                                          !empleadosCentro.some((ec) => ec.id === ed.id)
                                      )
                                      .map((ed) => (
                                        <button
                                          key={ed.id}
                                          className="w-full text-left flex items-center justify-between px-2 py-1 rounded hover:bg-muted text-xs disabled:opacity-50 disabled:pointer-events-none"
                                          onClick={() => asignarEmpleado(ed.id, c.id)}
                                          disabled={!!processingAction}
                                        >
                                          <div>
                                            <span className="font-medium">{ed.nombre}</span>
                                            {ed.centro_trabajo_nombre && (
                                              <span className="text-muted-foreground ml-1">
                                                ({ed.centro_trabajo_nombre})
                                              </span>
                                            )}
                                            {ed.cliente_actual_nombre && (
                                              <span className="text-muted-foreground ml-1">
                                                ({ed.cliente_actual_nombre})
                                              </span>
                                            )}
                                          </div>
                                          {processingAction === `asignar-${ed.id}` ? (
                                            <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                                          ) : (
                                            <UserPlus size={12} className="text-blue-500" />
                                          )}
                                        </button>
                                      ))}
                                    {empleadosDisponibles.filter(
                                      (ed) =>
                                        !empleadosCentro.some((ec) => ec.id === ed.id)
                                    ).length === 0 && (
                                      <p className="text-xs text-muted-foreground text-center py-2">
                                        Todos los empleados ya están asignados
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
          >
            <motion.div
              className="bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {isNew ? "Nuevo Centro de Trabajo" : "Editar Centro"}
                </h2>
                <button onClick={() => setEditing(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    value={editing.nombre || ""}
                    onChange={(e) =>
                      setEditing((p) => (p ? { ...p, nombre: e.target.value } : null))
                    }
                    placeholder="Oficina Central, Almacén Norte..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Dirección</label>
                  <Input
                    value={editing.direccion || ""}
                    onChange={(e) =>
                      setEditing((p) => (p ? { ...p, direccion: e.target.value } : null))
                    }
                    placeholder="Calle, número, ciudad..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Política de geolocalización</label>
                  <Select
                    value={editing.geo_policy || "info"}
                    onValueChange={(v) =>
                      setEditing((p) => (p ? { ...p, geo_policy: v } : null))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GEO_POLICIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div>
                            <span className="font-medium">{p.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{p.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Geolocation */}
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin size={14} /> Ubicación
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setGeoOpen(true)}
                    >
                      <MapPin size={12} />
                      {editing.lat ? "Cambiar" : "Seleccionar en mapa"}
                    </Button>
                  </div>
                  {editing.lat && editing.lng ? (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Lat: {Number(editing.lat).toFixed(6)}, Lng:{" "}
                        {Number(editing.lng).toFixed(6)}
                      </div>
                      <div>Radio: {editing.radio_m || 100}m</div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sin ubicación configurada. Los fichajes no se validarán geográficamente.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Notas</label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background"
                    value={editing.notas || ""}
                    onChange={(e) =>
                      setEditing((p) => (p ? { ...p, notas: e.target.value } : null))
                    }
                    placeholder="Notas internas..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={saving || !!processingAction}>
                  {saving ? "Guardando..." : isNew ? "Crear" : "Guardar"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GeoPicker */}
      {geoOpen && editing && (
        <GeoPicker
          lat={editing.lat || null}
          lng={editing.lng || null}
          radio={editing.radio_m || null}
          onChange={(v: { lat: number; lng: number; radio: number }) =>
            setEditing((prev) =>
              prev
                ? {
                    ...prev,
                    lat: v.lat,
                    lng: v.lng,
                    radio_m: v.radio,
                  }
                : null
            )
          }
          onClose={() => setGeoOpen(false)}
        />
      )}
    </div>
  );
}
