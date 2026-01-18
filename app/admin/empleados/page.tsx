// app180-frontend/app/admin/empleados/page.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import Link from "next/link";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  dispositivo_activo: boolean | null;
  device_hash: string | null;

  plantilla_id: string | null;
  plantilla_nombre: string | null;
}

export default function EmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  async function loadEmpleados() {
    try {
      const res = await api.get("/employees");
      setEmpleados(res.data || []);
    } catch (err) {
      console.error("Error cargando empleados", err);
    }

    setLoading(false);
  }
  async function cambiarEstadoEmpleado(id: string, activo: boolean) {
    if (
      !confirm(
        activo
          ? "¿Seguro que quieres ACTIVAR este empleado?"
          : "¿Seguro que quieres DESACTIVAR este empleado?"
      )
    ) {
      return;
    }

    try {
      await api.put(`/employees/${id}/status`, { activo }); // ✅ FIX
      await loadEmpleados();
    } catch (err) {
      console.error("Error cambiando estado del empleado", err);
      alert("No se pudo actualizar el estado");
    }
  }
  useEffect(() => {
    if (!openMenuId) {
      setLoadingInviteId(null);
    }
  }, [openMenuId]);

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
    <div className="app-main">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Empleados</h1>

        <button
          type="button"
          className="btn-primary w-fit"
          onClick={() => (window.location.href = "/admin/empleados/nuevo")}
        >
          + Nuevo empleado
        </button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="table min-w-[750px]">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Jornada</th>
              <th>Dispositivo</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {empleados.map((e) => (
              <tr key={e.id}>
                <td>{e.nombre}</td>
                <td>{e.email}</td>

                <td>
                  {e.activo ? (
                    <span className="badge-success">Activo</span>
                  ) : (
                    <span className="badge-danger">Inactivo</span>
                  )}
                </td>
                <td>
                  {e.plantilla_nombre ? (
                    <span className="badge-info">{e.plantilla_nombre}</span>
                  ) : (
                    <span className="badge-muted">Sin jornada</span>
                  )}
                </td>

                <td>
                  {!e.device_hash && (
                    <span className="badge-danger">Sin dispositivo</span>
                  )}

                  {e.device_hash && e.dispositivo_activo && (
                    <span className="badge-success">Activo</span>
                  )}

                  {e.device_hash && !e.dispositivo_activo && (
                    <span className="badge-warning">Bloqueado</span>
                  )}
                </td>

                <td className="text-right whitespace-nowrap">
                  <div className="inline-block relative">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(ev) => {
                        ev.stopPropagation();

                        const rect = ev.currentTarget.getBoundingClientRect();

                        if (openMenuId === e.id) {
                          setOpenMenuId(null);
                          setMenuPos(null);
                        } else {
                          setOpenMenuId(e.id);
                          setMenuPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.right + window.scrollX,
                          });
                        }
                      }}
                    >
                      Opciones
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL INVITACIÓN */}
      {inviteUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="card max-w-lg w-full space-y-4">
            <h2 className="text-xl font-bold">Invitación generada</h2>

            <input
              value={inviteUrl}
              readOnly
              className="input w-full"
              onClick={(e) => e.currentTarget.select()}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                }}
                className="btn-primary"
              >
                Copiar
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteUrl)}`}
                target="_blank"
                className="btn-secondary"
              >
                WhatsApp
              </a>

              <button
                type="button"
                onClick={() => setInviteUrl(null)}
                className="btn-outline ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {openMenuId && menuPos && (
        <div
          className="fixed z-[9999]"
          style={{
            top: menuPos.top,
            left: menuPos.left - 224, // ancho del menú (w-56)
          }}
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="bg-card shadow-lg border border-border rounded-md w-56">
            {(() => {
              const e = empleados.find((x) => x.id === openMenuId);
              if (!e) return null;

              return (
                <>
                  <button
                    type="button"
                    disabled={loadingInviteId === e.id}
                    onClick={async () => {
                      setLoadingInviteId(e.id);
                      try {
                        const res = await api.post(`/employees/${e.id}/invite`);
                        setInviteUrl(res.data.installUrl);
                      } catch {
                        alert("No se pudo generar la invitación");
                      } finally {
                        setLoadingInviteId(null);
                      }
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-muted"
                  >
                    {loadingInviteId === e.id
                      ? "Generando invitación..."
                      : "Invitar / Reenviar"}
                  </button>

                  <button
                    type="button"
                    disabled={loadingInviteId === e.id}
                    onClick={async () => {
                      setLoadingInviteId(e.id);
                      const res = await api.post(
                        `/employees/${e.id}/invite?tipo=cambio`
                      );
                      setInviteUrl(res.data.installUrl);
                      setOpenMenuId(null);
                      setMenuPos(null);
                      setLoadingInviteId(null);
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-muted text-orange-600"
                  >
                    Autorizar cambio dispositivo
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setOpenMenuId(null);
                      setMenuPos(null);
                      await cambiarEstadoEmpleado(e.id, !e.activo);
                    }}
                    className={`block w-full text-left px-3 py-2 hover:bg-muted ${
                      e.activo ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {e.activo ? "Desactivar empleado" : "Activar empleado"}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
