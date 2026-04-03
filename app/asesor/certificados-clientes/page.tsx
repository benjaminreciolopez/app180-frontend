"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldAlert, ShieldX, Filter,
  Building2, ExternalLink, AlertTriangle,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────
type CertificadoCliente = {
  id: string;
  empresa_id: string;
  empresa_nombre: string;
  empresa_nif: string | null;
  nombre: string;
  tipo: string;
  titular_nombre: string;
  titular_nif: string;
  emisor: string | null;
  fecha_caducidad: string;
  estado: string;
  estado_calculado: string;
  dias_hasta_caducidad: number;
  instalado_en: string[] | null;
};

type Resumen = {
  total: number;
  activos: number;
  proximosCaducar: number;
  caducados: number;
};

type FilterType = "todos" | "activos" | "proximo_caducar" | "caducados";

// ─── Helpers ─────────────────────────────────────────────────
function estadoBadge(estado: string) {
  switch (estado) {
    case "activo":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <ShieldCheck className="w-3 h-3 mr-1" />Activo
        </Badge>
      );
    case "proximo_caducar":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
          <ShieldAlert className="w-3 h-3 mr-1" />Prox. caducar
        </Badge>
      );
    case "caducado":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <ShieldX className="w-3 h-3 mr-1" />Caducado
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

function diasLabel(dias: number): string {
  if (dias < 0) return `Caducado hace ${Math.abs(dias)}d`;
  if (dias === 0) return "Caduca hoy";
  return `${dias}d restantes`;
}

function rowBorderColor(estado: string): string {
  switch (estado) {
    case "caducado":
      return "border-l-4 border-l-red-500";
    case "proximo_caducar":
      return "border-l-4 border-l-amber-500";
    default:
      return "border-l-4 border-l-green-500";
  }
}

function diasColor(dias: number): string {
  if (dias < 0) return "text-red-600 font-bold";
  if (dias <= 30) return "text-red-500 font-semibold";
  if (dias <= 60) return "text-amber-500 font-semibold";
  return "text-green-600";
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page ────────────────────────────────────────────────────
export default function CertificadosClientesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState<CertificadoCliente[]>([]);
  const [resumen, setResumen] = useState<Resumen>({
    total: 0, activos: 0, proximosCaducar: 0, caducados: 0,
  });
  const [filter, setFilter] = useState<FilterType>("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const res = await authenticatedFetch("/asesor/certificados/proximos-caducar");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        const certs: CertificadoCliente[] = data.todos || [];
        // Sort by expiry date ascending (most urgent first)
        certs.sort((a, b) => a.dias_hasta_caducidad - b.dias_hasta_caducidad);
        setTodos(certs);
        setResumen(data.resumen || { total: 0, activos: 0, proximosCaducar: 0, caducados: 0 });
      } catch (err) {
        console.error("Error fetching certificados clientes", err);
        setError(err instanceof Error ? err.message : "Error al cargar los certificados");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Filtering ──
  const filtered = todos.filter((c) => {
    if (filter === "activos" && c.estado_calculado !== "activo") return false;
    if (filter === "proximo_caducar" && c.estado_calculado !== "proximo_caducar") return false;
    if (filter === "caducados" && c.estado_calculado !== "caducado") return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(s) ||
        c.titular_nombre.toLowerCase().includes(s) ||
        c.titular_nif.toLowerCase().includes(s) ||
        c.empresa_nombre.toLowerCase().includes(s) ||
        (c.empresa_nif && c.empresa_nif.toLowerCase().includes(s))
      );
    }
    return true;
  });

  // ── Loading state ──
  if (loading) return <LoadingSpinner />;

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-lg font-medium text-red-700">Error al cargar certificados</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Certificados Digitales &mdash; Clientes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Estado de los certificados digitales de tus clientes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setFilter("todos")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{resumen.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-green-200"
          onClick={() => setFilter("activos")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{resumen.activos}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-amber-200"
          onClick={() => setFilter("proximo_caducar")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{resumen.proximosCaducar}</p>
            <p className="text-xs text-muted-foreground">Prox. caducar</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-red-200"
          onClick={() => setFilter("caducados")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{resumen.caducados}</p>
            <p className="text-xs text-muted-foreground">Caducados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nombre, titular, NIF, empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="proximo_caducar">Prox. a caducar</SelectItem>
            <SelectItem value="caducados">Caducados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificate list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {todos.length === 0
              ? "No hay certificados registrados en ninguno de tus clientes."
              : "No se encontraron certificados con los filtros actuales."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table header (desktop) */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr_120px_100px_100px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Empresa</span>
            <span>Certificado</span>
            <span>Titular</span>
            <span>Caducidad</span>
            <span>Tiempo</span>
            <span>Estado</span>
          </div>

          {filtered.map((cert) => (
            <Link
              key={cert.id}
              href={`/asesor/clientes/${cert.empresa_id}/certificados`}
              className="block"
            >
              <Card
                className={`hover:shadow-md transition-shadow cursor-pointer ${rowBorderColor(cert.estado_calculado)}`}
              >
                <CardContent className="p-4">
                  {/* Desktop layout */}
                  <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr_120px_100px_100px] gap-3 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{cert.empresa_nombre}</p>
                        {cert.empresa_nif && (
                          <p className="text-xs text-muted-foreground">{cert.empresa_nif}</p>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{cert.nombre}</p>
                      <p className="text-xs text-muted-foreground capitalize">{cert.tipo}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{cert.titular_nombre}</p>
                      <p className="text-xs text-muted-foreground">{cert.titular_nif}</p>
                    </div>
                    <span className="text-sm">{formatDate(cert.fecha_caducidad)}</span>
                    <span className={`text-sm ${diasColor(cert.dias_hasta_caducidad)}`}>
                      {diasLabel(cert.dias_hasta_caducidad)}
                    </span>
                    <div className="flex items-center gap-1">
                      {estadoBadge(cert.estado_calculado)}
                      <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{cert.empresa_nombre}</span>
                      </div>
                      {estadoBadge(cert.estado_calculado)}
                    </div>
                    <div className="pl-6 space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Cert: </span>
                        {cert.nombre}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Titular: </span>
                        {cert.titular_nombre} ({cert.titular_nif})
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Caduca: </span>
                          {formatDate(cert.fecha_caducidad)}
                        </p>
                        <span className={`text-sm ${diasColor(cert.dias_hasta_caducidad)}`}>
                          {diasLabel(cert.dias_hasta_caducidad)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Results count */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Mostrando {filtered.length} de {todos.length} certificados
          </p>
        </div>
      )}
    </div>
  );
}
