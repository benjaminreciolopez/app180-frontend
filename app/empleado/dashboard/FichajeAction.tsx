"use client";

import { useFichaje } from "./useFichaje";

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
};

export function FichajeAction({
  boton,
  reload,
}: {
  boton: BotonEstado | null;
  reload: () => void;
}) {
  const { fichar, loading } = useFichaje(reload);

  if (!boton?.visible) return null;
  if (!boton.accion) return null;

  const config: Record<AccionFichaje, { label: string }> = {
    entrada: { label: "Fichar entrada" },
    salida: { label: "Fichar salida" },
    descanso_inicio: { label: "Iniciar descanso" },
    descanso_fin: { label: "Finalizar descanso" },
  };

  const cfg = config[boton.accion];

  const colorClass =
    boton.color === "rojo"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-gray-300 hover:bg-gray-400 text-black";

  return (
    <div className="space-y-2">
      <button
        disabled={loading || !boton.puede_fichar}
        onClick={() => fichar(boton.accion!)}
        className={`w-full py-4 text-lg rounded font-semibold transition disabled:opacity-60 ${colorClass}`}
      >
        {loading ? "Registrando..." : cfg.label}
      </button>

      {boton.mensaje ? (
        <p className="text-sm text-gray-600 text-center">{boton.mensaje}</p>
      ) : null}
    </div>
  );
}
