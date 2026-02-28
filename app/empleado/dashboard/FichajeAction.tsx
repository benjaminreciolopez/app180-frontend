"use client";

import { useState } from "react";
import { CalendarOff, BedDouble, Ban, Coffee, Utensils, Route, ChevronLeft } from "lucide-react";
import { useFichaje } from "./useFichaje";
import { Button } from "@/components/ui/button";

export type AccionFichaje =
  | "entrada"
  | "salida"
  | "descanso_inicio"
  | "descanso_fin";

export type BotonEstado = {
  visible: boolean;
  color: "rojo" | "negro";
  puede_fichar: boolean;
  mensaje: string | null;
  accion: AccionFichaje | null;
  objetivo_hhmm: string | null;
  margen_antes: number;
  margen_despues: number;
  motivo_oculto: string | null;

  calendario?: {
    tipo: string;
    nombre: string | null;
    descripcion: string | null;
    origen: string;
    confirmado: boolean;
  } | null;
  ausencia?: {
    id: string;
    tipo: "vacaciones" | "baja_medica" | string;
    fecha_inicio: string;
    fecha_fin: string;
  } | null;
};

function MotivoBloqueo({ boton }: { boton: BotonEstado }) {
  if (!boton.motivo_oculto) return null;

  // 📅 Calendario laboral
  if (boton.motivo_oculto === "calendario") {
    const nombre = boton.calendario?.nombre;
    const desc = boton.calendario?.descripcion;
    const origen = boton.calendario?.origen;

    const texto = nombre
      ? `Festivo: ${nombre}`
      : boton.mensaje || "Día no laborable";

    const tooltip = [
      nombre,
      desc,
      origen ? `Origen: ${origen.toUpperCase()}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div
        className="flex items-center justify-center gap-2 text-orange-600 text-sm cursor-help"
        title={tooltip}
      >
        <span>📅</span>
        <span>{texto}</span>
      </div>
    );
  }

  // 🛌 Ausencia (vacaciones / baja)
  if (boton.motivo_oculto === "ausencia") {
    let texto = "Ausencia";

    if (boton.ausencia?.tipo === "vacaciones") {
      texto = "Estás de vacaciones";
    } else if (boton.ausencia?.tipo === "baja_medica") {
      texto = "Estás de baja médica";
    }

    let hasta = "";

    if (boton.ausencia?.fecha_fin) {
      const d = new Date(boton.ausencia.fecha_fin);
      hasta = d.toLocaleDateString("es-ES");
    }

    return (
      <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
        <span>🛌</span>
        <span>
          {texto}
          {hasta ? ` hasta el ${hasta}` : ""}
        </span>
      </div>
    );
  }

  // 🚫 No laboral genérico
  if (boton.motivo_oculto === "no_laboral") {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
        <span>🚫</span>
        <span>Día no laboral</span>
      </div>
    );
  }

  return null;
}

const SUBTIPOS = [
  { key: "pausa_corta", label: "Pausa corta", icon: Coffee, desc: "15 min" },
  { key: "comida", label: "Comida", icon: Utensils, desc: "Almuerzo" },
  { key: "trayecto", label: "Desplazamiento", icon: Route, desc: "Traslado" },
];

export function FichajeAction({
  boton,
  reload,
}: {
  boton: BotonEstado | null;
  reload: () => void;
}) {
  const { fichar, loading } = useFichaje(reload);
  const [showSubtipos, setShowSubtipos] = useState(false);

  if (!boton) return null;

  const config: Record<AccionFichaje, { label: string }> = {
    entrada: { label: "Fichar entrada" },
    salida: { label: "Fichar salida" },
    descanso_inicio: { label: "Iniciar descanso" },
    descanso_fin: { label: "Finalizar descanso" },
  };

  const handleClick = () => {
    if (boton.accion === "descanso_inicio") {
      setShowSubtipos(true);
    } else {
      fichar(boton.accion!);
    }
  };

  const handleSubtipo = (subtipo: string) => {
    setShowSubtipos(false);
    fichar("descanso_inicio", subtipo);
  };

  return (
    <div className="space-y-2">
      {/* SUBTIPO SELECTOR */}
      {showSubtipos && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setShowSubtipos(false)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-600">Tipo de descanso</span>
          </div>
          {SUBTIPOS.map(({ key, label, icon: Icon, desc }) => (
            <Button
              key={key}
              disabled={loading}
              onClick={() => handleSubtipo(key)}
              variant="secondary"
              className="w-full py-4 justify-start gap-3"
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-gray-400 ml-auto">{desc}</span>
            </Button>
          ))}
        </div>
      )}

      {/* BOTÓN (solo si visible y no mostrando subtipos) */}
      {!showSubtipos && boton.visible && boton.accion && (
        <Button
          disabled={loading || !boton.puede_fichar}
          onClick={handleClick}
          variant={boton.color === "rojo" ? "destructive" : "secondary"}
          className="w-full py-6 text-xl font-bold shadow-lg"
        >
          {loading ? "Registrando..." : config[boton.accion].label}
        </Button>
      )}

      {/* MENSAJE NORMAL */}
      {!showSubtipos && boton.mensaje && (
        <p className="text-sm text-gray-600 text-center">{boton.mensaje}</p>
      )}

      {/* MOTIVO DE BLOQUEO */}
      {!boton.visible && <MotivoBloqueo boton={boton} />}
    </div>
  );
}
