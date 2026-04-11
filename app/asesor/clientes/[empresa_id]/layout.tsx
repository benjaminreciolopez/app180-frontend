"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  FileText,
  ReceiptEuro,
  Users,
  Calculator,
  ShieldCheck,
  MessageSquare,
  FolderOpen,
  Banknote,
  Briefcase,
  Radio,
  Wallet,
  Building,
  KeyRound,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ClienteInfo = {
  nombre: string;
  cif?: string;
};

const tabs = [
  {
    label: "Resumen",
    icon: LayoutDashboard,
    segment: "", // matches /asesor/clientes/[id] exactly
  },
  {
    label: "Facturas",
    icon: FileText,
    segment: "facturas",
  },
  {
    label: "Gastos",
    icon: ReceiptEuro,
    segment: "gastos",
  },
  {
    label: "Contabilidad",
    icon: ShieldCheck,
    segment: "contabilidad",
  },
  {
    label: "Fiscal",
    icon: Calculator,
    segment: "fiscal",
  },
  {
    label: "Renta",
    icon: Wallet,
    segment: "renta",
  },
  {
    label: "Sociedades",
    icon: Building,
    segment: "sociedades",
  },
  {
    label: "Empleados",
    icon: Users,
    segment: "empleados",
  },
  {
    label: "Laboral",
    icon: Briefcase,
    segment: "laboral",
  },
  {
    label: "Nóminas",
    icon: Banknote,
    segment: "nominas",
  },
  {
    label: "SII",
    icon: Radio,
    segment: "sii",
  },
  {
    label: "Certificados",
    icon: KeyRound,
    segment: "certificados",
  },
  {
    label: "Documentos",
    icon: FolderOpen,
    segment: "documentos",
  },
  {
    label: "Mensajes",
    icon: MessageSquare,
    segment: "mensajes",
  },
];

export default function AsesorClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [cliente, setCliente] = useState<ClienteInfo | null>(null);

  const basePath = `/asesor/clientes/${empresaId}`;

  // --- Historial de navegación dentro del cliente ---
  const navHistory = useRef<string[]>([]);
  const lastPathRef = useRef<string>("");

  // Registrar cada cambio de pathname en el historial interno
  useEffect(() => {
    if (pathname && pathname !== lastPathRef.current && pathname.startsWith(basePath)) {
      // Solo añadir si es distinta a la última
      if (navHistory.current[navHistory.current.length - 1] !== pathname) {
        navHistory.current.push(pathname);
      }
      lastPathRef.current = pathname;
    }
  }, [pathname, basePath]);

  // Función para volver atrás DENTRO del cliente
  const handleGoBack = () => {
    // Quitar la página actual del historial
    navHistory.current.pop();
    const prev = navHistory.current[navHistory.current.length - 1];
    if (prev && prev.startsWith(basePath)) {
      router.push(prev);
    } else {
      // Si no hay historial previo, ir al resumen del cliente
      router.push(basePath);
    }
  };

  // Set asesor_empresa_id SYNCHRONOUSLY so child useEffects see it immediately
  // (child useEffects fire before parent useEffects in React)
  if (typeof window !== "undefined" && empresaId) {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
  }

  // Fetch client name
  const fetchCliente = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/resumen`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setCliente({
          nombre: json.data.nombre || "Cliente",
          cif: json.data.cif,
        });
      }
    } catch {
      // Non-critical
    }
  }, [empresaId]);

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  // Determine active tab
  function getActiveSegment(): string {
    const afterBase = pathname.replace(basePath, "").replace(/^\//, "");
    const firstSegment = afterBase.split("/")[0] || "";
    return firstSegment;
  }

  const activeSegment = getActiveSegment();

  // Don't show tabs on mensajes page (it has its own full-height chat UI)
  const isChatPage = activeSegment === "mensajes";

  // Hay historial para volver atrás dentro del cliente?
  const canGoBack = navHistory.current.length > 1;

  // Abrir tab en ventana nueva (multitarea)
  const handleOpenInNewWindow = (segment: string) => {
    const href = segment === "" ? basePath : `${basePath}/${segment}`;
    window.open(href, "_blank", "noopener");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Client context banner */}
      <div className="sticky top-0 z-10 bg-white dark:bg-card border-b">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Botón: Volver a lista de clientes */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("asesor_empresa_id");
                router.push("/asesor/clientes");
              }}
              className="gap-1 shrink-0 text-muted-foreground hover:text-foreground"
              title="Volver a lista de clientes"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Clientes</span>
            </Button>

            {/* Botón: Atrás dentro del cliente */}
            {canGoBack && (
              <>
                <div className="h-5 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="gap-1 shrink-0 h-8 px-2 text-muted-foreground hover:text-foreground"
                  title="Volver al tab anterior"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden md:inline text-xs">Atrás</span>
                </Button>
              </>
            )}

            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {cliente?.nombre || "Cargando..."}
                </h2>
                {cliente?.cif && (
                  <p className="text-[10px] text-muted-foreground">
                    {cliente.cif}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400 shrink-0"
          >
            Contexto cliente
          </Badge>
        </div>

        {/* Sub-navigation tabs */}
        {!isChatPage && (
          <div className="px-4 md:px-6 border-t bg-slate-50/50 dark:bg-muted/30">
            <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar -mb-px">
              {tabs.map((tab) => {
                const isActive = activeSegment === tab.segment;
                const href =
                  tab.segment === ""
                    ? basePath
                    : `${basePath}/${tab.segment}`;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.segment}
                    onClick={() => router.push(href)}
                    onAuxClick={(e) => {
                      // Click con rueda del ratón (botón medio) → abrir en nueva ventana
                      if (e.button === 1) {
                        e.preventDefault();
                        handleOpenInNewWindow(tab.segment);
                      }
                    }}
                    onContextMenu={(e) => {
                      // Permitimos el menú contextual nativo del navegador para "Abrir en pestaña nueva"
                    }}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer relative",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon
                      size={14}
                      className={cn(
                        isActive ? "text-primary" : "text-muted-foreground/70"
                      )}
                    />
                    {tab.label}
                    {/* Botón para abrir en nueva ventana */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInNewWindow(tab.segment);
                      }}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-0.5 p-0.5 rounded hover:bg-muted"
                      title={`Abrir ${tab.label} en nueva ventana`}
                    >
                      <ExternalLink size={10} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Page content */}
      <div className={cn("flex-1", isChatPage ? "" : "p-4 md:p-6 overflow-y-auto")}>
        {children}
      </div>
    </div>
  );
}
