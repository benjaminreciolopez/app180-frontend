"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getTurnos, deleteTurno } from "@/services/turnos";

export default function TurnosPage() {
  const [turnos, setTurnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  async function cargar() {
    try {
      const data = await getTurnos();
      setTurnos(data);
    } catch (e) {
      console.error("Error cargando turnos", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSelectedId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function borrar(id: string) {
    if (!confirm("¿Eliminar turno?")) return;
    await deleteTurno(id);
    await cargar();
  }

  if (loading) return <p>Cargando turnos...</p>;

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Turnos (catálogo)</h1>

        <Link
          href="/admin/turnos/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Nuevo turno
        </Link>
      </div>

      {turnos.length === 0 ? (
        <div className="p-4 border rounded bg-white">
          No hay turnos configurados todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {turnos.map((t) => {
            const selected = selectedId === t.id;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`p-4 border rounded bg-white shadow-sm cursor-pointer transition ${
                  selected
                    ? "border-blue-600 ring-2 ring-blue-300 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold">{t.nombre}</div>

                <div className="text-sm text-gray-600">
                  Tipo: {t.tipo_turno}
                </div>

                {t.descripcion && (
                  <div className="text-sm text-gray-500 mt-1">
                    {t.descripcion}
                  </div>
                )}

                {selected && (
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/admin/turnos/${t.id}`}
                      className="px-3 py-1 bg-yellow-500 text-white rounded"
                    >
                      Editar
                    </Link>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        borrar(t.id);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// app180-frontend/app/admin/turnos/page.tsx
