// app/empleado/dashboard/useEstadoFichaje.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";

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

export function useEstadoFichaje() {
  const [estado, setEstado] = useState<"fuera" | "dentro" | "descanso" | null>(
    null
  );
  const [boton, setBoton] = useState<BotonEstado | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/fichajes/estado");

      setEstado(res.data?.estado ?? null);
      setBoton(res.data?.boton ?? null);
    } catch (e) {
      console.error("Error cargando estado fichaje", e);
      setEstado(null);
      setBoton(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { estado, boton, loading, reload: load };
}
