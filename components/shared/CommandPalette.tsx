"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  Calculator,
  FileText,
  ReceiptEuro,
  Banknote,
  Calendar,
  Clock,
  CalendarOff,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Bot,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Plus,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  keywords?: string[];
  icon?: React.ElementType;
  action: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo actual (controla qué comandos se muestran) */
  mode: "admin" | "asesor";
}

// ─────────────────────────────────────────────
// Comandos estáticos (no requieren API)
// ─────────────────────────────────────────────
function buildStaticCommands(router: ReturnType<typeof useRouter>, mode: "admin" | "asesor"): CommandItem[] {
  if (mode === "admin") {
    return [
      { id: "go-dashboard",     title: "Dashboard",                group: "Navegar", icon: LayoutDashboard, keywords: ["inicio", "home"], action: () => router.push("/admin/dashboard") },
      { id: "go-facturacion",   title: "Facturación",              group: "Navegar", icon: FileText, keywords: ["facturas", "ventas"], action: () => router.push("/admin/facturacion/listado") },
      { id: "go-nueva-factura", title: "Crear nueva factura",       group: "Acciones", icon: Plus, keywords: ["facturar", "factura nueva"], action: () => router.push("/admin/facturacion/crear") },
      { id: "go-gastos",        title: "Gastos / Compras",         group: "Navegar", icon: ReceiptEuro, keywords: ["gasto", "compras"], action: () => router.push("/admin/gastos") },
      { id: "go-cobros",        title: "Cobros y pagos",           group: "Navegar", icon: Banknote, keywords: ["pagos", "cobros", "tesorería"], action: () => router.push("/admin/cobros-pagos") },
      { id: "go-fiscal",        title: "Fiscal",                   group: "Navegar", icon: Calculator, keywords: ["modelos", "iva", "irpf", "303", "130", "111"], action: () => router.push("/admin/fiscal") },
      { id: "go-empleados",     title: "Empleados",                group: "Navegar", icon: Users, keywords: ["plantilla", "personal"], action: () => router.push("/admin/empleados") },
      { id: "go-nominas",       title: "Nóminas",                  group: "Navegar", icon: Banknote, keywords: ["payroll", "salario"], action: () => router.push("/admin/nominas") },
      { id: "go-calendario",    title: "Calendario",               group: "Navegar", icon: Calendar, keywords: ["agenda", "eventos"], action: () => router.push("/admin/calendario") },
      { id: "go-fichajes",      title: "Fichajes",                 group: "Navegar", icon: Clock, keywords: ["asistencia", "horario"], action: () => router.push("/admin/fichajes") },
      { id: "go-ausencias",     title: "Ausencias",                group: "Navegar", icon: CalendarOff, keywords: ["vacaciones", "baja"], action: () => router.push("/admin/ausencias") },
      { id: "go-clientes",      title: "Clientes",                 group: "Navegar", icon: Building2, keywords: ["clientes"], action: () => router.push("/admin/clientes") },
      { id: "go-config",        title: "Configuración",            group: "Navegar", icon: Settings, keywords: ["settings", "ajustes"], action: () => router.push("/admin/configuracion") },
      { id: "go-mi-asesoria",   title: "Mi asesoría",              group: "Navegar", icon: ShieldCheck, keywords: ["asesoria", "vinculo"], action: () => router.push("/admin/mi-asesoria") },
    ];
  }

  // Modo asesor
  return [
    { id: "go-dashboard",   title: "Dashboard",                group: "Navegar", icon: LayoutDashboard, keywords: ["inicio", "home"], action: () => router.push("/asesor/dashboard") },
    { id: "go-clientes",    title: "Clientes",                 group: "Navegar", icon: Building2, keywords: ["empresas", "vinculados"], action: () => router.push("/asesor/clientes") },
    { id: "go-nuevo-cliente", title: "Nuevo cliente",          group: "Acciones", icon: Plus, keywords: ["alta", "crear", "dar de alta"], action: () => router.push("/asesor/clientes?action=new") },
    { id: "go-fiscal",      title: "Fiscal (consolidado)",     group: "Navegar", icon: Calculator, keywords: ["modelos"], action: () => router.push("/asesor/fiscal") },
    { id: "go-modelos",     title: "Modelos anuales",          group: "Navegar", icon: FileText, keywords: ["390", "190", "180", "347"], action: () => router.push("/asesor/fiscal/modelos-anuales") },
    { id: "go-empleados",   title: "Empleados (cross-cliente)", group: "Navegar", icon: Users, action: () => router.push("/asesor/empleados") },
    { id: "go-laboral",     title: "Laboral",                  group: "Navegar", icon: Briefcase, action: () => router.push("/asesor/laboral") },
    { id: "go-nominas",     title: "Generar nóminas",          group: "Navegar", icon: Banknote, action: () => router.push("/asesor/nominas/generar") },
    { id: "go-mi-equipo",   title: "Mi equipo",                group: "Navegar", icon: Users, keywords: ["asesores", "team"], action: () => router.push("/asesor/mi-equipo") },
    { id: "go-config",      title: "Configuración asesoría",   group: "Navegar", icon: Settings, action: () => router.push("/asesor/configuracion") },
  ];
}

