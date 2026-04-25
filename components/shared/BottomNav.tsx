"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export interface BottomNavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
  match?: (pathname: string) => boolean;
  onClick?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

/**
 * Barra de navegación principal PWA móvil.
 * Inline en el flujo (debajo del header), no fixed — el contenido scrollea bajo ella.
 *
 * Cada item recibe el icono y label. El estado activo se calcula
 * por coincidencia exacta o por la función `match` si se proporciona.
 */
export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  function isActive(item: BottomNavItem) {
    if (item.match) return item.match(pathname);
    if (!item.href) return false;
    if (item.href === "/admin/dashboard" || item.href === "/asesor/dashboard") {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <nav
      className="z-30 border-b border-border bg-card/95 backdrop-blur-xl shrink-0"
      aria-label="Navegación principal"
    >
      <ul className="grid grid-flow-col auto-cols-fr">
        {items.map((item, idx) => {
          const active = isActive(item);
          const Icon = item.icon;
          const content = (
            <div
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </div>
          );

          return (
            <li key={`${item.label}-${idx}`}>
              {item.href ? (
                <Link href={item.href} className="block w-full active:bg-muted/40">
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="block w-full active:bg-muted/40"
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
