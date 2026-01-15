"use client";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/services/api";
import "leaflet/dist/leaflet.css";

type FichajeRow = {
  id: string;
  nombre_empleado: string;
  fecha: string;
  tipo: string;
  sospecha_motivo?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
};

export default function SospechososPage() {
  const [fichajes, setFichajes] = useState<FichajeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setAuthToken(token);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/fichajes/sospechosos");
      setFichajes(res.data || []);
    } catch (e) {
      console.error("Error cargando sospechosos", e);
      setFichajes([]);
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id: string) {
    try {
      const res = await api.get(`/fichajes/sospechosos/${id}`);
      setDetalle(res.data);
      setSelectedId(id);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar el detalle");
    }
  }

  async function validar(id: string, accion: "confirmar" | "rechazar") {
    try {
      await api.patch(`/fichajes/sospechosos/${id}`, { accion });
      // refresca lista y cierra modal si el que estás viendo es ese
      await load();
      if (selectedId === id) {
        setSelectedId(null);
        setDetalle(null);
      }
    } catch (e) {
      console.error(e);
      alert("Error actualizando fichaje");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Mapa: usa coords de IP actual si existen
  useEffect(() => {
    if (!detalle?.ip_info?.actual?.lat || !detalle?.ip_info?.actual?.lng)
      return;

    let map: any = null;

    (async () => {
      const L = await import("leaflet");

      const mapContainer = document.getElementById("map");
      if (mapContainer) mapContainer.innerHTML = "";

      map = L.map("map").setView(
        [detalle.ip_info.actual.lat, detalle.ip_info.actual.lng],
        9
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      L.marker([detalle.ip_info.actual.lat, detalle.ip_info.actual.lng])
        .addTo(map)
        .bindPopup("Ubicación actual (IP)");

      if (detalle.ip_info?.habitual?.lat && detalle.ip_info?.habitual?.lng) {
        L.marker([detalle.ip_info.habitual.lat, detalle.ip_info.habitual.lng], {
          icon: L.icon({
            iconUrl:
              "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
            iconSize: [24, 24],
          }),
        })
          .addTo(map)
          .bindPopup("Ubicación habitual (IP)");
      }
    })();

    return () => {
      try {
        if (map) map.remove();
      } catch {}
    };
  }, [detalle]);

  const renderDireccion = (x: any) => {
    const d = x?.direccion || null;
    const c = x?.ciudad || null;
    const p = x?.pais || null;

    const line = [d, c, p].filter(Boolean).join(" · ");
    return line || "Sin ubicación";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-red-600">
        Fichajes sospechosos
      </h1>

      {loading ? (
        <p>Cargando...</p>
      ) : fichajes.length === 0 ? (
        <p>No hay fichajes sospechosos.</p>
      ) : (
        <>
          <p className="mb-4">Total: {fichajes.length}</p>

          <table className="w-full bg-white border rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Empleado</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Ubicación</th>
                <th className="p-3 text-left">Motivo</th>
                <th className="p-3 text-left">Acción</th>
              </tr>
            </thead>

            <tbody>
              {fichajes.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="p-3">{f.nombre_empleado}</td>
                  <td className="p-3">
                    {new Date(f.fecha).toLocaleString("es-ES")}
                  </td>
                  <td className="p-3">{f.tipo}</td>

                  <td className="p-3">{renderDireccion(f)}</td>

                  <td className="p-3 text-red-600">
                    {(f as any).sospecha_motivo || f.sospecha_motivo || "-"}
                  </td>

                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => verDetalle(f.id)}
                        className="px-3 py-1 bg-neutral-700 text-white rounded"
                      >
                        Ver detalle
                      </button>

                      <button
                        onClick={() => validar(f.id, "confirmar")}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                      >
                        Confirmar
                      </button>

                      <button
                        onClick={() => validar(f.id, "rechazar")}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {selectedId && detalle ? (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded p-6 w-[740px] max-w-[95vw]">
            <h2 className="text-xl font-bold mb-3 text-red-600">
              Detalle fichaje sospechoso
            </h2>

            <p>
              <b>Empleado:</b>{" "}
              {detalle.empleado_nombre || detalle.nombre_empleado}
            </p>
            <p>
              <b>Fecha:</b>{" "}
              {detalle.fecha
                ? new Date(detalle.fecha).toLocaleString("es-ES")
                : "-"}
            </p>
            <p>
              <b>Tipo:</b> {detalle.tipo || "-"}
            </p>

            <p className="mt-2">
              <b>Ubicación:</b> {renderDireccion(detalle)}
            </p>

            <hr className="my-3" />

            <p>
              <b>IP Actual:</b> {detalle.ip_info?.actual?.ip || "-"}
            </p>
            <p>
              <b>Ciudad (IP):</b> {detalle.ip_info?.actual?.city || "-"}
            </p>
            <p>
              <b>País (IP):</b> {detalle.ip_info?.actual?.country || "-"}
            </p>

            <p className="mt-2">
              <b>IP Habitual:</b> {detalle.ip_info?.habitual?.ip || "-"}
            </p>

            <p className="mt-2 text-red-600 font-bold">
              Distancia estimada:{" "}
              {detalle.distancia_km
                ? Number(detalle.distancia_km).toFixed(1)
                : "N/A"}{" "}
              km
            </p>

            {detalle?.ip_info?.actual?.lat && detalle?.ip_info?.actual?.lng ? (
              <div
                id="map"
                style={{ height: 300, width: "100%", marginTop: 10 }}
              />
            ) : (
              <div className="mt-3 p-3 bg-gray-100 rounded text-sm text-gray-700">
                No hay coordenadas suficientes para mostrar el mapa.
              </div>
            )}

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-4 py-2 bg-gray-400 rounded"
                onClick={() => {
                  setSelectedId(null);
                  setDetalle(null);
                }}
              >
                Cerrar
              </button>

              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() => validar(selectedId, "confirmar")}
              >
                Confirmar
              </button>

              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={() => validar(selectedId, "rechazar")}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
