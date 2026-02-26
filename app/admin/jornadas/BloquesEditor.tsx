"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import type { Bloque, TipoBloque } from "./types";

const DEFAULT_TIPOS: TipoBloque[] = [
  { key: "trabajo", label: "Trabajo", color: "#22c55e", es_trabajo: true, sistema: true },
  { key: "descanso", label: "Descanso", color: "#f59e0b", es_trabajo: false, sistema: true },
  { key: "pausa", label: "Pausa", color: "#a855f7", es_trabajo: false, sistema: false },
  { key: "comida", label: "Comida", color: "#ef4444", es_trabajo: false, sistema: false },
  { key: "otro", label: "Otro", color: "#6b7280", es_trabajo: false, sistema: false },
];

const CUSTOM_OPTION = "__custom__";

function toKey(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function cmpTime(a: string, b: string) {
  return a.localeCompare(b);
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.min(23, Math.floor(total / 60));
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:00`;
}

function normalizeTime(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

function validate(bloques: Bloque[]) {
  const errs: string[] = [];
  const sorted = [...bloques].sort((x, y) =>
    cmpTime(x.hora_inicio, y.hora_inicio)
  );

  if (sorted.length === 0) {
    errs.push("Debe existir al menos un bloque");
    return { errs, sorted };
  }

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];

    if (!b.tipo) errs.push(`Bloque ${i + 1}: tipo obligatorio`);
    if (!b.hora_inicio || !b.hora_fin)
      errs.push(`Bloque ${i + 1}: horas obligatorias`);

    if (
      b.hora_inicio &&
      b.hora_fin &&
      cmpTime(b.hora_inicio, b.hora_fin) >= 0
    ) {
      errs.push(`Bloque ${i + 1}: hora_fin debe ser posterior a hora_inicio`);
    }

    if (i > 0) {
      const prev = sorted[i - 1];

      if (cmpTime(prev.hora_fin, b.hora_inicio) > 0) {
        errs.push(`Bloque ${i + 1}: solapa con el anterior`);
      }

      if (cmpTime(prev.hora_fin, b.hora_inicio) !== 0) {
        errs.push(
          `Bloque ${i + 1}: debe empezar exactamente a ${prev.hora_fin}`
        );
      }
    }
  }

  return { errs, sorted };
}

export default function BloquesEditor({
  title,
  bloques,
  onChange,
  onSave,
  rangoInicio,
  rangoFin,
  clientes = [],
  centrosTrabajo = [],
  tiposBloqueEmpresa,
  onTiposChange,
}: {
  title: string;
  bloques: Bloque[];
  onChange: (b: Bloque[]) => void;
  onSave: () => void;
  rangoInicio?: string;
  rangoFin?: string;
  clientes?: { id: string; nombre: string }[];
  centrosTrabajo?: { id: string; nombre: string }[];
  tiposBloqueEmpresa?: TipoBloque[];
  onTiposChange?: (tipos: TipoBloque[]) => void;
}) {
  const { errs, sorted } = useMemo(() => validate(bloques), [bloques]);
  const tipos = tiposBloqueEmpresa || DEFAULT_TIPOS;

  // Estado para el editor inline de tipo personalizado
  const [customEditorIndex, setCustomEditorIndex] = useState<number | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customColor, setCustomColor] = useState("#6b7280");
  const [customEsTrabajo, setCustomEsTrabajo] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customEditorIndex !== null && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customEditorIndex]);

  async function saveCustomTipo(bloqueIndex: number) {
    const label = customLabel.trim();
    if (!label) { showError("Escribe un nombre para el tipo"); return; }

    const key = toKey(label);
    if (!key) { showError("Nombre no válido"); return; }
    if (tipos.some((t) => t.key === key)) {
      showError(`Ya existe un tipo "${label}"`);
      return;
    }

    const nuevoTipo: TipoBloque = {
      key,
      label,
      color: customColor,
      es_trabajo: customEsTrabajo,
      sistema: false,
    };
    const nuevosTipos = [...tipos, nuevoTipo];

    setSavingCustom(true);
    try {
      await api.put("/admin/configuracion/tipos-bloque", { tipos_bloque: nuevosTipos });
      onTiposChange?.(nuevosTipos);
      update(bloqueIndex, { tipo: key });
      setCustomEditorIndex(null);
      setCustomLabel("");
      setCustomColor("#6b7280");
      setCustomEsTrabajo(false);
      showSuccess(`Tipo "${label}" creado`);
    } catch (e: any) {
      showError(e?.response?.data?.error || "Error guardando tipo personalizado");
    } finally {
      setSavingCustom(false);
    }
  }

  function cancelCustom(bloqueIndex: number) {
    // Revert to previous tipo (first tipo as fallback)
    const prev = sorted[bloqueIndex]?.tipo;
    if (prev === CUSTOM_OPTION || !tipos.some((t) => t.key === prev)) {
      update(bloqueIndex, { tipo: tipos[0]?.key || "trabajo" });
    }
    setCustomEditorIndex(null);
    setCustomLabel("");
    setCustomColor("#6b7280");
    setCustomEsTrabajo(false);
  }

  function add() {
    if (bloques.length === 0) {
      const start = rangoInicio ? normalizeTime(rangoInicio) : "08:00:00";
      let end = addMinutes(start.slice(0, 5), 60);

      if (rangoFin) {
        const rf = normalizeTime(rangoFin);
        if (cmpTime(end, rf) > 0) end = rf;
      }

      onChange([
        {
          tipo: "trabajo",
          hora_inicio: start,
          hora_fin: end,
          obligatorio: true,
        },
      ]);
      return;
    }

    const last = sorted[sorted.length - 1];
    const start = last.hora_fin;
    let end = addMinutes(start.slice(0, 5), 60);

    if (rangoFin) {
      const rf = normalizeTime(rangoFin);
      if (cmpTime(end, rf) > 0) end = rf;
      if (cmpTime(start, rf) >= 0) end = start;
    }

    onChange([
      ...sorted,
      {
        tipo: "trabajo",
        hora_inicio: start,
        hora_fin: end,
        obligatorio: true,
      },
    ]);
  }

  function update(i: number, patch: Partial<Bloque>) {
    const next = sorted.map((b, idx) => (idx === i ? { ...b, ...patch } : b));

    next.forEach((b) => {
      if (b.hora_inicio) b.hora_inicio = normalizeTime(b.hora_inicio);
      if (b.hora_fin) b.hora_fin = normalizeTime(b.hora_fin);
    });

    for (let j = 1; j < next.length; j++) {
      next[j].hora_inicio = next[j - 1].hora_fin;
    }

    onChange(next);
  }

  function del(i: number) {
    const next = sorted.filter((_, idx) => idx !== i);
    for (let j = 1; j < next.length; j++) {
      next[j].hora_inicio = next[j - 1].hora_fin;
    }
    onChange(next);
  }

  function sort() {
    onChange(sorted);
  }

  function getUbicacionValue(b: Bloque) {
    if (b.centro_trabajo_id) return `ct:${b.centro_trabajo_id}`;
    if (b.cliente_id) return `cli:${b.cliente_id}`;
    return "";
  }

  function handleUbicacionChange(i: number, val: string) {
    if (val.startsWith("ct:")) {
      update(i, { centro_trabajo_id: val.slice(3), cliente_id: null });
    } else if (val.startsWith("cli:")) {
      update(i, { cliente_id: val.slice(4), centro_trabajo_id: null });
    } else {
      update(i, { cliente_id: null, centro_trabajo_id: null });
    }
  }

  function getTipoColor(key: string) {
    return tipos.find(t => t.key === key)?.color || "#6b7280";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-semibold">{title}</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-gray-200" onClick={sort}>
            Ordenar
          </button>
          <button
            className="px-3 py-2 rounded bg-green-600 text-white"
            onClick={add}
          >
            + Bloque
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={errs.length > 0}
            onClick={onSave}
          >
            Guardar
          </button>
        </div>
      </div>

      {errs.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
          <div className="font-semibold mb-1">Revisa antes de guardar:</div>
          <ul className="list-disc ml-5">
            {errs.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((b, i) => (
          <div key={i} className="border rounded p-3">
            <div className="grid grid-cols-2 md:grid-cols-[150px_1fr_100px_100px_90px_80px] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-600">Tipo</label>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getTipoColor(b.tipo) }}
                  />
                  <select
                    className="border p-2 rounded w-full text-sm"
                    value={customEditorIndex === i ? CUSTOM_OPTION : b.tipo}
                    onChange={(e) => {
                      if (e.target.value === CUSTOM_OPTION) {
                        setCustomEditorIndex(i);
                        setCustomLabel("");
                        setCustomColor("#6b7280");
                        setCustomEsTrabajo(false);
                      } else {
                        setCustomEditorIndex(null);
                        update(i, { tipo: e.target.value });
                      }
                    }}
                  >
                    {tipos.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                    <option disabled>──────────</option>
                    <option value={CUSTOM_OPTION}>+ Personalizar…</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Ubicación</label>
                <select
                  className="border p-2 rounded w-full text-sm"
                  value={getUbicacionValue(b)}
                  onChange={(e) => handleUbicacionChange(i, e.target.value)}
                >
                  <option value="">(Asignación general)</option>
                  {centrosTrabajo.length > 0 && (
                    <optgroup label="Centros de Trabajo">
                      {centrosTrabajo.map((ct) => (
                        <option key={`ct:${ct.id}`} value={`ct:${ct.id}`}>
                          {ct.nombre}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {clientes.length > 0 && (
                    <optgroup label="Clientes">
                      {clientes.map((c) => (
                        <option key={`cli:${c.id}`} value={`cli:${c.id}`}>
                          {c.nombre}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Inicio</label>
                <input
                  type="time"
                  className="border p-2 rounded w-full bg-gray-100"
                  disabled={i !== 0}
                  value={(b.hora_inicio || "").slice(0, 5)}
                  onChange={(e) =>
                    update(i, { hora_inicio: `${e.target.value}:00` })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Fin</label>
                <input
                  type="time"
                  className="border p-2 rounded w-full"
                  value={(b.hora_fin || "").slice(0, 5)}
                  onChange={(e) =>
                    update(i, { hora_fin: `${e.target.value}:00` })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Obligatorio</label>
                <select
                  className="border p-2 rounded w-full"
                  value={b.obligatorio ? "1" : "0"}
                  onChange={(e) =>
                    update(i, { obligatorio: e.target.value === "1" })
                  }
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  className="px-3 py-2 rounded bg-red-600 text-white"
                  onClick={() => del(i)}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Editor inline de tipo personalizado */}
            {customEditorIndex === i && (
              <div className="mt-2 border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <div className="text-xs font-semibold text-blue-700 mb-2">Nuevo tipo personalizado</div>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-gray-600">Nombre</label>
                    <input
                      ref={customInputRef}
                      type="text"
                      className="border p-2 rounded w-full text-sm"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Ej: Formación, Traslado…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCustomTipo(i);
                        if (e.key === "Escape") cancelCustom(i);
                      }}
                      disabled={savingCustom}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Color</label>
                    <input
                      type="color"
                      className="border rounded w-full h-[38px] cursor-pointer"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      disabled={savingCustom}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-sm pb-1 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={customEsTrabajo}
                      onChange={(e) => setCustomEsTrabajo(e.target.checked)}
                      className="w-4 h-4"
                      disabled={savingCustom}
                    />
                    Laboral
                  </label>
                  <button
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                    disabled={!customLabel.trim() || savingCustom}
                    onClick={() => saveCustomTipo(i)}
                  >
                    {savingCustom ? "Guardando…" : "Crear"}
                  </button>
                  <button
                    className="px-3 py-2 rounded bg-gray-200 text-sm"
                    onClick={() => cancelCustom(i)}
                    disabled={savingCustom}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
