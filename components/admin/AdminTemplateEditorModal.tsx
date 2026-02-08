import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { X, Save, Clock, Calendar, Plus } from "lucide-react";
import BloquesEditor from "@/app/admin/jornadas/BloquesEditor";
import type { Bloque, Plantilla, PlantillaDia } from "@/app/admin/jornadas/types";

interface AdminTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantillaId?: string;
  onSaved: (newPlantillaId?: string) => void;
}

const DIAS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
  { n: 7, label: "Domingo" },
];

function fromHHMMSS(v?: string | null) {
  if (!v) return "";
  return v.slice(0, 5);
}

function toHHMMSS(v: string) {
  if (!v) return v;
  return v.length === 5 ? `${v}:00` : v;
}

export default function AdminTemplateEditorModal({
  isOpen,
  onClose,
  plantillaId,
  onSaved,
}: AdminTemplateEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [dias, setDias] = useState<PlantillaDia[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  
  // Día seleccionado en el editor
  const [diaSemanaSel, setDiaSemanaSel] = useState<number>(1);
  const [diaHoraInicio, setDiaHoraInicio] = useState<string>("08:00");
  const [diaHoraFin, setDiaHoraFin] = useState<string>("18:00");
  const [diaActivo, setDiaActivo] = useState<boolean>(true);
  const [bloquesDia, setBloquesDia] = useState<Bloque[]>([]);

  // Clonación
  const [targetDays, setTargetDays] = useState<number[]>([]);
  const [cloning, setCloning] = useState(false);

  const diaSel = useMemo(() => {
    return dias.find((d) => d.dia_semana === diaSemanaSel) ?? null;
  }, [dias, diaSemanaSel]);

  useEffect(() => {
    if (isOpen) {
      if (plantillaId) {
        loadData(plantillaId);
      } else {
        setPlantilla(null);
        setDias([]);
        setBloquesDia([]);
        loadCatalogos();
      }
    }
  }, [isOpen, plantillaId]);

  async function loadCatalogos() {
    try {
      const res = await api.get("/admin/clientes");
      setClientes(res.data || []);
    } catch (err) {
      console.error("Error loading clients", err);
    }
  }

  async function loadData(id: string) {
    setLoading(true);
    try {
      const [res, resClientes] = await Promise.all([
        api.get(`/admin/plantillas/${id}`),
        api.get("/admin/clientes")
      ]);
      setPlantilla(res.data.plantilla);
      setDias(res.data.dias || []);
      setClientes(resClientes.data || []);
      
      // Cargar primer día por defecto (lunes)
      setDiaSemanaSel(1);
    } catch (err) {
      console.error("Error loading template details", err);
      showError("No se pudo cargar la información del horario");
    } finally {
      setLoading(false);
    }
  }

  // Al cambiar el día seleccionado, cargar sus bloques y rango
  useEffect(() => {
    if (!diaSel) {
      setDiaHoraInicio("08:00");
      setDiaHoraFin("18:00");
      setDiaActivo(true);
      setBloquesDia([]);
      return;
    }

    setDiaHoraInicio(fromHHMMSS(diaSel.hora_inicio) || "08:00");
    setDiaHoraFin(fromHHMMSS(diaSel.hora_fin) || "18:00");
    setDiaActivo(diaSel.activo ?? true);

    if (diaSel.id) {
      loadBloques(diaSel.id);
    } else {
      setBloquesDia([]);
    }
  }, [diaSemanaSel, diaSel]);

  async function loadBloques(diaId: string) {
    try {
      const res = await api.get(`/admin/plantillas/dias/${diaId}/bloques`);
      setBloquesDia(res.data || []);
    } catch (err) {
      console.error("Error loading blocks", err);
    }
  }

  const handleCreatePlantilla = async () => {
    const nombre = window.prompt("Nombre para tu nuevo horario:");
    if (!nombre) return;

    setLoading(true);
    try {
      const res = await api.post("/admin/plantillas", { nombre, tipo: "semanal" });
      const newPlantilla = res.data;
      setPlantilla(newPlantilla);
      // Recargar datos para tener los IDs de los días creados automáticamente por backend si existen
      loadData(newPlantilla.id);
    } catch (err) {
      showError("Error al crear la plantilla");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDay = async () => {
    if (!plantilla) {
      showError("Primero debes crear el horario (nombre)");
      return;
    }
    setSaving(true);
    try {
      // 1. Guardar el rango del día
      const resDia = await api.put(`/admin/plantillas/${plantilla.id}/dias/${diaSemanaSel}`, {
        hora_inicio: toHHMMSS(diaHoraInicio),
        hora_fin: toHHMMSS(diaHoraFin),
        activo: diaActivo
      });

      const updatedDia = resDia.data;

      // 2. Guardar los bloques
      await api.put(`/admin/plantillas/dias/${updatedDia.id}/bloques`, {
        bloques: bloquesDia
      });

      showSuccess(`Horario del ${DIAS.find(d => d.n === diaSemanaSel)?.label} guardado`);
      
      // Actualizar lista de días local
      setDias(prev => {
        const other = prev.filter(d => d.dia_semana !== diaSemanaSel);
        return [...other, updatedDia].sort((a,b) => a.dia_semana - b.dia_semana);
      });

    } catch (err: any) {
      showError(err?.response?.data?.error || "Error al guardar el día");
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!plantilla || targetDays.length === 0) return;
    
    setCloning(true);
    try {
      // Proceder a guardar el día actual primero para asegurar consistencia
      await handleSaveDay();

      // Clonar a cada día seleccionado
      for (const dayN of targetDays) {
        const resDia = await api.put(`/admin/plantillas/${plantilla.id}/dias/${dayN}`, {
          hora_inicio: toHHMMSS(diaHoraInicio),
          hora_fin: toHHMMSS(diaHoraFin),
          activo: diaActivo
        });
        
        await api.put(`/admin/plantillas/dias/${resDia.data.id}/bloques`, {
          bloques: bloquesDia
        });
      }

      showSuccess(`Horario copiado a ${targetDays.length} días`);
      setTargetDays([]);
      loadData(plantilla.id);
    } catch (err: any) {
      showError("Error al clonar el horario");
    } finally {
      setCloning(false);
    }
  };

  const toggleTargetDay = (n: number) => {
    setTargetDays(prev => 
      prev.includes(n) ? prev.filter(d => d !== n) : [...prev, n]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Clock size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {plantilla ? `Configurar: ${plantilla.nombre}` : "Nuevo Horario Semanal"}
              </h2>
              <p className="text-xs text-muted-foreground">Define tus horas de trabajo por día</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar Días */}
          <div className="w-full md:w-48 bg-muted/10 border-r border-border p-4 flex md:flex-col gap-2 overflow-x-auto overflow-y-auto">
            {!plantilla ? (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <button 
                  onClick={handleCreatePlantilla}
                  className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition">
                    <Plus size={24} />
                  </div>
                  <span className="text-sm font-bold text-indigo-600">Crear Horario</span>
                </button>
              </div>
            ) : (
              DIAS.map((d) => {
                const isConfigured = dias.some(pd => pd.dia_semana === d.n && pd.activo);
                return (
                  <button
                    key={d.n}
                    onClick={() => setDiaSemanaSel(d.n)}
                    className={`flex-shrink-0 md:w-full text-left px-4 py-3 rounded-xl transition-all border ${
                      diaSemanaSel === d.n
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20 font-bold"
                        : "bg-white dark:bg-neutral-800 border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{d.label}</span>
                      {isConfigured && diaSemanaSel !== d.n && <div className="w-2 h-2 rounded-full bg-green-500" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Main Editor */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {!plantilla ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <Calendar size={48} className="opacity-20" />
                <p className="text-lg">Ponle un nombre a tu configuración de horario para empezar</p>
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Cargando horario...</div>
            ) : (
              <>
                {/* Rango del Día */}
                <div className="bg-muted/30 rounded-2xl p-5 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-indigo-600">
                      <Clock size={18} />
                      <span>Rango Horario: {DIAS.find(d => d.n === diaSemanaSel)?.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Laborable:</label>
                       <button 
                        onClick={() => setDiaActivo(!diaActivo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${diaActivo ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-neutral-700'}`}
                       >
                         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${diaActivo ? 'translate-x-6' : 'translate-x-1'}`} />
                       </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold uppercase">Hora Inicio</label>
                      <input 
                        type="time" 
                        value={diaHoraInicio}
                        onChange={e => setDiaHoraInicio(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-800 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold uppercase">Hora Fin</label>
                      <input 
                        type="time" 
                        value={diaHoraFin}
                        onChange={e => setDiaHoraFin(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-800 border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Clonación Masiva */}
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center gap-2 font-bold text-indigo-600 mb-3">
                    <Plus size={18} />
                    <span>Copiar este horario a otros días:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {DIAS.filter(d => d.n !== diaSemanaSel).map(d => (
                      <button
                        key={d.n}
                        onClick={() => toggleTargetDay(d.n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          targetDays.includes(d.n)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-neutral-800 border-border text-muted-foreground hover:border-indigo-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleClone}
                    disabled={targetDays.length === 0 || cloning}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-30 transition hover:bg-indigo-700"
                  >
                    {cloning ? 'Copiando...' : `Aplicar a ${targetDays.length} días seleccionados`}
                  </button>
                </div>

                {/* Bloques Editor */}
                <div className="border border-border rounded-2xl p-5">
                   <BloquesEditor 
                      title="Franjas horarias (Bloques)"
                      bloques={bloquesDia}
                      onChange={setBloquesDia}
                      onSave={handleSaveDay}
                      rangoInicio={diaHoraInicio}
                      rangoFin={diaHoraFin}
                      clientes={clientes}
                   />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex justify-between bg-muted/5">
          <button
            onClick={() => {
              if (plantilla) onSaved(plantilla.id);
              onClose();
            }}
            className="px-6 py-2.5 font-bold text-muted-foreground hover:bg-muted rounded-xl transition"
          >
            Finalizar configuración
          </button>
          
          {plantilla && (
            <button
              onClick={handleSaveDay}
              disabled={saving}
              className="px-10 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : <><Save size={18} /> Guardar {DIAS.find(d => d.n === diaSemanaSel)?.label}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
