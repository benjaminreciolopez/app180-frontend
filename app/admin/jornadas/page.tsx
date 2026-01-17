"use client";

import { useState } from "react";
import PlantillasPanel from "./PlantillasPanel";
import AsignacionesPanel from "./AsignacionesPanel";
import PreviewPanel from "./PreviewPanel";

type Tab = "plantillas" | "asignaciones" | "preview";

export default function JornadasPage() {
  const [tab, setTab] = useState<Tab>("plantillas");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Jornadas</h1>

        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-3 py-2 rounded ${
              tab === "plantillas" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setTab("plantillas")}
          >
            Plantillas
          </button>
          <button
            className={`px-3 py-2 rounded ${
              tab === "asignaciones" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setTab("asignaciones")}
          >
            Asignaciones
          </button>
          <button
            className={`px-3 py-2 rounded ${
              tab === "preview" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {tab === "plantillas" && <PlantillasPanel />}
      {tab === "asignaciones" && <AsignacionesPanel />}
      {tab === "preview" && <PreviewPanel />}
    </div>
  );
}
