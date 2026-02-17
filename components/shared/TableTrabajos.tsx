"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowDown, ArrowUp, Search, Edit, Trash2, Copy, Info, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useConfirm } from "@/components/shared/ConfirmDialog";

export type WorkLogItem = {
  id: string;
  fecha: string;
  minutos: number | null;
  precio: number | null;
  descripcion: string;
  empleado_nombre?: string;
  empleado_id?: string;
  cliente_nombre?: string | null;
  cliente_id?: string | null;
  work_item_nombre?: string | null;
  
  // Payment fields
  valor?: number | null;
  pagado?: number | null;
  estado_pago?: 'pendiente' | 'parcial' | 'pagado';

  // Mixed billing
  tipo_facturacion?: 'hora' | 'dia' | 'mes' | 'valorado';
  duracion_texto?: string | null;
  factura_id?: number | null;
  detalles?: string | null;
};

type ColKey =
  | "fecha"
  | "empleado_nombre"
  | "cliente_nombre"
  | "work_item_nombre"
  | "minutos"
  | "valor"
  | "estado_pago"
  | "descripcion";

type Props = {
  items: WorkLogItem[];
  isAdmin?: boolean;
  enableGrouping?: boolean; // New prop for grouping
  onEdit?: (item: WorkLogItem) => void;
  onDelete?: (id: string) => void;
  onClone?: (item: WorkLogItem) => void;
};

// Utils para formato
function formatDuracion(item: WorkLogItem) {
  if (item.tipo_facturacion === 'valorado') {
      return item.duracion_texto || '—';
  }
  
  const m = item.minutos;
  if (m == null) return "—";

  if (item.tipo_facturacion === 'dia') {
      // 8h = 480m = 1 dia
      const dias = m / 480;
      const val = Number(dias.toFixed(2));
      return `${val} ${val === 1 ? 'día' : 'días'}`;
  }

  if (item.tipo_facturacion === 'mes') {
      // 160h = 9600m = 1 mes (aprox standard laboral)
      const meses = m / 9600;
      const val = Number(meses.toFixed(2));
      return `${val} ${val === 1 ? 'mes' : 'meses'}`;
  }

  // Default horas
  const horas = m / 60;
  return `${Number(horas.toFixed(2))} h`;
}

