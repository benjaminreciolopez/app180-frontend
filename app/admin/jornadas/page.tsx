"use client";

import { useState } from "react";
import PlantillasPanel from "./PlantillasPanel";
import PlantillasAsignacionPanel from "./PlantillasAsignacionPanel";
import UbicacionAsignacionPanel from "./UbicacionAsignacionPanel";
import CentrosTrabajoPanel from "./CentrosTrabajoPanel";
import PreviewPanel from "./PreviewPanel";

type Tab = "plantillas" | "asignar_horarios" | "asignar_ubicacion" | "centros" | "preview";

export default function JornadasPage() {
  const [tab, setTab] = useState<Tab>("plantillas");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Jornadas y Asignaciones</h1>

        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-3 py-2 rounded text-sm font-medium ${
              tab === "plantillas" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setTab("plantillas")}
          >
            Edición Plantillas
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium ${
              tab === "asignar_horarios" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setTab("asignar_horarios")}
          >
             Asignar Horarios
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium ${
              tab === "asignar_ubicacion" ? "bg-emerald-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setTab("asignar_ubicacion")}
          >
             Asignar Ubicación
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium ${
              tab === "centros" ? "bg-orange-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setTab("centros")}
          >
            Centros de Trabajo
          </button>

          <button
            className={`px-3 py-2 rounded text-sm font-medium ${
              tab === "preview" ? "bg-purple-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => setTab("preview")}
          >
            Vista Previa
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {tab === "plantillas" && <PlantillasPanel />}
        {tab === "asignar_horarios" && <PlantillasAsignacionPanel />}
        {tab === "asignar_ubicacion" && <UbicacionAsignacionPanel />}
        {tab === "centros" && <CentrosTrabajoPanel />}
        {tab === "preview" && <PreviewPanel />}
      </div>
    </div>
  );
}
