"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";

type TipoBloque = {
  key: string;
  label: string;
  color: string;
  es_trabajo: boolean;
  sistema: boolean;
};

function toKey(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function TiposBloquePanel() {
  const [tipos, setTipos] = useState<TipoBloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor para nuevo tipo
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [newEsTrabajo, setNewEsTrabajo] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/admin/configuracion/tipos-bloque");
      setTipos(Array.isArray(r.data) ? r.data : []);
    } catch {
      showError("Error cargando tipos de bloque");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(next: TipoBloque[]) {
    setSaving(true);
    try {
      await api.put("/admin/configuracion/tipos-bloque", { tipos_bloque: next });
      setTipos(next);
      showSuccess("Tipos de bloque guardados");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Error guardando tipos de bloque";
      showError(msg);
    } finally {
      setSaving(false);
    }
  }

  function addTipo() {
    const label = newLabel.trim();
    if (!label) return;

    const key = toKey(label);
    if (tipos.some((t) => t.key === key)) {
      showError(`Ya existe un tipo con key "${key}"`);
      return;
    }

    const next = [
      ...tipos,
      { key, label, color: newColor, es_trabajo: newEsTrabajo, sistema: false },
    ];
    save(next);
    setNewLabel("");
    setNewColor("#6b7280");
    setNewEsTrabajo(false);
  }

  function updateTipo(idx: number, patch: Partial<TipoBloque>) {
    const next = tipos.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    save(next);
  }

  function deleteTipo(idx: number) {
    const t = tipos[idx];
    if (t.sistema) {
      showError("Los tipos de sistema no se pueden eliminar");
      return;
    }
    if (!confirm(`¿Eliminar el tipo "${t.label}"?`)) return;
    save(tipos.filter((_, i) => i !== idx));
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
        Define los tipos de bloque disponibles para las plantillas de jornada.
        Los tipos de sistema (Trabajo, Descanso) no se pueden eliminar.
      </p>

      <div className={`space-y-2 ${saving ? "opacity-60 pointer-events-none" : ""}`}>
        {tipos.map((t, idx) => (
          <div
            key={t.key}
            className="flex items-center gap-3 border rounded p-3 bg-white"
          >
            <input
              type="color"
              value={t.color}
              onChange={(e) => updateTipo(idx, { color: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer"
              title="Color"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.label}</span>
                <span className="text-xs text-gray-400">({t.key})</span>
                {t.sistema && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                    Sistema
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={t.es_trabajo}
                disabled={t.sistema}
                onChange={(e) => updateTipo(idx, { es_trabajo: e.target.checked })}
                className="w-4 h-4"
              />
              Cuenta como trabajo
            </label>

            {!t.sistema && (
              <button
                className="px-2 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200"
                onClick={() => deleteTipo(idx)}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Añadir nuevo tipo */}
      <div className="border rounded p-3 bg-gray-50 space-y-3">
        <div className="font-medium text-sm">Añadir nuevo tipo</div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-gray-600">Nombre</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej: Traslado, Formación..."
              onKeyDown={(e) => e.key === "Enter" && addTipo()}
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Color</label>
            <input
              type="color"
              className="border p-2 rounded w-full h-[42px] cursor-pointer"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-1.5 text-sm pb-2">
            <input
              type="checkbox"
              checked={newEsTrabajo}
              onChange={(e) => setNewEsTrabajo(e.target.checked)}
              className="w-4 h-4"
            />
            Cuenta como trabajo
          </label>

          <button
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            disabled={!newLabel.trim() || saving}
            onClick={addTipo}
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
