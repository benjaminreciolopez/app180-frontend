"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import DrawerCrearPlaningAdmin from "@/components/admin/drawer/DrawerCrearPlaningAdmin";
import DrawerEditarPlaning from "@/components/admin/drawer/DrawerEditarPlaning";
import { useSearchParams } from "next/navigation";

// Interfaz para la tabla
interface Asignacion {
  id: string;
  empleado_id: string | null;
  empleado_nombre: string | null;
  plantilla_id: string;
  plantilla_nombre: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  alias: string | null;
  color: string | null;
  ignorar_festivos: boolean;
}

export default function PlaningsPage() {
  const [loading, setLoading] = useState(true);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [filtros, setFiltros] = useState({
      estado: 'activos', // 'activos' | 'historial'
      busqueda: ''
  });

  // Drawer edición/creación
  const [showDrawer, setShowDrawer] = useState(false);
  // Para editar, pasaremos datos al drawer.
  // Nota: DrawerCrearPlaningAdmin actualmente está pensado para crear desde calendario (recibiendo fechaStr y empleadoId).
  // Tendremos que adaptarlo o usar uno nuevo. Por ahora intentaré reutilizar o envolver.
  // Al abrir el drawer para "crear" desde aquí, no tenemos fecha preseleccionada.
  // Al "editar", necesitamos pre-rellenar.
  // Por simplicidad en V1, el botón "Nuevo" abrirá el drawer vacío.
  // "Editar" necesitará que el Drawer soporte `initialData`.

  // Estado para edición
  const [editingAsignacion, setEditingAsignacion] = useState<Asignacion | null>(null);

  // Estado para empleados
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string }[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resAsig, resEmp] = await Promise.all([
         api.get("/admin/plantillas/asignaciones", { params: { estado: filtros.estado } }),
         api.get("/employees")
      ]);
      setAsignaciones(resAsig.data || []);
      setEmpleados(Array.isArray(resEmp.data) ? resEmp.data : []);
    } catch (err) {
      console.error("Error cargando datos", err);
      showError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtros.estado]);

  // Filtrado local por texto (nombre empleado, alias, cliente, plantilla)
  const filtered = asignaciones.filter(a => {
      const search = filtros.busqueda.toLowerCase();
      const matchEmpleado = (a.empleado_nombre || "Sin Asignar (Admin/Vacante)").toLowerCase().includes(search);
      const matchPlantilla = (a.plantilla_nombre || "").toLowerCase().includes(search);
      const matchCliente = (a.cliente_nombre || "").toLowerCase().includes(search);
      const matchAlias = (a.alias || "").toLowerCase().includes(search);
      return matchEmpleado || matchPlantilla || matchCliente || matchAlias;
  });

  const borrarAsignacion = async (id: string) => {
      if(!confirm("¿Seguro que quieres eliminar este planing? Esta acción no se puede deshacer.")) return;
      
      try {
          await api.delete(`/admin/plantillas/asignaciones/${id}`);
          showSuccess("Planing eliminado");
          loadData();
      } catch(err) {
          showError("Error al eliminar");
      }
  }

  const handleEdit = (asignacion: Asignacion) => {
      // Como DrawerCrearPlaningAdmin espera props específicas de "Creación" (fecha, empleado),
      // y no está refactorizado para Edición completa aun, 
      // para esta iteración V5.5 voy a usar "Editar" para abrir un modal simple de edición de metadatos (Alias, Color, Fecha Fin)
      // o adaptar el Drawer.
      
      // Voy a optar por mostrar un Toast diciendo que la edición completa está en desarrollo si detecto conflicto,
      // pero el usuario pidió "poder editarlos... cambiar nombre, etc".
      // Así que implementaré un Drawer de Edición específico temporal O adaptaré el existente.
      
      // Estrategia: Guardar en estado `editingAsignacion` y renderizar un `DrawerEditarPlaning` (que crearé a continuación).
      setEditingAsignacion(asignacion);
  };

  return (
    <div className="app-main h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
        <div>
           <h1 className="text-2xl font-bold">Gestión de Planings</h1>
           <p className="text-muted-foreground text-sm">Control centralizado de asignaciones y trabajos</p>
        </div>

        <div className="flex gap-2">
           <button 
             className="btn-primary"
             onClick={() => setShowDrawer(true)}
           >
             + Nuevo Planing
           </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 items-center shrink-0">
         <div className="flex items-center gap-2 border rounded p-1 bg-card">
             <button 
                className={`px-3 py-1 rounded text-sm ${filtros.estado === 'activos' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                onClick={() => setFiltros({...filtros, estado: 'activos'})}
             >
                 Vigentes / Futuros
             </button>
             <button 
                className={`px-3 py-1 rounded text-sm ${filtros.estado === 'historial' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
                onClick={() => setFiltros({...filtros, estado: 'historial'})}
             >
                 Historial Pasado
             </button>
         </div>

         <input 
            type="text" 
            placeholder="Buscar por empleado, obra, alias..." 
            className="input max-w-xs"
            value={filtros.busqueda}
            onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
         />
      </div>

      <div className="card p-0 overflow-auto flex-1">
        <table className="table min-w-[900px]">
          <thead className="sticky top-0 bg-card z-10 shadow-sm">
            <tr>
              <th>Empleado</th>
              <th>Planing / Obra</th>
              <th>Cliente / Ubicación</th>
              <th>Fechas</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Cargando datos...</td></tr>
            ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No se encontraron planings</td></tr>
            ) : (
                filtered.map(asig => (
                    <tr key={asig.id} className="hover:bg-muted/50 group">
                        <td>
                            {asig.empleado_id ? (
                                <div className="font-medium">{asig.empleado_nombre}</div>
                            ) : (
                                <span className="badge-muted">Vacante / Admin</span>
                            )}
                        </td>
                        <td>
                            <div className="flex flex-col">
                                {asig.alias && (
                                    <span className="font-semibold text-primary" style={{ color: asig.color || undefined }}>
                                        {asig.alias}
                                    </span>
                                )}
                                <span className="text-sm text-muted-foreground">{asig.plantilla_nombre}</span>
                                {asig.ignorar_festivos && (
                                    <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded w-fit mt-0.5">Ignora Festivos</span>
                                )}
                            </div>
                        </td>
                        <td>
                             {asig.cliente_nombre ? (
                                 <div className="flex items-center gap-1">
                                     <span className="badge-outline">{asig.cliente_nombre}</span>
                                 </div>
                             ) : (
                                 <span className="text-muted-foreground text-xs">-</span>
                             )}
                        </td>
                        <td>
                            <div className="text-sm">
                                <div className="flex gap-1">
                                    <span className="text-muted-foreground">Desde:</span>
                                    <span className="font-mono">{new Date(asig.fecha_inicio).toLocaleDateString()}</span>
                                </div>
                                <div className="flex gap-1">
                                    <span className="text-muted-foreground">Hasta:</span>
                                    {asig.fecha_fin ? (
                                        <span className="font-mono">{new Date(asig.fecha_fin).toLocaleDateString()}</span>
                                    ) : (
                                        <span className="font-bold text-green-600">INDEFINIDO ♾️</span>
                                    )}
                                </div>
                            </div>
                        </td>
                        <td className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="btn-secondary btn-sm" onClick={() => handleEdit(asig)}>
                                    ✏️ Editar
                                </button>
                                <button className="btn-danger btn-sm" onClick={() => borrarAsignacion(asig.id)}>
                                    🗑️ Borrar
                                </button>
                            </div>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

       {showDrawer && (
           <DrawerCrearPlaningAdmin
               fechaDefault={new Date().toISOString().slice(0, 10)}
               empleados={empleados}
               onClose={() => setShowDrawer(false)}
               onCreated={() => {
                   setShowDrawer(false);
                   loadData();
                   showSuccess("Planing creado correctamente");
               }}
           />
       )}

       {editingAsignacion && (
           <DrawerEditarPlaning
               isOpen={!!editingAsignacion}
               onClose={() => setEditingAsignacion(null)}
               asignacion={editingAsignacion}
               onSuccess={() => {
                   setEditingAsignacion(null);
                   loadData();
                   showSuccess("Planing actualizado");
               }}
           />
       )}
    </div>
  );
}
