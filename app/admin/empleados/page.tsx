// app180-frontend/app/admin/empleados/page.tsx

"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import ShareInviteLinkModal from "@/components/admin/ShareInviteLinkModal";
import EditEmployeeModal from "@/components/admin/EditEmployeeModal";

interface Empleado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  dispositivo_activo: boolean | null;
  device_hash: string | null;

  plantilla_id: string | null;
  plantilla_nombre: string | null;
  
  cliente_defecto_id: string | null;
  cliente_defecto_nombre: string | null;
}

export default function EmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  
  // Estado para ShareInviteLinkModal
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [currentEmpleadoId, setCurrentEmpleadoId] = useState<string | null>(null);
  const [inviteTipo, setInviteTipo] = useState<"nuevo" | "cambio">("nuevo");

  // Estado para EditEmployeeModal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Empleado | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

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
          : "¿Seguro que quieres DESACTIVAR este empleado?",
      )
    ) {
      return;
    }

    try {
      await api.put(`/employees/${id}/status`, { activo });
      await loadEmpleados();
    } catch (err) {
      console.error("Error cambiando estado del empleado", err);
      alert("No se pudo actualizar el estado");
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    const close = () => {
      setOpenMenuId(null);
      setMenuPos(null);
      setLoadingInviteId(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function handleCloseShareModal() {
    setShowShareModal(false);
    setInviteData(null);
    setCurrentEmpleadoId(null);
    loadEmpleados();
  }

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
              <th>Nombre_</th>
              <th>Cliente Defecto</th>
              <th>Estado</th>
              <th>Jornada</th>
              <th>Dispositivo</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {empleados.map((e) => (
              <tr key={e.id}>
                <td>
                    <div className="font-medium">{e.nombre}</div>
                    <div className="text-xs text-muted-foreground">{e.email}</div>
                </td>
                <td>
                    {e.cliente_defecto_nombre ? (
                        <span className="badge-primary">{e.cliente_defecto_nombre}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                    )}
                </td>

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

      {/* MODAL COMPARTIR INVITACIÓN */}
      {showShareModal && inviteData && currentEmpleadoId && (
        <ShareInviteLinkModal
          isOpen={showShareModal}
          onClose={handleCloseShareModal}
          inviteData={inviteData}
          empleadoId={currentEmpleadoId}
          tipo={inviteTipo}
        />
      )}
      
      {/* MODAL EDITAR EMPLEADO */}
      {showEditModal && editingEmployee && (
        <EditEmployeeModal 
            isOpen={showEditModal}
            onClose={() => {
                setShowEditModal(false);
                setEditingEmployee(null);
            }}
            onSuccess={() => {
                loadEmpleados();
            }}
            empleado={editingEmployee}
        />
      )}

      {openMenuId && menuPos && (
        <div
          className="fixed z-[9999]"
          style={{
            top: menuPos.top,
            left: menuPos.left - 224,
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
                    className="block w-full text-left px-3 py-2 hover:bg-muted font-bold"
                    onClick={() => {
                        setEditingEmployee(e);
                        setShowEditModal(true);
                        setOpenMenuId(null);
                        setMenuPos(null);
                    }}
                  >
                    ✏️ Editar datos
                  </button>
                  
                  <div className="border-b border-border my-1"></div>

                  <button
                    type="button"
                    disabled={loadingInviteId === e.id}
                    onClick={async () => {
                      if (loadingInviteId === e.id) return;
                      setLoadingInviteId(e.id);
                      try {
                        const res = await api.post(
                          `/admin/employees/${e.id}/invite`,
                        );
                        setInviteData({
                          installUrl: res.data.installUrl,
                          expires_at: res.data.expires_at,
                          token: res.data.token,
                          empleado: {
                            nombre: e.nombre,
                            email: e.email,
                          },
                        });
                        setCurrentEmpleadoId(e.id);
                        setInviteTipo("nuevo");
                        setShowShareModal(true);
                        setOpenMenuId(null);
                        setMenuPos(null);
                      } catch (err: any) {
                        alert(
                          err?.response?.data?.error ||
                            "No se pudo generar la invitación",
                        );
                      } finally {
                        setLoadingInviteId(null);
                      }
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-muted"
                  >
                    {loadingInviteId === e.id
                      ? "Generando enlace..."
                      : "Invitar / Reenviar"}
                  </button>

                  <button
                    type="button"
                    disabled={loadingInviteId === e.id}
                    onClick={async () => {
                      if (loadingInviteId === e.id) return;
                      setLoadingInviteId(e.id);
                      try {
                        const res = await api.post(
                          `/admin/employees/${e.id}/invite?tipo=cambio`,
                        );
                        setInviteData({
                          installUrl: res.data.installUrl,
                          expires_at: res.data.expires_at,
                          token: res.data.token,
                          empleado: {
                            nombre: e.nombre,
                            email: e.email,
                          },
                        });
                        setCurrentEmpleadoId(e.id);
                        setInviteTipo("cambio");
                        setShowShareModal(true);
                        setOpenMenuId(null);
                        setMenuPos(null);
                      } catch (err: any) {
                        alert(
                          err?.response?.data?.error ||
                            "No se pudo autorizar el cambio",
                        );
                      } finally {
                        setLoadingInviteId(null);
                      }
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
                      e.activo ? "text-orange-600" : "text-green-600"
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
