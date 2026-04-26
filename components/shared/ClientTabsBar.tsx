"use client";

import { useRef, useState, useEffect } from "react";
import { Building2, X, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { useClientTabs } from "@/contexts/ClientTabsContext";
import { cn } from "@/lib/utils";

/**
 * Barra de pestañas tipo navegador para gestionar varios clientes abiertos en paralelo.
 * Sólo se renderiza si hay tabs y estamos en escritorio.
 */
export function ClientTabsBar() {
  const { tabs, activeEmpresaId, closeTab, closeOthers, closeAll, goToTab } = useClientTabs();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; empresaId: string } | null>(null);

  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [tabs.length]);

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    if (!contextMenu) return;
    const onClick = () => setContextMenu(null);
    document.addEventListener("click", onClick);
    document.addEventListener("scroll", onClick, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("scroll", onClick, true);
    };
  }, [contextMenu]);

  if (tabs.length === 0) return null;

  function scroll(dir: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.6, 200);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <>
      <div className="hidden md:flex items-stretch border-b border-border bg-slate-100/60 dark:bg-muted/40 relative">
        {/* Flecha izquierda */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="px-1.5 hover:bg-muted text-muted-foreground"
            aria-label="Desplazar pestañas a la izquierda"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="flex items-stretch overflow-x-auto no-scrollbar flex-1"
        >
          {tabs.map((tab) => {
            const isActive = tab.empresaId === activeEmpresaId;
            return (
              <div
                key={tab.empresaId}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, empresaId: tab.empresaId });
                }}
                className={cn(
                  "group flex items-center gap-2 pl-3 pr-1 py-1.5 border-r border-border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors max-w-[200px]",
                  isActive
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => goToTab(tab.empresaId)}
                onMouseDown={(e) => {
                  // Click central (rueda) → cerrar tab (estilo navegador)
                  if (e.button === 1) {
                    e.preventDefault();
                    closeTab(tab.empresaId);
                  }
                }}
                title={tab.nombre}
              >
                <Building2 size={12} className={cn("shrink-0", isActive ? "text-primary" : "")} />
                <span className="truncate">{tab.nombre}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.empresaId);
                  }}
                  className={cn(
                    "p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20",
                    isActive && "opacity-100"
                  )}
                  aria-label={`Cerrar ${tab.nombre}`}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Flecha derecha */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="px-1.5 hover:bg-muted text-muted-foreground"
            aria-label="Desplazar pestañas a la derecha"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Botón opciones (cerrar todas) */}
        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Cerrar las ${tabs.length} pestañas de clientes abiertas?`)) closeAll();
          }}
          className="px-2 hover:bg-muted text-muted-foreground border-l border-border"
          title="Cerrar todas las pestañas"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Menú contextual click derecho */}
      {contextMenu && (
        <div
          className="fixed z-[150] bg-card border border-border rounded-md shadow-lg py-1 min-w-[180px] text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-muted"
            onClick={() => {
              closeTab(contextMenu.empresaId);
              setContextMenu(null);
            }}
          >
            Cerrar pestaña
          </button>
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-muted"
            onClick={() => {
              closeOthers(contextMenu.empresaId);
              setContextMenu(null);
            }}
          >
            Cerrar las demás
          </button>
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-muted text-red-600"
            onClick={() => {
              if (confirm("¿Cerrar todas las pestañas?")) closeAll();
              setContextMenu(null);
            }}
          >
            Cerrar todas
          </button>
        </div>
      )}
    </>
  );
}
