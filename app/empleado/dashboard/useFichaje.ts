import { useState } from "react";
import { api } from "@/services/api";
import type { AccionFichaje } from "./FichajeAction";
import { getCurrentPosition } from "@/hooks/useGeolocation";
import { checkGeoPermission } from "@/hooks/useGeoPermission";

export function useFichaje(reload: () => void) {
  const [loading, setLoading] = useState(false);

  async function fichar(accion: AccionFichaje) {
    setLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const perm = await checkGeoPermission();

        if (perm === "granted" || perm === "prompt") {
          const pos = await getCurrentPosition();
          lat = pos.lat;
          lng = pos.lng;
        }
      } catch (err) {
        console.warn("GPS no disponible, usando IP");
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
