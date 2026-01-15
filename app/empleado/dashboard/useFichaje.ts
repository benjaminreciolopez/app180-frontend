// app180-frontend\app\empleado\dashboard\useFichaje.ts

import { useState } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";

export function useFichaje(reload: () => void) {
  const [loading, setLoading] = useState(false);

  async function fichar(accion: AccionFichaje) {
    setLoading(true);
    try {
      await api.post("/fichajes", {
        tipo: accion,
      });
      reload();
    } catch (err) {
      console.error("Error fichando", err);
      alert("No se ha podido registrar el fichaje");
    } finally {
      setLoading(false);
    }
  }

  return { fichar, loading };
}
