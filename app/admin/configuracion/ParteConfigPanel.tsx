"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";

type CampoConfig = {
  key: string;
  label: string;
  tipo: string;
  obligatorio: boolean;
  opciones?: string[];
  orden: number;
};

type ParteConfig = {
  id: string;
  nombre: string;
  campos: CampoConfig[];
  activo: boolean;
  por_defecto: boolean;
  empleados_count: number;
  empleados?: { id: string; nombre: string }[];
};

const TIPOS_CAMPO = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Numero" },
  { value: "select", label: "Selector" },
  { value: "checkbox", label: "Checkbox" },
  { value: "hora", label: "Hora" },
  { value: "fecha", label: "Fecha" },
];

function toKey(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

type Props = {
  onSave?: () => void;
};

export default function ParteConfigPanel({ onSave }: Props = {}) {
  const [configs, setConfigs] = useState<ParteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string }[]>([]);

  // Editing state
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCampos, setEditCampos] = useState<CampoConfig[]>([]);
  const [editPorDefecto, setEditPorDefecto] = useState(false);
  const [editEmpleadoIds, setEditEmpleadoIds] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [rc, re] = await Promise.all([
        api.get("/admin/parte-configuraciones"),
        api.get("/admin/empleados"),
      ]);
      setConfigs(Array.isArray(rc.data) ? rc.data : []);
      setEmpleados(Array.isArray(re.data) ? re.data : []);
    } catch {
      showError("Error cargando configuraciones de partes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function selectConfig(id: string) {
    try {
      const r = await api.get(`/admin/parte-configuraciones/${id}`);
      const cfg = r.data;
      setEditId(cfg.id);
      setEditNombre(cfg.nombre);
      setEditCampos(cfg.campos || []);
      setEditPorDefecto(cfg.por_defecto);
      setEditEmpleadoIds((cfg.empleados || []).map((e: any) => e.id));
    } catch {
      showError("Error cargando configuración");
    }
  }

  function resetEdit() {
    setEditId(null);
    setEditNombre("");
    setEditCampos([]);
    setEditPorDefecto(false);
    setEditEmpleadoIds([]);
  }

  async function crear() {
    const nombre = window.prompt("Nombre de la configuración:");
    if (!nombre?.trim()) return;

    setSaving(true);
    try {
      const r = await api.post("/admin/parte-configuraciones", {
        nombre: nombre.trim(),
        campos: [],
      });
      await load();
      selectConfig(r.data.id);
      showSuccess("Configuración creada");
    } catch (e: any) {
      showError(e?.response?.data?.error || "Error creando configuración");
    } finally {
      setSaving(false);
    }
  }

  async function guardar() {
    if (!editId) return;
    setSaving(true);
    try {
      await api.put(`/admin/parte-configuraciones/${editId}`, {
        nombre: editNombre,
        campos: editCampos,
        por_defecto: editPorDefecto,
      });
      // Assign employees
      await api.put(`/admin/parte-configuraciones/${editId}/asignar`, {
        empleado_ids: editEmpleadoIds,
      });
      await load();
      showSuccess("Configuración guardada");
      onSave?.();
    } catch (e: any) {
      showError(e?.response?.data?.error || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!editId) return;
    if (!confirm("¿Eliminar esta configuración?")) return;
    setSaving(true);
    try {
      await api.delete(`/admin/parte-configuraciones/${editId}`);
      resetEdit();
      await load();
      showSuccess("Configuración eliminada");
    } catch (e: any) {
      showError(e?.response?.data?.error || "Error eliminando");
    } finally {
      setSaving(false);
    }
  }

  function addCampo() {
    const label = window.prompt("Nombre del campo:");
    if (!label?.trim()) return;
    setEditCampos([
      ...editCampos,
      {
        key: toKey(label),
        label: label.trim(),
        tipo: "texto",
        obligatorio: false,
        orden: editCampos.length + 1,
      },
    ]);
  }

  function updateCampo(idx: number, patch: Partial<CampoConfig>) {
    setEditCampos(editCampos.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeCampo(idx: number) {
    setEditCampos(editCampos.filter((_, i) => i !== idx));
  }

  function moveCampo(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editCampos.length) return;
    const arr = [...editCampos];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    arr.forEach((c, i) => (c.orden = i + 1));
    setEditCampos(arr);
  }

  function toggleEmpleado(empId: string) {
    setEditEmpleadoIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Configura los campos adicionales que los empleados deben rellenar en sus partes de trabajo.
        Puedes crear diferentes configuraciones y asignarlas a empleados específicos.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* List */}
        <div className="space-y-2">
          <button
            className="w-full px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50"
            disabled={saving}
            onClick={crear}
          >
            + Nueva Configuración
          </button>

          {configs.map((c) => (
            <button
              key={c.id}
              className={`w-full text-left px-3 py-2 rounded border text-sm ${
                editId === c.id
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => selectConfig(c.id)}
            >
              <div className="font-medium flex items-center gap-2">
                {c.nombre}
                {c.por_defecto && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    Default
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {c.campos?.length || 0} campos · {c.empleados_count} empleados
              </div>
            </button>
          ))}

          {configs.length === 0 && (
            <div className="text-sm text-gray-500 p-2">
              No hay configuraciones. Crea una para empezar.
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="border rounded p-4 bg-white space-y-4">
          {!editId ? (
            <div className="text-gray-500 text-sm">
              Selecciona o crea una configuración para editarla.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-600">Nombre</label>
                  <input
                    type="text"
                    className="border p-2 rounded w-full"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm whitespace-nowrap pt-4">
                  <input
                    type="checkbox"
                    checked={editPorDefecto}
                    onChange={(e) => setEditPorDefecto(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Por defecto
                </label>
              </div>

              {/* Campos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Campos</div>
                  <button
                    className="px-3 py-1 text-sm rounded bg-green-600 text-white"
                    onClick={addCampo}
                  >
                    + Campo
                  </button>
                </div>

                {editCampos.length === 0 && (
                  <div className="text-sm text-gray-500 p-2 border rounded bg-gray-50">
                    Sin campos extra. Los empleados verán el formulario estándar.
                  </div>
                )}

                {editCampos.map((campo, idx) => (
                  <div
                    key={idx}
                    className="border rounded p-3 bg-gray-50 space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] text-gray-500">Label</label>
                        <input
                          type="text"
                          className="border p-1.5 rounded w-full text-sm"
                          value={campo.label}
                          onChange={(e) => updateCampo(idx, { label: e.target.value })}
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-gray-500">Tipo</label>
                        <select
                          className="border p-1.5 rounded w-full text-sm"
                          value={campo.tipo}
                          onChange={(e) => updateCampo(idx, { tipo: e.target.value })}
                        >
                          {TIPOS_CAMPO.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-1 text-xs pt-3">
                        <input
                          type="checkbox"
                          checked={campo.obligatorio}
                          onChange={(e) => updateCampo(idx, { obligatorio: e.target.checked })}
                          className="w-3.5 h-3.5"
                        />
                        Oblig.
                      </label>
                      <div className="flex gap-1 pt-3">
                        <button
                          className="px-1.5 py-0.5 text-xs rounded bg-gray-200"
                          onClick={() => moveCampo(idx, -1)}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          className="px-1.5 py-0.5 text-xs rounded bg-gray-200"
                          onClick={() => moveCampo(idx, 1)}
                          disabled={idx === editCampos.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700"
                          onClick={() => removeCampo(idx)}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {campo.tipo === "select" && (
                      <div>
                        <label className="text-[10px] text-gray-500">
                          Opciones (separadas por coma)
                        </label>
                        <input
                          type="text"
                          className="border p-1.5 rounded w-full text-sm"
                          value={(campo.opciones || []).join(", ")}
                          onChange={(e) =>
                            updateCampo(idx, {
                              opciones: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Opción 1, Opción 2, ..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empleados */}
              <div className="space-y-2">
                <div className="font-semibold text-sm">Empleados asignados</div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 space-y-1">
                  {empleados.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 text-sm hover:bg-white rounded px-1"
                    >
                      <input
                        type="checkbox"
                        checked={editEmpleadoIds.includes(emp.id)}
                        onChange={() => toggleEmpleado(emp.id)}
                        className="w-3.5 h-3.5"
                      />
                      {emp.nombre}
                    </label>
                  ))}
                  {empleados.length === 0 && (
                    <div className="text-xs text-gray-500">No hay empleados</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                  disabled={saving}
                  onClick={guardar}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-100 text-red-700 disabled:opacity-50"
                  disabled={saving}
                  onClick={eliminar}
                >
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
