"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, Filter,
  Building2, ChevronDown, ChevronUp, Plus, Pencil, Trash2, FileText,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CertificadosManager } from "@/components/certificados/CertificadosManager";

// ─── Types ───────────────────────────────────────────────────
type CertificadoDashboard = {
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
      return <Badge className="bg-green-100 text-green-800 border-green-300"><ShieldCheck className="w-3 h-3 mr-1" />Activo</Badge>;
    case "proximo_caducar":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300"><ShieldAlert className="w-3 h-3 mr-1" />Prox. caducar</Badge>;
    case "caducado":
      return <Badge className="bg-red-100 text-red-800 border-red-300"><ShieldX className="w-3 h-3 mr-1" />Caducado</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
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
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────
export default function CertificadosDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<CertificadoDashboard[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, activos: 0, proximosCaducar: 0, caducados: 0 });
  const [filter, setFilter] = useState<FilterType>("todos");
  const [search, setSearch] = useState("");
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await authenticatedFetch("/asesor/certificados/proximos-caducar");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
        setResumen(data.resumen || { total: 0, activos: 0, proximosCaducar: 0, caducados: 0 });
      }
    } catch (err) {
      console.error("Error fetching certificados dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filtering ──
  const filtered = todos.filter(c => {
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

  // ── Group by empresa ──
  const grouped: Record<string, { nombre: string; nif: string | null; certs: CertificadoDashboard[] }> = {};
  for (const c of filtered) {
    if (!grouped[c.empresa_id]) {
      grouped[c.empresa_id] = { nombre: c.empresa_nombre, nif: c.empresa_nif, certs: [] };
    }
    grouped[c.empresa_id].certs.push(c);
  }

  // Sort groups: those with expiring/expired first
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aMin = Math.min(...a.certs.map(c => c.dias_hasta_caducidad));
    const bMin = Math.min(...b.certs.map(c => c.dias_hasta_caducidad));
    return aMin - bMin;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Certificados Digitales
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vista consolidada de certificados de todos los clientes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setFilter("todos")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{resumen.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200"
          onClick={() => setFilter("activos")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{resumen.activos}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200"
          onClick={() => setFilter("proximo_caducar")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{resumen.proximosCaducar}</p>
            <p className="text-xs text-muted-foreground">Prox. caducar</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200"
          onClick={() => setFilter("caducados")}>
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
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filter} onValueChange={v => setFilter(v as FilterType)}>
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

      {/* Grouped list */}
      {sortedGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {todos.length === 0
              ? "No hay certificados registrados en ninguno de tus clientes."
              : "No se encontraron certificados con los filtros actuales."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map(([empresaId, group]) => (
            <Card key={empresaId}>
              <CardHeader className="pb-2 cursor-pointer"
                onClick={() => setExpandedEmpresa(expandedEmpresa === empresaId ? null : empresaId)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">{group.nombre}</CardTitle>
                    {group.nif && <span className="text-xs text-muted-foreground">({group.nif})</span>}
                    <Badge variant="outline" className="text-xs">{group.certs.length} cert.</Badge>
                    {group.certs.some(c => c.estado_calculado === "caducado") && (
                      <Badge className="bg-red-100 text-red-800 text-xs">Caducado</Badge>
                    )}
                    {group.certs.some(c => c.estado_calculado === "proximo_caducar") && (
                      <Badge className="bg-amber-100 text-amber-800 text-xs">Prox. caducar</Badge>
                    )}
                  </div>
                  {expandedEmpresa === empresaId
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>

              {/* Collapsed: show summary row per cert */}
              {expandedEmpresa !== empresaId && (
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1">
                    {group.certs.map(cert => (
                      <div key={cert.id} className="flex items-center gap-2 text-sm">
                        {estadoBadge(cert.estado_calculado)}
                        <span className="font-medium truncate">{cert.nombre}</span>
                        <span className="text-muted-foreground">- {cert.titular_nombre} ({cert.titular_nif})</span>
                        <span className={`ml-auto text-xs ${diasColor(cert.dias_hasta_caducidad)}`}>
                          {cert.dias_hasta_caducidad > 0
                            ? `${cert.dias_hasta_caducidad}d`
                            : `${Math.abs(cert.dias_hasta_caducidad)}d caducado`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}

              {/* Expanded: full management component */}
              {expandedEmpresa === empresaId && (
                <CardContent className="pt-0">
                  <CertificadosManager empresaId={empresaId} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
