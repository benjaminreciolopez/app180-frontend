"use client";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/services/api";
import "leaflet/dist/leaflet.css";

function fmtLugar(ip: any) {
  if (!ip) return "—";
  const parts = [ip.city, ip.region, ip.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export default function SospechososPage() {
  const [fichajes, setFichajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    setAuthToken(token);
  }, []);

  async function load() {
    try {
      const res = await api.get("/fichajes/sospechosos");
      setFichajes(res.data || []);
    } catch (e) {
      console.error("Error cargando sospechosos", e);
    }
    setLoading(false);
  }

  async function verDetalle(id: string) {
    try {
      const res = await api.get(`/fichajes/sospechosos/${id}`);
      setDetalle(res.data);
      setSelected(true);
    } catch {
      alert("No se pudo cargar el detalle");
    }
  }

  async function validar(id: string, accion: "confirmar" | "rechazar") {
    try {
      await api.patch(`/fichajes/sospechosos/${id}`, {
        accion,
        motivo: motivo || null,
      });

      setMotivo("");
      setSelected(false);
      setDetalle(null);
      load();
    } catch {
      alert("Error actualizando fichaje");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // MAPA SOLO SI HAY COORDENADAS
  useEffect(() => {
    if (!detalle?.ipInfo?.actual?.lat || !detalle?.ipInfo?.actual?.lng) return;

    (async () => {
      const L = await import("leaflet");
      const mapContainer = document.getElementById("map");
      if (!mapContainer) return;
      mapContainer.innerHTML = "";

      const map = L.map("map").setView(
        [detalle.ipInfo.actual.lat, detalle.ipInfo.actual.lng],
        8
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      L.marker([detalle.ipInfo.actual.lat, detalle.ipInfo.actual.lng])
        .addTo(map)
        .bindPopup("Ubicación IP actual");

      if (detalle.ipInfo?.habitual?.lat && detalle.ipInfo?.habitual?.lng) {
        L.marker([detalle.ipInfo.habitual.lat, detalle.ipInfo.habitual.lng])
          .addTo(map)
          .bindPopup("Ubicación IP habitual");
      }

      return () => {
        map.remove();
      };
    })();
  }, [detalle]);

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
                <th className="p-3 text-left">Motivo</th>
                <th className="p-3 text-left">Acción</th>
              </tr>
            </thead>

            <tbody>
              {fichajes.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="p-3">{f.nombre_empleado}</td>
                  <td className="p-3">{f.fecha}</td>
                  <td className="p-3">{f.tipo}</td>
                  <td className="p-3 text-red-600">{f.sospecha_motivo}</td>

                  <td className="p-3 flex gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {selected && detalle && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center">
          <div className="bg-white rounded p-6 w-[700px]">
            <h2 className="text-xl font-bold mb-3 text-red-600">
              Detalle fichaje sospechoso
            </h2>

            <p>
              <b>Empleado:</b> {detalle.empleado_nombre}
            </p>
            <p>
              <b>Fecha:</b> {detalle.fecha}
            </p>
            <p>
              <b>Tipo:</b> {detalle.tipo}
            </p>

            <hr className="my-3" />

            <p>
              <b>IP Actual:</b> {detalle.ipInfo?.actual?.ip || "—"}
            </p>
            <p>
              <b>Ubicación:</b> {fmtLugar(detalle.ipInfo?.actual)}
            </p>
            <p>
              <b>Proveedor:</b> {detalle.ipInfo?.actual?.provider || "—"}
            </p>

            <p className="mt-2">
              <b>IP Habitual:</b> {detalle.ipInfo?.habitual?.ip || "—"}
            </p>
            <p>
              <b>Ubicación habitual:</b> {fmtLugar(detalle.ipInfo?.habitual)}
            </p>
            <p>
              <b>Proveedor:</b> {detalle.ipInfo?.habitual?.provider || "—"}
            </p>

            <p className="mt-2 text-red-600 font-bold">
              Distancia estimada:{" "}
              {typeof detalle.distanciaKm === "number"
                ? `${detalle.distanciaKm.toFixed(1)} km`
                : "No disponible"}
            </p>

            {detalle.ipInfo?.actual?.lat && (
              <div
                id="map"
                style={{ height: 300, width: "100%", marginTop: 10 }}
              ></div>
            )}

            <textarea
              placeholder="Motivo (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border p-2 mt-4 rounded"
            />

            <div className="flex justify-between mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => validar(detalle.id, "confirmar")}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Confirmar
                </button>

                <button
                  onClick={() => validar(detalle.id, "rechazar")}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Rechazar
                </button>
              </div>

              <button
                className="px-4 py-2 bg-gray-400 rounded"
                onClick={() => {
                  setSelected(false);
                  setDetalle(null);
                  setMotivo("");
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
