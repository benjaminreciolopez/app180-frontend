"use client";

import { useFichaje } from "./useFichaje";

export type AccionFichaje =
  | "entrada"
  | "salida"
  | "descanso_inicio"
  | "descanso_fin";

export function FichajeAction({
  accion,
  reload,
}: {
  accion: AccionFichaje | null;
  reload: () => void;
}) {
  const { fichar, loading } = useFichaje(reload);

  if (!accion) return null;

  const config: Record<AccionFichaje, { label: string; className: string }> = {
    entrada: { label: "Fichar entrada", className: "btn-primary" },
    salida: { label: "Fichar salida", className: "btn-danger" },
    descanso_inicio: { label: "Iniciar descanso", className: "btn-secondary" },
    descanso_fin: { label: "Finalizar descanso", className: "btn-secondary" },
  };

  const cfg = config[accion];
  if (!cfg) return null;

  return (
    <button
      disabled={loading}
      onClick={() => fichar(accion)}
      className={`${cfg.className} w-full py-4 text-lg disabled:opacity-60`}
    >
      {loading ? "Registrando..." : cfg.label}
    </button>
  );
}