export default function TableTrabajos({ 
  items, 
  isAdmin = false,
  enableGrouping = false,
  onEdit,
  onDelete,
  onClone
}: Props) {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<ColKey>("fecha");
  const [sortAsc, setSortAsc] = useState(false); // default desc (mas reciente primero)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [expandedPaidGroups, setExpandedPaidGroups] = useState<Record<string, boolean>>({});

  // Cargar preferencia orden de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("trabajos-sort");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.col) setSortCol(parsed.col);
        if (typeof parsed.asc === "boolean") setSortAsc(parsed.asc);
      }
    } catch {}
  }, []);

  // Escape to clear search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSearch("");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Guardar preferencia
  function handleSort(col: ColKey) {
    let newAsc = true;
    if (sortCol === col) {
      newAsc = !sortAsc;
    } else {
      newAsc = true; // resets to asc when changing col? or default desc? let's standard asc
      if (col === "fecha") newAsc = false; // fecha mejor desc por defecto
    }

    setSortCol(col);
    setSortAsc(newAsc);
    localStorage.setItem(
      "trabajos-sort",
      JSON.stringify({ col, asc: newAsc })
    );
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const togglePaidGroup = (groupKey: string) => {
    setExpandedPaidGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Filtrado, ordenado y agrupación
  const { processedItems, groupedItems } = useMemo(() => {
    let filtered = [...items];

    // 1. Filtrar global search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((it) => {
        const match = [
          it.descripcion,
          it.empleado_nombre,
          it.cliente_nombre,
          it.work_item_nombre,
          it.fecha,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

        return match;
      });
    }

    // 2. Ordenar
    filtered.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      // Caso especial minutos (nulls al final)
      if (sortCol === "minutos") {
        valA = a.minutos ?? -1;
        valB = b.minutos ?? -1;
      }

      // Strings
      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Números
      if (valA! < valB!) return sortAsc ? -1 : 1;
      if (valA! > valB!) return sortAsc ? 1 : -1;
      return 0;
    });

    // 3. Agrupar si es necesario
    let groups: Record<string, { pending: WorkLogItem[], paid: WorkLogItem[], all: WorkLogItem[] }> = {};
    
    if (enableGrouping) {
      groups = filtered.reduce((acc, item) => {
        const key = item.cliente_nombre || "Sin Cliente";
        if (!acc[key]) {
            acc[key] = { pending: [], paid: [], all: [] };
        }
        
        acc[key].all.push(item);
        
        if (item.estado_pago === 'pagado') {
            acc[key].paid.push(item);
        } else {
            acc[key].pending.push(item);
        }
        
        return acc;
      }, {} as Record<string, { pending: WorkLogItem[], paid: WorkLogItem[], all: WorkLogItem[] }>);
    }

    return { processedItems: filtered, groupedItems: groups };
  }, [items, search, sortCol, sortAsc, enableGrouping]);

  // Render header helper
  function Th({ label, col }: { label: string; col: ColKey }) {
    const active = sortCol === col;
    return (
      <th
        className="p-3 text-left cursor-pointer hover:bg-gray-200 transition-colors select-none"
        onClick={() => handleSort(col)}
      >
        <div className="flex items-center gap-1">
          {label}
          {active &&
            (sortAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
        </div>
      </th>
    );
  }

  // Row render helper
  const renderRow = (it: WorkLogItem) => (
      <tr key={it.id} className="hover:bg-gray-50 border-b last:border-0 transition-colors">
        <td className="p-3 whitespace-nowrap">
          {new Date(it.fecha).toLocaleDateString("es-ES")}
        </td>
        {isAdmin && (
          <td className="p-3 font-medium">
            {it.empleado_nombre}
          </td>
        )}
        {!enableGrouping && (
             <td className="p-3">
             {it.cliente_nombre ? (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                 {it.cliente_nombre}
               </span>
             ) : (
               "—"
             )}
           </td>
        )}
        <td className="p-3 font-mono font-medium whitespace-nowrap">
          {formatDuracion(it)}
        </td>
        <td className="p-3 font-mono text-xs">
            {it.valor ? `${Number(it.valor).toFixed(2)}€` : '—'}
        </td>
        <td className="p-3">
            {it.valor ? (
                  <span className={`px-2 py-1 rounded text-xs capitalize 
                    ${it.estado_pago === 'pagado' ? 'bg-green-100 text-green-800' : 
                      it.estado_pago === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {it.estado_pago || 'pendiente'}
                  </span>
            ) : (
                <span className="text-gray-300 text-xs">—</span>
            )}
        </td>
          <td className="p-3 max-w-md truncate text-gray-600" title={it.descripcion + (it.detalles ? "\n\nDetalles:\n" + it.detalles : "")}>
            <div className="flex items-center gap-1">
              {it.descripcion}
              {it.detalles && (
                <Info size={14} className="text-blue-400 shrink-0" />
              )}
            </div>
        </td>
        <td className="p-3 text-right whitespace-nowrap">
          <div className="flex items-center justify-end gap-1">
            <button 
              onClick={() => onClone?.(it)}
              title="Clonar Trabajo"
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Copy size={16} />
            </button>
            <button 
              onClick={() => onEdit?.(it)}
              disabled={it.pagado != null && it.pagado > 0}
              title={it.pagado! > 0 ? "No se puede editar un trabajo pagado. Elimina el pago primero." : "Editar"}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: "Eliminar trabajo",
                  description: "¿Seguro que deseas eliminar este trabajo?",
                  confirmLabel: "Eliminar",
                  variant: "destructive",
                });
                if (ok) {
                  onDelete?.(it.id);
                }
              }}
              disabled={it.pagado != null && it.pagado > 0}
              title={it.pagado! > 0 ? "No se puede eliminar un trabajo pagado. Elimina el pago primero." : "Eliminar"}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
            </button>
            {isAdmin && it.pagado! > 0 && (
              <Link
                href="/admin/cobros-pagos"
                title="Ver pagos para gestionar este registro"
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CreditCard size={16} />
              </Link>
            )}
          </div>
        </td>
      </tr>
  );

  const renderTableHeader = () => (
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
            <tr>
                <Th label="Fecha" col="fecha" />
                {isAdmin && <Th label="Empleado" col="empleado_nombre" />}
                {!enableGrouping && <Th label="Cliente" col="cliente_nombre" />}
                <Th label="Duración" col="minutos" />
                <Th label="Valor" col="valor" />
                <Th label="Estado" col="estado_pago" />
                <Th label="Descripción" col="descripcion" />
                <th className="p-3 text-right">Acciones</th>
            </tr>
        </thead>
  );

  // Totales de la selección actual
  // OJO: Totalizar minutos mixtos (hora/dia/mes) puede ser confuso. 
  // Mostramos horas totales como conversión base para tener una referencia.
  const totalMin = processedItems.reduce((acc, curr) => acc + Number(curr.minutos || 0), 0);
  const totalHoras = (totalMin / 60).toFixed(2);
  
  // Totales valor (sumar si hay precios)
  const totalValor = processedItems.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  return (
    <div className="space-y-3">
      {/* Buscador y Resumen */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-end sm:items-center">
        <div className="relative w-full sm:w-64">
           {/* Search Input */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="border rounded-full pl-9 pr-4 py-2 w-full text-sm"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="text-sm text-gray-600 font-medium flex gap-4">
            <span>
                {processedItems.length} registros
            </span>
            <span>
                Total eq: <span className="text-black font-bold">{totalHoras} h</span>
            </span>
            {totalValor > 0 && (
                 <span>
                    Total: <span className="text-black font-bold">{totalValor.toFixed(2)}€</span>
                </span>
            )}
        </div>
      </div>

      <div className="card overflow-hidden !p-0 border-0 bg-transparent shadow-none">
        {enableGrouping ? (
           // GROUPED VIEW
           <div className="space-y-2">
               {Object.keys(groupedItems).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
                        No hay trabajos {search && "que coincidan con la búsqueda"}
                    </div>
               ) : (
                   Object.keys(groupedItems).map(clienteName => {
                       const group = groupedItems[clienteName];
                       // Auto-expand if has pending items, unless explicitly toggled off (expandedGroups[name] === false)
                       // If expandedGroups[name] is undefined -> use default (hasPending)
                       const hasPending = group.pending.length > 0;
                       const isExpanded = expandedGroups[clienteName] ?? hasPending;
                       
                       const isPaidExpanded = expandedPaidGroups[clienteName] || false;
                       
                       // Group Totals
                       const groupTotalMin = group.all.reduce((acc, curr) => acc + Number(curr.minutos || 0), 0);
                       const groupTotalHoras = (groupTotalMin / 60).toFixed(2);
                       const groupTotalValor = group.all.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

                       // Pending Totals
                       const pendingTotalMin = group.pending.reduce((acc, curr) => acc + Number(curr.minutos || 0), 0);
                       const pendingTotalHoras = (pendingTotalMin / 60).toFixed(2);
                       const pendingTotalValor = group.pending.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);


                       return (
                           <div key={clienteName} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                               <div 
                                   className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 cursor-pointer select-none transition-colors border-l-4 border-l-transparent hover:border-l-blue-500"
                                   onClick={() => toggleGroup(clienteName)}
                               >
                                   <div className="flex items-center gap-3">
                                       {isExpanded ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
                                       <span className="font-semibold text-gray-800">{clienteName}</span>
                                       <span className="text-xs bg-gray-100 border px-2 py-0.5 rounded-full text-gray-600 font-medium">
                                           {group.all.length}
                                       </span>
                                   </div>
                                    <div className="flex items-center gap-6 text-sm text-gray-500">
                                         {/* Show Pending Highlight */}
                                         {group.pending.length > 0 && (
                                            <div className="flex items-center gap-2 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded">
                                                <span>{group.pending.length} Pendientes</span>
                                                <span className="opacity-75">({pendingTotalValor.toFixed(2)}€)</span>
                                            </div>
                                         )}
                                         
                                         <div className="flex items-center gap-2">
                                            <span>{groupTotalHoras} h</span>
                                            {groupTotalValor > 0 && (
                                                <span className="font-semibold text-gray-900">{groupTotalValor.toFixed(2)}€</span>
                                            )}
                                         </div>
                                    </div>
                               </div>
                               
                               {isExpanded && (
                                   <div className="border-t animate-in fade-in zoom-in-95 duration-200">
                                        {/* Pending Jobs Table */}
                                        {group.pending.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    {renderTableHeader()}
                                                    <tbody className="divide-y">
                                                        {group.pending.map(renderRow)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Paid Jobs Toggle */}
                                        {group.paid.length > 0 && (
                                            <div className="border-t bg-gray-50">
                                                <div 
                                                    className="flex items-center justify-between p-2 px-4 cursor-pointer hover:bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePaidGroup(clienteName);
                                                    }}
                                                >
                                                   <div className="flex items-center gap-2">
                                                        {isPaidExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                                        <span>Ver {group.paid.length} trabajos pagados</span>
                                                   </div>
                                                </div>
                                                
                                                {isPaidExpanded && (
                                                    <div className="border-t border-gray-100 bg-gray-50/50">
                                                         <div className="overflow-x-auto opacity-75">
                                                            <table className="w-full text-sm">
                                                                {renderTableHeader()}
                                                                <tbody className="divide-y divide-gray-200">
                                                                    {group.paid.map(renderRow)}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {group.all.length === 0 && (
                                             <div className="p-4 text-center text-gray-500 text-sm">
                                                 No hay trabajos visibles en este grupo.
                                             </div>
                                        )}
                                   </div>
                               )}
                           </div>
                       );
                   })
               )}
           </div>
        ) : (
           // FLAT VIEW (Original)
            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    {renderTableHeader()}
                    <tbody className="divide-y">
                    {processedItems.length === 0 ? (
                        <tr>
                        <td className="p-8 text-center text-gray-500" colSpan={isAdmin ? 8 : 7}>
                            No hay resultados
                        </td>
                        </tr>
                    ) : (
                        processedItems.map(renderRow)
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
