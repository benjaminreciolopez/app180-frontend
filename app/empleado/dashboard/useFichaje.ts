"use client";

import { useState } from "react";
import { api } from "@/services/api";

export type AccionFichaje =
  | "entrada"
  | "salida"
  | "descanso_inicio"
  | "descanso_fin";

export function useFichaje(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  async function fichar(tipo: AccionFichaje) {
    if (loading) return;

    setLoading(true);
    try {
      await api.post("/fichar", { tipo });
      onSuccess?.();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "No se pudo registrar el fichaje";
      alert(msg); // luego lo sustituimos por toast
    } finally {
      setLoading(false);
    }
  }

  return { fichar, loading };
}