// ─────────────────────────────────────────────
// Búsqueda dinámica de clientes (modo asesor)
// ─────────────────────────────────────────────
async function searchClientesAsesor(query: string): Promise<CommandItem[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await authenticatedFetch("/asesor/clientes");
    const json = await res.json();
    const list = (json?.data || []) as Array<{ empresa_id: string; nombre: string; cif?: string; estado?: string }>;
    const q = query.toLowerCase();
    return list
      .filter((c) => c.estado === "activo")
      .filter((c) => c.nombre?.toLowerCase().includes(q) || c.cif?.toLowerCase().includes(q))
      .slice(0, 10)
      .map((c) => ({
        id: `cliente-${c.empresa_id}`,
        title: c.nombre,
        subtitle: c.cif || "",
        group: "Clientes",
        icon: Building2,
        action: () => {
          window.location.href = `/asesor/clientes/${c.empresa_id}`;
        },
      }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export function CommandPalette({ open, onOpenChange, mode }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [dynamicResults, setDynamicResults] = useState<CommandItem[]>([]);

  const staticCommands = useMemo(() => buildStaticCommands(router, mode), [router, mode]);

  // Debounce búsqueda dinámica de clientes
  useEffect(() => {
    if (mode !== "asesor") return;
    const t = setTimeout(async () => {
      if (query.trim().length >= 2) {
        const results = await searchClientesAsesor(query.trim());
        setDynamicResults(results);
      } else {
        setDynamicResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, mode]);

  // Al abrir: limpiar y enfocar
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setDynamicResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filtrado fuzzy básico
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticCommands;
    return staticCommands.filter((c) => {
      const hay = (c.title + " " + (c.subtitle || "") + " " + (c.keywords || []).join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }, [query, staticCommands]);

  const allItems = useMemo(() => [...filtered, ...dynamicResults], [filtered, dynamicResults]);

  // Agrupar por group
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of allItems) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [allItems]);

  // Reset índice activo cuando cambia el query
  useEffect(() => {
    setActiveIdx(0);
  }, [query, allItems.length]);

  const runCommand = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      // Pequeño delay para que el modal se cierre antes de navegar
      setTimeout(() => item.action(), 50);
    },
    [onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[activeIdx];
        if (item) runCommand(item);
      }
    },
    [allItems, activeIdx, runCommand, onOpenChange]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[20vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "asesor" ? "Buscar cliente, sección o acción…" : "Buscar sección o acción…"}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin resultados
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                  {group}
                </div>
                {items.map((item, idx) => {
                  const globalIdx = allItems.indexOf(item);
                  const isActive = globalIdx === activeIdx;
                  const Icon = item.icon || ArrowRight;
                  return (
                    <button
                      key={item.id}
                      onClick={() => runCommand(item)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                        )}
                      </div>
                      {isActive && <ArrowRight size={12} className="text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded">↑↓</kbd> Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded">↵</kbd> Abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted px-1.5 py-0.5 rounded">Esc</kbd> Cerrar
            </span>
          </div>
          <span>{allItems.length} resultado{allItems.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Hook que escucha Cmd+K / Ctrl+K
// ─────────────────────────────────────────────
export function useCommandPaletteShortcut(setOpen: (v: boolean) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
