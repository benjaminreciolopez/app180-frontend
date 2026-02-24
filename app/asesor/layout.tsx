"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";

type AsesorUser = {
  id: string;
  nombre: string;
  email: string;
  role: string;
};

function getUser(): AsesorUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const menuItems = [
  {
    path: "/asesor/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/asesor/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    path: "/asesor/configuracion",
    label: "Configuracion",
    icon: Settings,
  },
];

export default function AsesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AsesorUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== "asesor") {
      setUser(null);
      setChecking(false);
      return;
    }
    setUser(currentUser);
    setChecking(false);
  }, []);

  // Listen for session updates
  useEffect(() => {
    function onSessionUpdated() {
      const currentUser = getUser();
      if (!currentUser || currentUser.role !== "asesor") {
        setUser(null);
        return;
      }
      setUser(currentUser);
    }

    window.addEventListener("session-updated", onSessionUpdated);
    return () => {
      window.removeEventListener("session-updated", onSessionUpdated);
    };
  }, []);

  // Dynamic page title
  useEffect(() => {
    const titles: Record<string, string> = {
      "/asesor/dashboard": "Dashboard",
      "/asesor/clientes": "Clientes",
      "/asesor/configuracion": "Configuracion",
    };

    const match = Object.entries(titles)
      .sort(([a], [b]) => b.length - a.length)
      .find(([p]) => pathname.startsWith(p));

    document.title = match
      ? `${match[1]} | CONTENDO Asesoria`
      : "CONTENDO ASESORIA";
  }, [pathname]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("asesor_empresa_id");
    window.dispatchEvent(new Event("session-updated"));
    location.href = "/login";
  }

  // Loading state
  if (checking) {
    return <LoadingSpinner fullPage />;
  }

  // Not authenticated or wrong role
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="flex h-[100svh] w-full overflow-hidden">
      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border p-5
          transform transition-all duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:flex md:flex-col
          flex flex-col overflow-hidden
          ${
            !menuOpen
              ? "pointer-events-none opacity-0 md:opacity-100 md:pointer-events-auto"
              : "pointer-events-auto opacity-100"
          }
        `}
      >
        {/* Mobile close */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
            Cerrar
          </button>
        </div>

        {/* Branding */}
        <div className="relative z-10 mb-8">
          <div className="flex items-center gap-2">
            <Briefcase size={22} className="text-primary" />
            <div>
              <h2 className="text-xl font-bold tracking-wide">CONTENDO</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] -mt-1">
                Asesoria
              </p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(item.path + "/");
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="mb-3">
            <p className="text-sm font-semibold truncate">{user.nombre}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut size={16} className="mr-2" />
            Cerrar sesion
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 bg-background h-[100svh] flex flex-col relative min-w-0 w-full md:w-auto overflow-x-hidden">
        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-20">
          <div className="w-10" />

          <div className="flex-1 flex justify-center">
            <h1 className="text-sm font-bold tracking-[0.3em] text-foreground/80 uppercase">
              CONTENDO ASESORIA
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold leading-none">
                {user.nombre}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mt-1">
                Portal Asesor
              </p>
            </div>

            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {user.nombre.charAt(0).toUpperCase()}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar sesion"
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors ml-2"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b flex items-center justify-between h-14 px-4 shrink-0">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
            className="p-2 border rounded"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xs font-bold tracking-wider text-foreground/80 uppercase">
            CONTENDO ASESORIA
          </h1>
          <div className="w-10" />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
