"use client";

import { useMemo } from "react";
import type { Bloque } from "./types";

function cmpTime(a: string, b: string) {
  return a.localeCompare(b);
}

function validate(bloques: Bloque[]) {
  const errs: string[] = [];
  const sorted = [...bloques].sort((x, y) =>
    cmpTime(x.hora_inicio, y.hora_inicio)
  );

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
        errs.push(`Bloque ${i}: solapa con el anterior`);
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
}: {
  title: string;
  bloques: Bloque[];
  onChange: (b: Bloque[]) => void;
  onSave: () => void;
}) {
  const { errs } = useMemo(() => validate(bloques), [bloques]);

  function add() {
    onChange([
      ...bloques,
      {
        tipo: "trabajo",
        hora_inicio: "08:00:00",
        hora_fin: "10:00:00",
        obligatorio: true,
      },
    ]);
  }

  function update(i: number, patch: Partial<Bloque>) {
    const next = bloques.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    onChange(next);
  }

  function del(i: number) {
    onChange(bloques.filter((_, idx) => idx !== i));
  }

  function sort() {
    onChange(
      [...bloques].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    );
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
        {bloques.map((b, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-[180px_160px_160px_140px_80px] gap-2 items-end border rounded p-3"
          >
            <div>
              <label className="text-xs text-gray-600">Tipo</label>
              <select
                className="border p-2 rounded w-full"
                value={b.tipo}
                onChange={(e) => update(i, { tipo: e.target.value })}
              >
                <option value="trabajo">trabajo</option>
                <option value="descanso">descanso</option>
                <option value="pausa">pausa</option>
                <option value="comida">comida</option>
                <option value="otro">otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Inicio</label>
              <input
                type="time"
                className="border p-2 rounded w-full"
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
        ))}
        {bloques.length === 0 && (
          <div className="text-sm text-gray-600">Sin bloques.</div>
        )}
      </div>
    </div>
  );
}

//app180-frontend/app/admin/jornadas/BloquesEditor.tsx
