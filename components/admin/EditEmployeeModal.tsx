import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { authenticatedFetch } from "@/utils/api";
import Link from "next/link";
import { showSuccess, showError } from "@/lib/toast";
import { Camera } from "lucide-react";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empleado: {
    id: string;
    nombre: string;
    email: string;
    foto_url?: string | null;
  };
}

export default function EditEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  empleado,
}: EditEmployeeModalProps) {
  const [nombre, setNombre] = useState(empleado.nombre);
  const [email, setEmail] = useState(empleado.email);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(empleado.foto_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await authenticatedFetch(`/api/admin/employees/${empleado.id}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPhotoPreview(data.foto_url);
        showSuccess("Foto actualizada");
      } else {
        showError("Error al subir foto");
      }
    } catch {
      showError("Error de conexión");
    }
    setUploadingPhoto(false);
    if (photoRef.current) photoRef.current.value = "";
  };

  const [clienteActual, setClienteActual] = useState<{
    nombre: string;
    codigo: string;
  } | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    // Cargar el cliente actual desde las asignaciones de Jornadas
    setLoadingCliente(true);
    api.get(`/admin/clientes/asignaciones/${empleado.id}`)
      .then((res) => {
        const asignaciones = res.data || [];
        // Buscar la asignación activa (fecha_fin es null)
        const activa = asignaciones.find((a: any) => !a.fecha_fin);
        if (activa && activa.cliente_nombre) {
          setClienteActual({
            nombre: activa.cliente_nombre,
            codigo: activa.cliente_codigo || "",
          });
        } else {
          setClienteActual(null);
        }
      })
      .catch((err) => {
        console.error("Error cargando cliente actual", err);
        setClienteActual(null);
      })
      .finally(() => setLoadingCliente(false));
  }, [isOpen, empleado.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double-click
    setLoading(true);

    try {
      await api.put(`/admin/employees/${empleado.id}`, {
        nombre,
        email,
      });
      showSuccess('Empleado actualizado correctamente');
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error updating employee", err);
      showError('No se pudo actualizar el empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">Editar Empleado</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Foto del empleado */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                  {empleado.nombre.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 transition-colors disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
                {uploadingPhoto ? "Subiendo..." : photoPreview ? "Cambiar foto" : "Subir foto"}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1">Se muestra en el kiosco para confirmar identidad</p>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              className="input w-full"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cliente Actual
            </label>
            <div className="bg-muted/30 border border-border rounded-lg p-3">
              {loadingCliente ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : clienteActual ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{clienteActual.nombre}</p>
                      {clienteActual.codigo && (
                        <p className="text-xs text-muted-foreground">Código: {clienteActual.codigo}</p>
                      )}
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500" title="Asignación activa" />
                  </div>
                  <Link
                    href="/admin/jornadas?tab=clientes"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    onClick={onClose}
                  >
                    Gestionar en Jornadas →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sin cliente asignado</p>
                  <Link
                    href="/admin/jornadas?tab=clientes"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    onClick={onClose}
                  >
                    Asignar en Jornadas →
                  </Link>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Las asignaciones de clientes se gestionan desde el módulo Jornadas
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

