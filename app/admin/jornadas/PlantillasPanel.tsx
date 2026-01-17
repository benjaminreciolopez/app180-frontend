"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { Bloque, Excepcion, Plantilla, PlantillaDia } from "./types";
import BloquesEditor from "./BloquesEditor";

const DIAS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
  { n: 7, label: "Domingo" },
];

function toHHMMSS(v: string) {
  // input type=time suele dar "HH:MM"
  if (!v) return v;
  return v.length === 5 ? `${v}:00` : v;
}

export default function PlantillasPanel() {
  const [loading, setLoading] = useState(true);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [sel, setSel] = useState<Plantilla | null>(null);

  const [detalle, setDetalle] = useState<{
    plantilla: Plantilla;
    dias: PlantillaDia[];
    excepciones: Excepcion[];
  } | null>(null);

  // editor dia semana
  const [diaSemanaSel, setDiaSemanaSel] = useState<number>(1);
  const diaSel = useMemo(() => {
    if (!detalle) return null;
    return detalle.dias.find((d) => d.dia_semana === diaSemanaSel) ?? null;
  }, [detalle, diaSemanaSel]);

  const [bloquesDia, setBloquesDia] = useState<Bloque[]>([]);
  const [cargandoBloquesDia, setCargandoBloquesDia] = useState(false);

  // editor excepcion
  const [exSel, setExSel] = useState<Excepcion | null>(null);
  const [bloquesEx, setBloquesEx] = useState<Bloque[]>([]);
  const [cargandoBloquesEx, setCargandoBloquesEx] = useState(false);

  async function loadPlantillas() {
    setLoading(true);
    try {
      const r = await api.get("/admin/plantillas");
      setPlantillas(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetalle(plantillaId: string) {
    const r = await api.get(`/admin/plantillas/${plantillaId}`);
    setDetalle(r.data);
    setExSel(null);
    setBloquesEx([]);
  }

  useEffect(() => {
    loadPlantillas();
  }, []);

  // cuando eliges plantilla
  useEffect(() => {
    if (!sel) {
      setDetalle(null);
      return;
    }
    loadDetalle(sel.id);
  }, [sel?.id]);

  // cuando cambias de día semanal -> cargar bloques del día
  useEffect(() => {
    async function run() {
      if (!diaSel?.id) {
        setBloquesDia([]);
        return;
      }
      setCargandoBloquesDia(true);
      try {
        // requiere endpoint GET /admin/plantillas/dias/:id/bloques (lo añadiste)
        const r = await api.get(`/admin/plantillas/dias/${diaSel.id}/bloques`);
        setBloquesDia(Array.isArray(r.data) ? r.data : []);
      } finally {
        setCargandoBloquesDia(false);
      }
    }
    run();
  }, [diaSel?.id]);

  // cuando eliges excepción -> cargar bloques de excepción
  useEffect(() => {
    async function run() {
      if (!exSel?.id) {
        setBloquesEx([]);
        return;
      }
      setCargandoBloquesEx(true);
      try {
        // requiere endpoint GET /admin/plantillas/excepciones/:id/bloques (lo añadiste)
        const r = await api.get(
          `/admin/plantillas/excepciones/${exSel.id}/bloques`
        );
        setBloquesEx(Array.isArray(r.data) ? r.data : []);
      } finally {
        setCargandoBloquesEx(false);
      }
    }
    run();
  }, [exSel?.id]);

  async function crearPlantilla() {
    const nombre = prompt("Nombre de plantilla:");
    if (!nombre) return;

    const r = await api.post("/admin/plantillas", {
      nombre,
      descripcion: null,
      tipo: "semanal",
    });

    await loadPlantillas();
    setSel(r.data);
  }

  async function guardarDiaSemana() {
    if (!detalle?.plantilla?.id) return;

    const hora_inicio = prompt("Hora inicio (HH:MM)", "08:00") || "";
    const hora_fin = prompt("Hora fin (HH:MM)", "18:00") || "";

    const r = await api.put(
      `/admin/plantillas/${detalle.plantilla.id}/dias/${diaSemanaSel}`,
      {
        hora_inicio: toHHMMSS(hora_inicio),
        hora_fin: toHHMMSS(hora_fin),
        activo: true,
      }
    );

    // refresca detalle
    await loadDetalle(detalle.plantilla.id);

    // posiciona el día recién creado
    // (el id real está en detalle.dias; por eso recargamos)
  }

  async function guardarBloquesDia(bloques: Bloque[]) {
    if (!diaSel?.id) {
      alert("Primero define el rango del día (hora inicio/fin).");
      return;
    }
    await api.put(`/admin/plantillas/dias/${diaSel.id}/bloques`, { bloques });
    // recarga
    const r = await api.get(`/admin/plantillas/dias/${diaSel.id}/bloques`);
    setBloquesDia(Array.isArray(r.data) ? r.data : []);
  }

  async function upsertExcepcion() {
    if (!detalle?.plantilla?.id) return;

    const fecha = prompt(
      "Fecha excepción (YYYY-MM-DD):",
      new Date().toISOString().slice(0, 10)
    );
    if (!fecha) return;

    const r = await api.put(
      `/admin/plantillas/${detalle.plantilla.id}/excepciones/${fecha}`,
      {
        activo: true,
        hora_inicio: null,
        hora_fin: null,
        nota: null,
      }
    );

    await loadDetalle(detalle.plantilla.id);
    // selecciona la excepción creada/actualizada
    setExSel(r.data);
  }

  async function guardarBloquesEx(bloques: Bloque[]) {
    if (!exSel?.id) {
      alert("Primero crea/selecciona una excepción.");
      return;
    }
    await api.put(`/admin/plantillas/excepciones/${exSel.id}/bloques`, {
      bloques,
    });
    const r = await api.get(
      `/admin/plantillas/excepciones/${exSel.id}/bloques`
    );
    setBloquesEx(Array.isArray(r.data) ? r.data : []);
  }

  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* LISTA PLANTILLAS */}
      <div className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Plantillas</h2>
          <button
            className="px-3 py-2 rounded bg-green-600 text-white"
            onClick={crearPlantilla}
          >
            + Nueva
          </button>
        </div>

        <div className="space-y-2">
          {plantillas.map((p) => (
            <button
              key={p.id}
              className={`w-full text-left px-3 py-2 rounded border ${
                sel?.id === p.id
                  ? "bg-blue-50 border-blue-300"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setSel(p)}
            >
              <div className="font-semibold">{p.nombre}</div>
              <div className="text-xs text-gray-600">
                Tipo: {p.tipo} · {p.activo ? "Activa" : "Inactiva"}
              </div>
            </button>
          ))}
          {plantillas.length === 0 && (
            <div className="text-sm text-gray-600">
              No hay plantillas todavía.
            </div>
          )}
        </div>
      </div>

      {/* DETALLE PLANTILLA */}
      <div className="bg-white border rounded p-4 space-y-4">
        {!detalle ? (
          <div className="text-gray-600">
            Selecciona una plantilla para editarla.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">
                  {detalle.plantilla.nombre}
                </h2>
                <div className="text-sm text-gray-600">
                  Editor semanal + bloques + excepciones
                </div>
              </div>

              <button
                className="px-3 py-2 rounded bg-gray-200"
                onClick={() => loadDetalle(detalle.plantilla.id)}
              >
                Refrescar
              </button>
            </div>

            {/* Semana */}
            <div className="border rounded p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-semibold">Semana</div>
                <button
                  className="px-3 py-2 rounded bg-black text-white"
                  onClick={guardarDiaSemana}
                >
                  Definir rango día
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {DIAS.map((d) => (
                  <button
                    key={d.n}
                    className={`px-3 py-2 rounded ${
                      diaSemanaSel === d.n
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                    onClick={() => setDiaSemanaSel(d.n)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="text-sm text-gray-700">
                <b>Día:</b> {DIAS.find((x) => x.n === diaSemanaSel)?.label} ·{" "}
                <b>Rango:</b>{" "}
                {diaSel?.hora_inicio && diaSel?.hora_fin
                  ? `${diaSel.hora_inicio} - ${diaSel.hora_fin}`
                  : "No definido"}
              </div>

              {cargandoBloquesDia ? (
                <div className="text-sm text-gray-600">Cargando bloques...</div>
              ) : (
                <BloquesEditor
                  title="Bloques del día"
                  bloques={bloquesDia}
                  onChange={setBloquesDia}
                  onSave={() => guardarBloquesDia(bloquesDia)}
                />
              )}
            </div>

            {/* Excepciones */}
            <div className="border rounded p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-semibold">Excepciones por fecha</div>
                <button
                  className="px-3 py-2 rounded bg-black text-white"
                  onClick={upsertExcepcion}
                >
                  + Crear excepción
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {(detalle.excepciones || []).map((ex) => (
                  <button
                    key={ex.id}
                    className={`px-3 py-2 rounded border ${
                      exSel?.id === ex.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-gray-100"
                    }`}
                    onClick={() => setExSel(ex)}
                  >
                    {ex.fecha}
                  </button>
                ))}
                {(!detalle.excepciones || detalle.excepciones.length === 0) && (
                  <div className="text-sm text-gray-600">
                    No hay excepciones.
                  </div>
                )}
              </div>

              {exSel ? (
                cargandoBloquesEx ? (
                  <div className="text-sm text-gray-600">
                    Cargando bloques excepción...
                  </div>
                ) : (
                  <BloquesEditor
                    title={`Bloques excepción (${exSel.fecha})`}
                    bloques={bloquesEx}
                    onChange={setBloquesEx}
                    onSave={() => guardarBloquesEx(bloquesEx)}
                  />
                )
              ) : (
                <div className="text-sm text-gray-600">
                  Selecciona una excepción para editar sus bloques.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// app180-frontend/app/admin/jornadas/PlantillasPanel.tsx
