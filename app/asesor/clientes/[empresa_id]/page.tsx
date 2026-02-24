"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Receipt,
  Users as UsersIcon,
  Calculator,
  ExternalLink,
  MessageSquare,
  Download,
  Eye,
  Pencil,
  ShieldCheck,
  Building2,
  TrendingUp,
  Calendar,
  Briefcase,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Permisos = {
  facturas?: { read?: boolean; write?: boolean };
  gastos?: { read?: boolean; write?: boolean };
  clientes?: { read?: boolean; write?: boolean };
  empleados?: { read?: boolean; write?: boolean };
  nominas?: { read?: boolean; write?: boolean };
  fiscal?: { read?: boolean; write?: boolean };
  contabilidad?: { read?: boolean; write?: boolean };
  configuracion?: { read?: boolean; write?: boolean };
  [key: string]: { read?: boolean; write?: boolean } | undefined;
};

type ResumenData = {
  facturas_emitidas: { total: number; importe: number };
  gastos: { total: number; importe: number };
  empleados_activos: number;
  ultimo_modelo_fiscal: {
    modelo: string;
    periodo: string;
    anio: number;
  } | null;
  permisos: Permisos;
  anio: number;
  nombre?: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

type SectionLink = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  permisoKey: string;
};

const sectionLinks: SectionLink[] = [
  {
    key: "facturas",
    label: "Facturacion",
    description: "Facturas emitidas, listados y configuracion",
    icon: FileText,
    href: "/admin/facturacion",
    permisoKey: "facturas",
  },
  {
    key: "gastos",
    label: "Gastos",
    description: "Compras, gastos y proveedores",
    icon: Receipt,
    href: "/admin/gastos",
    permisoKey: "gastos",
  },
  {
    key: "empleados",
    label: "Empleados",
    description: "Plantilla, nominas y fichajes",
    icon: UsersIcon,
    href: "/admin/empleados",
    permisoKey: "empleados",
  },
  {
    key: "fiscal",
    label: "Modelos Fiscales",
    description: "Modelos 303, 130, 111, 115, 349",
    icon: Calculator,
    href: "/admin/fiscal",
    permisoKey: "fiscal",
  },
  {
    key: "contabilidad",
    label: "Contabilidad",
    description: "Libros contables, asientos y balances",
    icon: ShieldCheck,
    href: "/admin/contabilidad",
    permisoKey: "contabilidad",
  },
];

export default function AsesorClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResumenData | null>(null);
  const [exporting, setExporting] = useState(false);

  async function loadResumen() {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/resumen`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cargar el resumen");
      }
      setData(json.data);

      // Store empresa_id for subsequent admin section API calls
      sessionStorage.setItem("asesor_empresa_id", empresaId);
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (empresaId) {
      loadResumen();
    }
  }, [empresaId]);

  // Clean up asesor_empresa_id when leaving
  useEffect(() => {
    return () => {
      // Note: This runs on unmount. We keep asesor_empresa_id in session
      // since it's needed by the admin pages. It will be cleared when
      // the asesor returns to the client list or dashboard.
    };
  }, []);

  function hasPermiso(key: string): boolean {
    if (!data?.permisos) return false;
    const perm = data.permisos[key];
    return !!(perm?.read || perm?.write);
  }

  function getPermisoLevel(key: string): "read" | "write" | null {
    if (!data?.permisos) return null;
    const perm = data.permisos[key];
    if (perm?.write) return "write";
    if (perm?.read) return "read";
    return null;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/exportar`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al exportar");
      }
      // Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exportacion_${empresaId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Error al exportar datos");
    } finally {
      setExporting(false);
    }
  }

  function handleNavigateToSection(href: string) {
    // Ensure asesor_empresa_id is set before navigating
    sessionStorage.setItem("asesor_empresa_id", empresaId);
    router.push(href);
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={loadResumen}>
          Reintentar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            sessionStorage.removeItem("asesor_empresa_id");
            router.push("/asesor/clientes");
          }}
        >
          Volver a clientes
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const allowedSections = sectionLinks.filter((s) => hasPermiso(s.permisoKey));

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem("asesor_empresa_id");
              router.push("/asesor/clientes");
            }}
            className="gap-1"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {data.nombre || "Cliente"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Datos del ejercicio {data.anio}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              router.push(`/asesor/clientes/${empresaId}/mensajes`)
            }
          >
            <MessageSquare size={14} />
            Chat con Cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <LoadingSpinner size="sm" showText={false} />
            ) : (
              <Download size={14} />
            )}
            Exportar Datos
          </Button>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <FileText size={22} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Facturas emitidas
                </p>
                <p className="text-2xl font-bold">
                  {data.facturas_emitidas.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.facturas_emitidas.importe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Receipt size={22} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold">{data.gastos.total}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.gastos.importe)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <UsersIcon size={22} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Empleados activos
                </p>
                <p className="text-2xl font-bold">
                  {data.empleados_activos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Calculator size={22} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Ultimo modelo fiscal
                </p>
                {data.ultimo_modelo_fiscal ? (
                  <>
                    <p className="text-2xl font-bold">
                      {data.ultimo_modelo_fiscal.modelo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.ultimo_modelo_fiscal.periodo}{" "}
                      {data.ultimo_modelo_fiscal.anio}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Sin modelos presentados
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections grid (based on permissions) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Secciones disponibles</h2>
        {allowedSections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Briefcase
                size={40}
                className="mx-auto text-muted-foreground/30 mb-3"
              />
              <p className="text-muted-foreground">
                No tienes permisos asignados para este cliente.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Solicita al cliente que te otorgue acceso a las secciones
                necesarias.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedSections.map((section) => {
              const Icon = section.icon;
              const level = getPermisoLevel(section.permisoKey);

              return (
                <Card
                  key={section.key}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  onClick={() => handleNavigateToSection(section.href)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {level === "write" ? (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 bg-primary/5"
                          >
                            <Pencil size={10} />
                            Escritura
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs gap-1"
                          >
                            <Eye size={10} />
                            Lectura
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {section.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir seccion
                      <ExternalLink size={12} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de permisos</CardTitle>
          <CardDescription>
            Permisos otorgados por el cliente para acceder a sus datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sectionLinks.map((section) => {
              const perm = data.permisos[section.permisoKey];
              const hasRead = perm?.read;
              const hasWrite = perm?.write;
              const hasAny = hasRead || hasWrite;
              const Icon = section.icon;

              return (
                <div
                  key={section.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    hasAny
                      ? "border-border bg-card"
                      : "border-border/50 bg-muted/30 opacity-50"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      hasAny ? "text-primary" : "text-muted-foreground"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{section.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {hasRead && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Eye size={10} />
                          Lectura
                        </span>
                      )}
                      {hasWrite && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                          <Pencil size={10} />
                          Escritura
                        </span>
                      )}
                      {!hasAny && (
                        <span className="text-[10px] text-muted-foreground">
                          Sin acceso
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
