"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";

type Plantilla = { id: string; nombre: string };
type Empleado = { id: string; nombre: string };
type Cliente = { id: string; nombre: string };

export default function DrawerCrearPlaningAdmin({
  fechaDefault,
  empleadoDefaultId,
  empleados = [],
  onClose,
  onCreated,
}: {
  fechaDefault?: string;
  empleadoDefaultId?: string;
  empleados?: Empleado[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);

  const [empleadoSel, setEmpleadoSel] = useState(empleadoDefaultId || "");
  const [plantillaSel, setPlantillaSel] = useState("");
  const [clienteSel, setClienteSel] = useState("");
  const [fechaInicio, setFechaInicio] = useState(fechaDefault || new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rp, rc] = await Promise.all([
          api.get("/admin/plantillas"),
          api.get("/admin/clientes"),
        ]);
        setPlantillas(Array.isArray(rp.data) ? rp.data : []);
        setClientes(Array.isArray(rc.data) ? rc.data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBase(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!plantillaSel || !fechaInicio) {
      showError("Plantilla y fecha de inicio obligatorias");
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/plantillas/asignar", {
        empleado_id: empleadoSel || null,
        plantilla_id: plantillaSel,
        cliente_id: clienteSel || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
      });
      showSuccess("Planing creado correctamente");
      onCreated();
      onClose();
    } catch (e: any) {
      showError(e.response?.data?.error || "Error al crear planing");
    } finally {
      setSaving(false);
    }
  }

  if (loadingBase) return <div className="p-6 text-center text-sm">Cargando datos...</div>;

  return (
    <div className="p-4 space-y-4 pb-10">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold mb-1">Empleado</label>
          <select
            className="w-full border p-2 rounded-xl bg-gray-50 text-sm"
            value={empleadoSel}
            onChange={(e) => setEmpleadoSel(e.target.value)}
          >
            <option value="">(Para el Administrador)</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Plantilla de Horario</label>
          <select
            className="w-full border p-2 rounded-xl text-sm"
            value={plantillaSel}
            onChange={(e) => setPlantillaSel(e.target.value)}
          >
            <option value="">-- Selecciona --</option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Centro / Cliente Principal (Opcional)</label>
          <select
            className="w-full border p-2 rounded-xl text-sm"
            value={clienteSel}
            onChange={(e) => setClienteSel(e.target.value)}
          >
            <option value="">-- Por defecto --</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">
            Si la plantilla tiene bloques con clientes específicos, prevalecerán sobre este.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Fecha Inicio</label>
            <input
              type="date"
              className="w-full border p-2 rounded-xl text-sm"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fecha Fin (Opc.)</label>
            <input
              type="date"
              className="w-full border p-2 rounded-xl text-sm"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-2">
        <button
          disabled={saving}
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear / Asignar Planing"}
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border border-black/10 text-sm font-semibold active:bg-black/5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
