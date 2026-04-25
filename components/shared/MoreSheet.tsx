"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";

export interface MoreSheetItem {
  path: string;
  label: string;
}

export interface MoreSheetSection {
  title: string;
  items: MoreSheetItem[];
}

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  sections: MoreSheetSection[];
  title?: string;
}

/**
 * Bottom sheet estilo nativo: panel deslizable desde abajo con secciones de enlaces.
 * Usado por BottomNav cuando el item "Más" agrupa el resto del menú.
 */
export function MoreSheet({ open, onClose, sections, title = "Más opciones" }: MoreSheetProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-full hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {sections.map((section) => (
            <div key={section.title} className="mt-3 first:mt-0">
              <div className="px-3 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </span>
              </div>
              <ul className="bg-muted/30 rounded-xl overflow-hidden divide-y divide-border/40">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={onClose}
                      className="flex items-center px-4 py-3 text-sm font-medium active:bg-muted transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
