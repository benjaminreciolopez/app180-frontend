// app180-frontend/app/admin/trabajos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { getUser } from "@/services/auth";
import TableTrabajos, { WorkLogItem } from "@/components/shared/TableTrabajos";
import FormTrabajos from "@/components/shared/FormTrabajos";
import { Plus, X, RefreshCw } from "lucide-react";
import { UniversalExportButton } from "@/components/shared/UniversalExportButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";


export default function AdminTrabajosPage() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [items, setItems] = useState<WorkLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Catalogos
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedItem, setSelectedItem] = useState<WorkLogItem | null>(null);
  const [isGrouped, setIsGrouped] = useState(true); // Default grouped view

  async function loadData() {
    setLoading(true);
    try {
      // Si fechas vacías, enviamos undefined o strings vacios. 
      // El backend debe soportarlo (requerirá ajuste si por defecto filtra hoy)
      const params: any = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const res = await api.get("/worklogs/admin", { params });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogos() {
    try {
      const user = getUser();
      const hasEmpleadosModule = user?.modulos?.empleados !== false;

      const [eRes, cRes] = await Promise.allSettled([
        api.get("/employees"),
        api.get("/admin/clientes"), 
      ]);

      if (eRes.status === 'fulfilled' && Array.isArray(eRes.value.data)) {
        let lista = eRes.value.data;
        if (!hasEmpleadosModule && user?.id) {
          lista = lista.filter((emp: any) => 
            emp.user_id && String(emp.user_id) === String(user.id)
          );
        }
        setEmpleados(lista);
      } else {
        setEmpleados([]);
      }

      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value.data)) {
        setClientes(cRes.value.data);
      } else {
        setClientes([]);
      }
    } catch (err) {
      console.error("Error cargando catálogos", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/worklogs/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el trabajo");
    }
  }

  import { toast } from "sonner";

  // ... (existing imports)

  async function rxecuteRecalculation() {
      setLoading(true);
      const toastId = toast.loading("Recalculando trabajos...");
      
      try {
          const res = await api.put("/worklogs/fix-values");
          
          // Backend returns { fixed: number, total_checked: number }
          const { fixed, total_checked } = res.data || {};
          
          toast.success(`Proceso finalizado`, {
              id: toastId,
              description: `Revisados: ${total_checked}. Actualizados: ${fixed}`,
              duration: 5000,
          });
          
          loadData();
      } catch (e: any) {
          console.error(e);
          toast.error("Error al recalcular", {
              id: toastId,
              description: e.response?.data?.error || e.message
          });
      } finally {
          setLoading(false);
      }
  }

  function handleRecalculate() {
     toast("¿Recalcular importes a 0€?", {
        description: "Esto buscará en todo el historial y aplicará la tarifa actual del cliente.",
        action: {
          label: "Confirmar",
          onClick: () => rxecuteRecalculation(),
        },
        cancel: {
            label: "Cancelar",
            onClick: () => console.log("Cancelado"),
        }
     });
  }

  function handleEdit(item: WorkLogItem) {
    setSelectedItem(item);
    setFormMode('edit');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleClone(item: WorkLogItem) {
    setSelectedItem(item);
    setFormMode('clone');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  return (
    <div className="app-main space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Trabajos</h1>
          <p className="text-gray-500 text-sm">
            Registro y control de tiempos por cliente y empleado
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
            <UniversalExportButton 
                module="trabajos" 
                queryParams={{ desde, hasta }} 
                label="Exportar"
            />
           <div className="flex items-center gap-2 bg-white border rounded-lg p-1 px-2">
            <span className="text-xs text-gray-500 font-medium">Desde</span>
            <input
              type="date"
              className="text-sm outline-none bg-transparent"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white border rounded-lg p-1 px-2">
            <span className="text-xs text-gray-500 font-medium">Hasta</span>
             <input
              type="date"
              className="text-sm outline-none bg-transparent"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          
           <button 
             onClick={() => setIsGrouped(!isGrouped)}
             className={`px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${isGrouped ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
             title={isGrouped ? "Cambiar a vista de lista" : "Cambiar a vista agrupada"}
           >
             {isGrouped ? "Agrupado" : "Lista"}
           </button>

          {(desde || hasta) && (
            <button 
              onClick={() => { setDesde(""); setHasta(""); }}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
            >
              x
            </button>
          )}
          
          <button 
             onClick={handleRecalculate}
             className="px-3 py-2 border rounded-lg text-xs font-medium bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-2"
             title="Recalcular importes de trabajos a 0€"
          >
             <RefreshCw size={14}/> Recalcular 0€
          </button>

          <button 
            onClick={() => {
              if (showForm) {
                setSelectedItem(null);
                setFormMode('create');
              }
              setShowForm(!showForm);
            }}
            className={`btn px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            {showForm ? <><X size={16}/> Cancelar</> : <><Plus size={16}/> Crear Trabajo</>}
          </button>
        </div>
      </div>

      {/* Formulario Creación (Collapsible) */}
      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-200">
          <FormTrabajos
            isAdmin={true}
            empleados={empleados}
            clientes={clientes}
            initialData={selectedItem}
            mode={formMode}
            onCancel={() => {
              setShowForm(false);
              setSelectedItem(null);
              setFormMode('create');
            }}
            onCreated={() => {
              loadData();
              setShowForm(false);
              setSelectedItem(null);
              setFormMode('create');
            }}
          />
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="py-12">
            <LoadingSpinner />
        </div>
      ) : (
        <TableTrabajos 
          items={items} 
          isAdmin={true} 
          enableGrouping={isGrouped} 
          onDelete={handleDelete}
          onEdit={handleEdit}
          onClone={handleClone}
        />
      )}
    </div>
  );
}
