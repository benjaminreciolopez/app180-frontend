"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, X, RefreshCw, FileSignature, Plus, FileSpreadsheet, Inbox, FileUp, UserCog, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import ImportCsvDialog, { ResumenFacturas, ResultadoFacturas } from "@/components/shared/ImportCsvDialog";
import ImportPdfFacturaDialog from "@/components/shared/ImportPdfFacturaDialog";

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  subtotal: number;
  total: number;
  estado: string;
  importada?: boolean;
  creada_por_asesor_id?: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

type SortField = "numero" | "fecha" | "cliente_nombre" | "estado" | "total";
type SortDir = "asc" | "desc";
const CLIENTE_SORT_KEY = "facturas_cliente_sort_v1";
const DEFAULT_CLIENTE_SORT: { field: SortField; dir: SortDir } = { field: "fecha", dir: "desc" };

function readClienteSort(): { field: SortField; dir: SortDir } {
  if (typeof window === "undefined") return DEFAULT_CLIENTE_SORT;
  try {
    const raw = localStorage.getItem(CLIENTE_SORT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.field && parsed?.dir) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_CLIENTE_SORT;
}

export default function AsesorClienteFacturasPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const [importOpen, setImportOpen] = useState(false);
  const [importPdfOpen, setImportPdfOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>(readClienteSort);

  useEffect(() => {
    try { localStorage.setItem(CLIENTE_SORT_KEY, JSON.stringify(sort)); } catch { /* ignore */ }
  }, [sort]);

  const toggleSort = (field: SortField) => {
    setSort(prev => prev.field === field
      ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { field, dir: field === "total" || field === "fecha" ? "desc" : "asc" }
    );
  };

  useEffect(() => {
    loadFacturas();
  }, [empresaId]);

  async function loadFacturas() {
    try {
      setLoading(true);
      const res = await api.get("/admin/facturacion/facturas");
      const arr = res.data?.data ?? res.data?.facturas ?? res.data;
      setFacturas(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const base = facturas.filter((f) => {
      const fecha = f.fecha?.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sort.field) {
        case "total":
          return (parseFloat(String(a.total)) - parseFloat(String(b.total))) * dir;
        case "fecha":
          return (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * dir;
        case "cliente_nombre":
          return (a.cliente_nombre || "").localeCompare(b.cliente_nombre || "", "es", { sensitivity: "base" }) * dir;
        case "estado":
          return (a.estado || "").localeCompare(b.estado || "") * dir;
        case "numero":
        default: {
          const an = a.numero || "";
          const bn = b.numero || "";
          if (!an && !bn) return (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * dir;
          if (!an) return 1;
          if (!bn) return -1;
          return an.localeCompare(bn, undefined, { numeric: true }) * dir;
        }
      }
    });
  }, [facturas, desde, hasta, sort]);

  if (loading) return <LoadingSpinner fullPage />;

  const totalImporte = filtered.reduce((s, f) => s + (parseFloat(String(f.total)) || 0), 0);
  const hasFilter = desde || hasta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Facturas del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} facturas - {formatCurrency(totalImporte)} total
            {hasFilter && facturas.length !== filtered.length && ` (de ${facturas.length})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/asesor/clientes/${empresaId}/facturas/recurrentes`}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            <RefreshCw size={13} />
            Recurrentes
          </Link>
          <Link
            href={`/asesor/clientes/${empresaId}/facturas/proformas`}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            <FileSignature size={13} />
            Nueva proforma
          </Link>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            <FileSpreadsheet size={13} />
            Importar CSV/Excel
          </button>
          <button
            type="button"
            onClick={() => setImportPdfOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            <FileUp size={13} />
            Importar PDF
          </button>
          <Link
            href={`/asesor/clientes/${empresaId}/facturas/crear`}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={13} />
            Nueva factura
          </Link>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm bg-background"
          />
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={() => { setDesde(""); setHasta(""); }}>
            <X className="size-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {hasFilter ? "No hay facturas en este rango de fechas" : "El cliente no tiene facturas emitidas"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ImportPdfFacturaDialog
        open={importPdfOpen}
        onOpenChange={setImportPdfOpen}
        onCreated={async () => {
          try {
            const res = await api.get("/admin/facturacion/facturas");
            const arr = res.data?.data ?? res.data?.facturas ?? res.data;
            setFacturas(Array.isArray(arr) ? arr : []);
          } catch { /* silent */ }
        }}
      />

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        titulo="Importar facturas históricas"
        descripcion="Sube un CSV o XLSX con las facturas que el cliente ya tenía emitidas antes de gestionarlas con la app. Auto-creará los clientes finales que no existan y vinculará a asientos contables si los encuentra."
        plantillaUrl="/api/admin/import/facturas/plantilla"
        previewUrl="/api/admin/import/facturas/preview"
        confirmUrl="/api/admin/import/facturas/confirmar"
        renderResumen={(p) => <ResumenFacturas preview={p} />}
        renderResultado={(r) => <ResultadoFacturas resultado={r} />}
        onCompleted={async () => {
          // Recargar listado tras importar
          try {
            const res = await api.get("/admin/facturacion/facturas");
            const arr = res.data?.data ?? res.data?.facturas ?? res.data;
            setFacturas(Array.isArray(arr) ? arr : []);
          } catch { /* silent */ }
        }}
      />

      {filtered.length === 0 ? null : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturas emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cabecera ordenable (desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-1 pb-2 mb-1 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ClienteSortHeader field="numero" label="Número" sort={sort} onSort={toggleSort} className="col-span-3" />
              <ClienteSortHeader field="cliente_nombre" label="Cliente" sort={sort} onSort={toggleSort} className="col-span-3" />
              <ClienteSortHeader field="fecha" label="Fecha" sort={sort} onSort={toggleSort} className="col-span-2" />
              <ClienteSortHeader field="estado" label="Estado" sort={sort} onSort={toggleSort} className="col-span-2" />
              <ClienteSortHeader field="total" label="Total" sort={sort} onSort={toggleSort} align="right" className="col-span-2" />
            </div>

            {/* Selector de orden compacto (móvil) */}
            <div className="md:hidden flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
              <span className="text-muted-foreground">Orden:</span>
              {(["numero","cliente_nombre","fecha","estado","total"] as SortField[]).map((f) => {
                const labels: Record<SortField, string> = {
                  numero: "Número", cliente_nombre: "Cliente", fecha: "Fecha", estado: "Estado", total: "Total",
                };
                const active = sort.field === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleSort(f)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${active ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    {labels[f]}
                    {active ? (sort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} className="opacity-40" />}
                  </button>
                );
              })}
            </div>

            <div className="divide-y">
              {filtered.map((f) => (
                <div key={f.id} className="py-3 first:pt-0 last:pb-0">
                  {/* Vista móvil */}
                  <div className="md:hidden flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{f.numero}</p>
                        <Badge
                          variant={f.estado === "pagada" ? "default" : f.estado === "pendiente" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {f.estado}
                        </Badge>
                        {f.importada && (
                          <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50">
                            <Inbox size={10} className="mr-0.5" /> Importada
                          </Badge>
                        )}
                        {f.creada_por_asesor_id && (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
                            <UserCog size={10} className="mr-0.5" /> Emitida por gestor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {f.cliente_nombre} - {new Date(f.fecha).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(parseFloat(String(f.total)) || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Base: {formatCurrency(parseFloat(String(f.subtotal)) || 0)}</p>
                    </div>
                  </div>

                  {/* Vista desktop alineada con cabeceras */}
                  <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-3 flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-medium text-sm truncate">{f.numero}</span>
                      {f.importada && (
                        <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50 shrink-0">
                          <Inbox size={10} className="mr-0.5" /> Importada
                        </Badge>
                      )}
                      {f.creada_por_asesor_id && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 shrink-0">
                          <UserCog size={10} className="mr-0.5" /> Gestor
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-3 text-sm truncate">{f.cliente_nombre}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{new Date(f.fecha).toLocaleDateString("es-ES")}</div>
                    <div className="col-span-2">
                      <Badge
                        variant={f.estado === "pagada" ? "default" : f.estado === "pendiente" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {f.estado}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-bold text-sm">{formatCurrency(parseFloat(String(f.total)) || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Base: {formatCurrency(parseFloat(String(f.subtotal)) || 0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClienteSortHeader({
  field,
  label,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  field: SortField;
  label: string;
  sort: { field: SortField; dir: SortDir };
  onSort: (f: SortField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = sort.field === field;
  const justify = align === "right" ? "justify-end" : "justify-start";
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 ${justify} hover:text-foreground transition-colors cursor-pointer select-none ${isActive ? "text-foreground" : ""} ${className}`}
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      {isActive
        ? (sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
        : <ChevronsUpDown size={12} className="opacity-40" />}
    </button>
  );
}
