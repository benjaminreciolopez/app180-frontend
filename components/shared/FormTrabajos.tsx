"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { X, Save, Copy, ChevronDown, Trash2, Edit, Calendar } from "lucide-react";
import SimpleMultiselectCalendar from "@/components/shared/SimpleMultiselectCalendar";
import { useConfirm } from "@/components/shared/ConfirmDialog";

type Option = { id: string; nombre: string; modo_defecto?: string };
type Template = { id: string; descripcion: string; detalles?: string };

type Props = {
  isAdmin?: boolean;
  empleados?: Option[];
  clientes: Option[];
  onCreated: () => void;
  initialData?: any;
  mode?: 'create' | 'edit' | 'clone';
  onCancel?: () => void;
};

export default function FormTrabajos({
  isAdmin = false,
  empleados = [],
  clientes,
  onCreated,
  initialData,
  mode = 'create',
  onCancel
}: Props) {
  const [loading, setLoading] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const confirm = useConfirm();

  // Fields
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [detalles, setDetalles] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [workItemNombre, setWorkItemNombre] = useState("");

  // Admin only
  const [empleadoId, setEmpleadoId] = useState("");

  // Billing Mode
  const [billingType, setBillingType] = useState("hora");

  // Inputs per mode
  const [horas, setHoras] = useState("1");
  const [dias, setDias] = useState("1");
  const [meses, setMeses] = useState("1");

  const [duracionTexto, setDuracionTexto] = useState("");
  const [precioFijo, setPrecioFijo] = useState("");

  // Templates & Suggestions
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const [suggestions, setSuggestions] = useState<{
    types: string[];
    templates: { descripcion: string; detalles: string }[];
    recent: { descripcion: string; detalles: string; work_item_nombre: string }[];
  }>({ types: [], templates: [], recent: [] });

  const [activeSuggestion, setActiveSuggestion] = useState<{
    field: 'type' | 'desc' | 'det' | null;
    index: number;
  }>({ field: null, index: -1 });

  // Multiple dates (for cloning or bulk creation)
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [isMultiDate, setIsMultiDate] = useState(false);
  const [selectedBulkDates, setSelectedBulkDates] = useState<string[]>([]);

  // Validation
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  // Detect client default mode (only on creation)
  useEffect(() => {
    if (clienteId && mode === 'create') {
      const c = clientes.find(x => x.id === clienteId);
      if (c?.modo_defecto && c.modo_defecto !== 'mixto') {
        setBillingType(c.modo_defecto);
      }
    }
  }, [clienteId, clientes, mode]);

  const loadDataResources = () => {
    // Templates
    api.get("/worklogs/templates").then((res: { data: Template[] }) => {
      if (Array.isArray(res.data)) setTemplates(res.data);
    }).catch(console.error);

    // Suggestions
    api.get("/worklogs/suggestions").then((res: { data: any }) => {
      setSuggestions(res.data);
    }).catch(console.error);
  };

  // Load Data
  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.suggestion-container')) {
        setActiveSuggestion({ field: null, index: -1 });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadDataResources();
  }, [billingType, mode]);

  async function handleDeleteTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: "Borrar plantilla",
      description: "¿Borrar esta plantilla?",
      confirmLabel: "Borrar",
      variant: "destructive",
    });
    if (!ok) return;
    setDeletingTemplateId(id);
    try {
      await api.delete(`/worklogs/templates/${id}`);
      loadDataResources();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTemplateId(null);
    }
  }

  // Sync with initialData (Edit / Clone)
  useEffect(() => {
    if (initialData) {
      setFecha(initialData.fecha ? new Date(initialData.fecha).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDescripcion(initialData.descripcion || "");
      setDetalles(initialData.detalles || "");
      setClienteId(initialData.cliente_id || "");
      setWorkItemNombre(initialData.work_item_nombre || "");
      setEmpleadoId(initialData.employee_id || "");
      setBillingType(initialData.tipo_facturacion || "hora");
      setDuracionTexto(initialData.duracion_texto || "");
      setPrecioFijo(initialData.valor ? String(initialData.valor) : "");

      // Calc helper inputs
      if (initialData.tipo_facturacion === 'hora' && initialData.minutos) setHoras(String(initialData.minutos / 60));
      if (initialData.tipo_facturacion === 'dia' && initialData.minutos) setDias(String(initialData.minutos / 480));
      if (initialData.tipo_facturacion === 'mes' && initialData.minutos) setMeses(String(initialData.minutos / 9600));
    } else {
      // Reset to defaults if initialData is null
      setDescripcion("");
      setDetalles("");
      setWorkItemNombre("");
      setSaveAsTemplate(false);
      setExtraDates([]);
    }
  }, [initialData, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedToSubmit(true);

    if (!descripcion.trim() || !workItemNombre.trim()) {
      return;
    }

    let calculatedMinutes = 0;
    let finalPrecio = null;

    if (billingType === 'hora') {
      const h = parseFloat(horas.replace(",", "."));
      if (isNaN(h) || h <= 0) return;
      calculatedMinutes = Math.round(h * 60);
    } else if (billingType === 'dia') {
      const d = parseFloat(dias.replace(",", "."));
      if (isNaN(d) || d <= 0) return;
      calculatedMinutes = Math.round(d * 8 * 60);
    } else if (billingType === 'mes') {
      const m = parseFloat(meses.replace(",", "."));
      if (isNaN(m) || m <= 0) return;
      calculatedMinutes = Math.round(m * 160 * 60);
    } else if (billingType === 'valorado') {
      calculatedMinutes = 0;
      if (precioFijo) finalPrecio = parseFloat(precioFijo.replace(",", "."));
    }

    setLoading(true);
    try {
      const payload = {
        fecha,
        minutos: calculatedMinutes,
        descripcion,
        detalles,
        cliente_id: clienteId || null,
        work_item_nombre: workItemNombre || null,
        empleado_id: isAdmin ? (empleadoId || null) : undefined,
        tipo_facturacion: billingType,
        duracion_texto: billingType === 'valorado' ? duracionTexto : null,
        precio: finalPrecio,
        save_as_template: saveAsTemplate
      };

      if (mode === 'edit' && initialData?.id) {
        await api.put(`/worklogs/${initialData.id}`, payload);
      } else if (mode === 'clone' && initialData?.id) {
        // Combinamos fecha base + extraDates
        const allDates = [fecha, ...extraDates].filter(Boolean);
        await api.post("/worklogs/clonar", {
          work_log_id: initialData.id,
          fechas: allDates,
          cliente_id: clienteId || null
        });
      } else {
        // CREATE MODE
        if (isMultiDate && selectedBulkDates.length > 0) {
          // Bulk creation
          // We iterate and create one by one. 
          // Ideally backend should handle bulk, but frontend loop is safer fallback for now.
          const promises = selectedBulkDates.map(date =>
            api.post("/worklogs", { ...payload, fecha: date })
          );
          await Promise.all(promises);
        } else {
          // Single creation
          await api.post("/worklogs", payload);
        }
      }

      // Reset
      if (mode === 'create') {
        setDescripcion("");
        setDetalles("");
        setWorkItemNombre("");
        setHoras("1");
        setDias("1");
        setMeses("1");
        setDuracionTexto("");
        setPrecioFijo("");
        setClienteId("");
        if (isAdmin) setEmpleadoId("");
        // Reset bulk
        setIsMultiDate(false);
        setSelectedBulkDates([]);
      }

      onCreated();
      setTriedToSubmit(false);
      // Reload resources if one was saved
      if (saveAsTemplate) {
        loadDataResources();
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar el trabajo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`card space-y-4 border-2 transition-colors ${mode === 'edit' ? 'border-indigo-200 bg-indigo-50/10' : mode === 'clone' ? 'border-blue-200 bg-blue-50/10' : 'border-transparent'}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {mode === 'edit' ? <><Edit size={20} className="text-indigo-600" /> Editar Trabajo</> :
            mode === 'clone' ? <><Copy size={20} className="text-blue-600" /> Clonar Trabajo (Multifecha)</> :
              "Registrar nuevo trabajo"}
        </h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Selector Plantillas */}
      {templates.length > 0 && mode !== 'clone' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
          >
            Usar de Plantilla <ChevronDown size={14} />
          </button>
          {showTemplates && (
            <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white border border-gray-200 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in duration-100 max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b bg-gray-50/50 sticky top-0">Tus plantillas guardadas</div>
              {templates.map(t => (
                <div key={t.id} className="relative group hover:bg-indigo-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => {
                      // Parse [Type] Description
                      const match = t.descripcion.match(/^\[(.*?)\]\s*(.*)$/);
                      if (match) {
                        setWorkItemNombre(match[1]);
                        setDescripcion(match[2]);
                      } else {
                        setWorkItemNombre("");
                        setDescripcion(t.descripcion);
                      }

                      if (t.detalles) setDetalles(t.detalles);
                      setShowTemplates(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5"
                  >
                    <span className="font-medium text-gray-800 truncate block w-full pr-6">{t.descripcion}</span>
                    {t.detalles && <span className="text-xs text-gray-500 truncate block w-full pr-6">{t.detalles}</span>}
                  </button>
                  <button
                    type="button"
                    disabled={deletingTemplateId === t.id}
                    onClick={(e) => handleDeleteTemplate(t.id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all bg-white/80 rounded disabled:opacity-50"
                    title="Borrar plantilla"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">
              Empleado
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
            >
              <option value="">(Yo / Asignarme a mí)</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 block mb-1">Fecha(s)</label>

          {mode === 'create' && (
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsMultiDate(!isMultiDate)}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${isMultiDate ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}
              >
                <Calendar size={12} />
                {isMultiDate ? "Múltiples Fechas" : "Fecha Única"}
              </button>
            </div>
          )}

          {!isMultiDate ? (
            <input
              type="date"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          ) : (
            <div className="border rounded-lg p-2 bg-slate-50">
              <div className="text-xs text-center text-gray-500 mb-2">
                {selectedBulkDates.length === 0 ? "Selecciona días en el calendario" : `${selectedBulkDates.length} días seleccionados`}
              </div>
              <div className="max-h-60 overflow-y-auto">
                <SimpleMultiselectCalendar
                  selected={selectedBulkDates}
                  onSelect={setSelectedBulkDates}
                  className="border-0 shadow-none bg-transparent"
                />
              </div>
              {/* Input oculto para validación html5 si fuera necesario, aunque validamos manualmente */}
              {selectedBulkDates.length === 0 && <input className="opacity-0 h-0 w-0" required autoComplete="off" />}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">
            Cliente <span className="text-gray-400 font-normal">(Opcional)</span>
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">- Seleccionar -</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Facturacion Mode */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Facturación</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={billingType}
            onChange={e => setBillingType(e.target.value)}
          >
            <option value="hora">Por Horas</option>
            <option value="dia">Por Días</option>
            <option value="mes">Por Meses</option>
            <option value="valorado">Precio Cerrado</option>
          </select>
        </div>

        {/* Dynamic Duration Input */}
        {billingType === 'hora' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Duración (Horas)</label>
            <input
              type="number" step="0.1" min="0.1" required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
            />
          </div>
        )}
        {billingType === 'dia' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Duración (Días)</label>
            <input
              type="number" step="0.5" min="0.5" required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>
        )}
        {billingType === 'mes' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Duración (Meses)</label>
            <input
              type="number" step="0.1" min="0.1" required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
            />
          </div>
        )}
        {billingType === 'valorado' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Duración (Texto)</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={duracionTexto}
                onChange={(e) => setDuracionTexto(e.target.value)}
                placeholder="Ej: 2 semanas"
              />
            </div>
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Importe (€)</label>
                <input
                  type="number" step="0.01"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-green-700"
                  value={precioFijo}
                  onChange={(e) => setPrecioFijo(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
          </>
        )}

      </div>

      {/* Warning if client has no rate */}
      {(() => {
        if (!clienteId) return null;
        const c = clientes.find(x => x.id === clienteId) as any;
        if (!c) return null;

        let hasRate = true;
        let rateTypeLabel = "";

        if (billingType === 'hora') {
          hasRate = !!(c.tiene_tarifa_hora);
          rateTypeLabel = "por hora";
        } else if (billingType === 'dia') {
          hasRate = !!(c.tiene_tarifa_dia);
          rateTypeLabel = "por día";
        } else if (billingType === 'mes') {
          hasRate = !!(c.tiene_tarifa_mes);
          rateTypeLabel = "por mes";
        } else if (billingType === 'valorado') {
          // En precio cerrado, si el admin pone un precio manual se acepta. 
          // Si no, comprobamos si hay tarifa por defecto para 'trabajo'
          const manualPrice = parseFloat(precioFijo.replace(",", "."));
          hasRate = !isNaN(manualPrice) && manualPrice > 0 || !!(c.tiene_tarifa_trabajo);
          rateTypeLabel = "de precio cerrado";
        }

        if (!hasRate) {
          return (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-md text-xs flex items-center gap-2">
              <span className="font-bold">⚠️ Atención:</span>
              Este cliente no tiene tarifa {rateTypeLabel} configurada. El trabajo se guardará con valor 0€.
            </div>
          )
        }
        return null;
      })()}

      {/* Clonación Multiple Fechas */}
      {mode === 'clone' && (
        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2">
          <label className="text-xs font-bold text-blue-700 uppercase tracking-tight">Fechas adicionales para clonar</label>
          <div className="flex flex-wrap gap-2">
            {extraDates.map((d, i) => (
              <div key={i} className="flex items-center gap-1 bg-white border border-blue-200 pl-2 pr-1 py-1 rounded-md text-sm text-blue-800 shadow-sm">
                {new Date(d).toLocaleDateString()}
                <button type="button" onClick={() => setExtraDates(extraDates.filter((_, idx) => idx !== i))} className="p-0.5 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
            <input
              type="date"
              className="text-xs border rounded px-2 py-1 outline-none"
              onChange={(e) => {
                if (e.target.value) {
                  setExtraDates([...extraDates, e.target.value]);
                  e.target.value = "";
                }
              }}
            />
          </div>
          <p className="text-[10px] text-blue-500 italic">Cada fecha generará una copia exacta de este registro.</p>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-xs font-medium text-gray-500">
          Descripción / Trabajo
          {billingType !== 'valorado' && (
            <span className="text-gray-400 font-normal ml-2">
              (Puedes indicar tipo, p.ej: "Fontanería")
            </span>
          )}
        </label>

        {/* Combined input for simple usage, or separate type? 
            Original form had "Type" and "Description". Keeping it simple.
        */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
          <div className="relative suggestion-container">
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-all ${triedToSubmit && !workItemNombre.trim() ? 'border-red-500 bg-red-50' : 'focus:border-indigo-500'}`}
              value={workItemNombre}
              onChange={(e) => setWorkItemNombre(e.target.value)}
              onFocus={() => setActiveSuggestion({ field: 'type', index: 0 })}
              onClick={() => setActiveSuggestion({ field: 'type', index: 0 })}
              placeholder="Tipo (Ej: Revisión)"
            />
            {activeSuggestion.field === 'type' && (
              <div className="absolute top-full left-0 z-50 w-full bg-white border rounded-lg shadow-xl mt-1 py-1 max-h-60 overflow-y-auto">
                {(() => {
                  const filtered = suggestions.types.filter(t => t.toLowerCase().includes(workItemNombre.toLowerCase()));
                  return filtered.length > 0 ? (
                    filtered.map((t, i) => (
                      <button
                        key={i} type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b last:border-0 text-gray-700"
                        onMouseDown={(e) => { e.preventDefault(); setWorkItemNombre(t); setActiveSuggestion({ field: null, index: -1 }); }}
                      >
                        {t}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-400 italic">No hay sugerencias...</div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="relative suggestion-container">
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm transition-all ${triedToSubmit && !descripcion.trim() ? 'border-red-500 bg-red-50' : 'focus:border-indigo-500'}`}
              placeholder="Descripción corta (aparece en factura)..."
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onFocus={() => setActiveSuggestion({ field: 'desc', index: 0 })}
              onClick={() => setActiveSuggestion({ field: 'desc', index: 0 })}
            />
            {activeSuggestion.field === 'desc' && (
              <div className="absolute top-full left-0 z-50 w-full bg-white border rounded-lg shadow-xl mt-1 py-1 max-h-60 overflow-y-auto">
                {(() => {
                  const allOptions = [...new Set([
                    ...suggestions.templates.map(t => t.descripcion),
                    ...suggestions.recent.map(r => r.descripcion)
                  ])].filter(Boolean);

                  const filtered = allOptions.filter(d => d.toLowerCase().includes(descripcion.toLowerCase()));

                  return filtered.length > 0 ? (
                    filtered.map((d, i) => (
                      <button
                        key={i} type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b last:border-0 text-gray-700"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          // Parse [Type] Description logic here too if needed, but usually templates handle it.
                          // If coming from suggestions, it might already be parsed or raw.
                          // Let's apply sticky logic: if it starts with [Type], split it.
                          const match = d.match(/^\[(.*?)\]\s*(.*)$/);
                          if (match) {
                            setWorkItemNombre(match[1]);
                            setDescripcion(match[2]);
                          } else {
                            setDescripcion(d);
                          }

                          // Try auto-fill details
                          const tpl = suggestions.templates.find(t => t.descripcion === d)
                            || suggestions.recent.find(r => r.descripcion === d);
                          if (tpl?.detalles) setDetalles(tpl.detalles);

                          setActiveSuggestion({ field: null, index: -1 });
                        }}
                      >
                        {d}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-400 italic">Escribe para nueva descripción...</div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Detalles adicionales (Opcional)</label>
        <div className="relative suggestion-container">
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:border-indigo-500 transition-all"
            placeholder="Explicación detallada del trabajo realizado..."
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            onFocus={() => setActiveSuggestion({ field: 'det', index: 0 })}
            onClick={() => setActiveSuggestion({ field: 'det', index: 0 })}
          />
          {activeSuggestion.field === 'det' && (
            <div className="absolute top-full left-0 z-50 w-full bg-white border rounded-lg shadow-xl mt-1 py-1 max-h-60 overflow-y-auto">
              {(() => {
                const allOptions = [...new Set([
                  ...suggestions.templates.map(t => t.detalles),
                  ...suggestions.recent.map(r => r.detalles)
                ])].filter(Boolean);

                const filtered = allOptions.filter(d => d!.toLowerCase().includes(detalles.toLowerCase()));

                return filtered.length > 0 ? (
                  filtered.map((d, i) => (
                    <button
                      key={i} type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b last:border-0 text-gray-700 block"
                      onMouseDown={(e) => { e.preventDefault(); setDetalles(d!); setActiveSuggestion({ field: null, index: -1 }); }}
                    >
                      {d && d.length > 100 ? d.substring(0, 100) + '...' : d}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400 italic">No hay sugerencias...</div>
                );
              })()}
            </div>
          )}
        </div>
        {mode !== 'clone' && (
          <label className="flex items-center gap-2 cursor-pointer pt-1 p-2 rounded-lg transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              className="rounded text-indigo-600 h-4 w-4"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
            />
            <span className="text-xs font-semibold text-gray-600">Guardar como plantilla favorita</span>
          </label>
        )}
      </div>

      <div className="flex justify-end pt-2 gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-8 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? "Guardando..." : (
            mode === 'edit' ? <><Save size={18} /> Guardar Cambios</> :
              mode === 'clone' ? <><Copy size={18} /> Iniciar Clonación</> :
                "Guardar Trabajo"
          )}
        </button>
      </div>
    </form>
  );
}
