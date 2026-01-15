// app180-frontend\app\empleado\dashboard\useEstadoFichaje.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";

export function useEstadoFichaje() {
  const [accion, setAccion] = useState<AccionFichaje | null>(null);
  const [estado, setEstado] = useState<"fuera" | "dentro" | "descanso" | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/fichajes/estado");

      const acciones: AccionFichaje[] = res.data?.acciones_permitidas || [];

      setAccion(acciones.length ? acciones[0] : null);
      setEstado(res.data?.estado ?? null);
    } catch (e) {
      console.error("Error cargando estado fichaje", e);
      setAccion(null);
      setEstado(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { accion, estado, loading, reload: load };
}
