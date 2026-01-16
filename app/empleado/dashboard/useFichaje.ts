import { useState } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";
import { getCurrentPosition } from "@/hooks/useGeolocation";

export function useFichaje(reload: () => void) {
  const [loading, setLoading] = useState(false);

  async function fichar(accion: AccionFichaje) {
    setLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
      } catch (err) {
        console.warn("No se pudo obtener GPS, se usará IP", err);
      }

      await api.post("/fichajes", {
        tipo: accion,
        lat,
        lng,
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
