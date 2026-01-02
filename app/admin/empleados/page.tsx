"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import Link from "next/link";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  turno_nombre: string | null;
  dispositivo_activo: boolean | null;
  device_hash: string | null;
}

export default function EmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
      setEmpleados(res.data || []);
    } catch (err) {
      console.error("Error cargando empleados", err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>

      <div className="flex justify-between mb-4">
        <p>Total: {empleados.length}</p>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => (window.location.href = "/admin/empleados/nuevo")}
        >
          + Nuevo empleado
        </button>
      </div>

      <table className="w-full bg-white border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Dispositivo</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {empleados.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="p-3">{e.nombre}</td>
              <td className="p-3">{e.email}</td>

              {/* ESTADO EMPLEADO */}
              <td className="p-3">
                {e.activo ? (
                  <span className="text-green-600 font-semibold">Activo</span>
                ) : (
                  <span className="text-red-600 font-semibold">Inactivo</span>
                )}
              </td>

              {/* ESTADO DISPOSITIVO */}
              <td className="p-3">
                {!e.device_hash && (
                  <span className="text-red-600">Sin dispositivo</span>
                )}

                {e.device_hash && e.dispositivo_activo && (
                  <span className="text-green-600 font-semibold">Activo</span>
                )}

                {e.device_hash && !e.dispositivo_activo && (
                  <span className="text-orange-600 font-semibold">
                    Bloqueado
                  </span>
                )}
              </td>

              {/* ACCIONES */}
              <td className="p-3 whitespace-nowrap">
                <Link
                  href={`/admin/empleados/${e.id}/turno`}
                  className="px-3 py-1 bg-purple-600 text-white rounded"
                >
                  Asignar turno
                </Link>

                <div className="inline-block relative ml-2">
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setOpenMenuId(openMenuId === e.id ? null : e.id);
                    }}
                  >
                    Opciones
                  </button>

                  {openMenuId === e.id && (
                    <div
                      className="absolute bg-white shadow border rounded mt-2 w-56 z-50"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <button
                        disabled={loadingInviteId === e.id}
                        onClick={async () => {
                          setLoadingInviteId(e.id);
                          const res = await api.post(
                            `/employees/${e.id}/invite`
                          );
                          setInviteUrl(res.data.installUrl);
                          setOpenMenuId(null);
                          setLoadingInviteId(null);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {loadingInviteId === e.id
                          ? "Generando invitación..."
                          : "Invitar / Reenviar invitación"}
                      </button>

                      <button
                        disabled={loadingInviteId === e.id}
                        onClick={async () => {
                          setLoadingInviteId(e.id);
                          const res = await api.post(
                            `/employees/${e.id}/invite?tipo=cambio`
                          );
                          setInviteUrl(res.data.installUrl);
                          setOpenMenuId(null);
                          setLoadingInviteId(null);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-orange-600 disabled:opacity-50"
                      >
                        {loadingInviteId === e.id
                          ? "Autorizando..."
                          : "Autorizar cambio de dispositivo"}
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {inviteUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-lg w-full space-y-4">
            <h2 className="text-xl font-bold">Invitación generada</h2>

            <p>Envía este enlace al empleado para que instale la app:</p>

            <input
              value={inviteUrl}
              readOnly
              className="w-full border px-3 py-2 rounded bg-gray-100"
              onClick={(e) => e.currentTarget.select()}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  alert("Copiado al portapapeles");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Copiar enlace
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteUrl)}`}
                target="_blank"
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Enviar por WhatsApp
              </a>

              <button
                onClick={() => setInviteUrl(null)}
                className="ml-auto px-4 py-2 bg-gray-400 text-white rounded"
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
