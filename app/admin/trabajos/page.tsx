// app180-frontend/app/admin/trabajos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import TableTrabajos, { WorkLogItem } from "@/components/shared/TableTrabajos";
import FormTrabajos from "@/components/shared/FormTrabajos";
import { Plus, X } from "lucide-react";

function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminTrabajosPage() {
  const [desde, setDesde] = useState(ymd());
  const [hasta, setHasta] = useState(ymd());

  const [items, setItems] = useState<WorkLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Catalogos
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);

  // UI State
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get("/admin/worklogs", { params: { desde, hasta } });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogos() {
    try {
      const [eRes, cRes, wRes] = await Promise.all([
        api.get("/employees"), 
        api.get("/admin/clientes"), 
        api.get("/work-items") // Asumimos endpoint público o admin compatible
      ]);
      setEmpleados(Array.isArray(eRes.data) ? eRes.data : []);
      setClientes(Array.isArray(cRes.data) ? cRes.data : []);
      setWorkItems(Array.isArray(wRes.data) ? wRes.data : []);
    } catch (err) {
      console.error("Error cargando catálogos", err);
    }
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
            onClick={() => setShowForm(!showForm)}
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
            workItems={workItems}
            onCreated={() => {
              loadData();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando datos...</div>
      ) : (
        <TableTrabajos items={items} isAdmin={true} />
      )}
    </div>
  );
}
