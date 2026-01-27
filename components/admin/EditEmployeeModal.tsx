import { useState, useEffect } from "react";
import { api } from "@/services/api";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empleado: {
    id: string;
    nombre: string;
    cliente_defecto_id: string | null;
  };
}

export default function EditEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  empleado,
}: EditEmployeeModalProps) {
  const [nombre, setNombre] = useState(empleado.nombre);
  const [clienteId, setClienteId] = useState(empleado.cliente_defecto_id || "");
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    // Cargar clientes para el selector
    api.get("/admin/clientes")
      .then((res) => {
        setClientes(res.data || []);
      })
      .catch((err) => console.error("Error cargando clientes", err))
      .finally(() => setLoadingClientes(false));
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/employees/${empleado.id}`, {
        nombre,
        cliente_defecto_id: clienteId || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error updating employee", err);
      alert("No se pudo actualizar el empleado");
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
            <label className="block text-sm font-medium mb-1">
              Cliente por Defecto (Geolocalización)
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Si se asigna, se usará para validar fichajes cuando no haya una jornada específica con cliente.
            </p>
            {loadingClientes ? (
              <p className="text-sm text-muted-foreground">Cargando clientes...</p>
            ) : (
              <select
                className="input w-full"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">-- Sin cliente asignado --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.codigo})
                  </option>
                ))}
              </select>
            )}
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
