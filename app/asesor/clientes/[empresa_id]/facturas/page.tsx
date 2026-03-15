"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  subtotal: number;
  total: number;
  estado: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function AsesorClienteFacturasPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

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
    return facturas.filter((f) => {
      const fecha = f.fecha?.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [facturas, desde, hasta]);

  if (loading) return <LoadingSpinner fullPage />;

  const totalImporte = filtered.reduce((s, f) => s + (parseFloat(String(f.total)) || 0), 0);
  const hasFilter = desde || hasta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Facturas del cliente</h1>
        <p className="text-xs text-muted-foreground">
          {filtered.length} facturas - {formatCurrency(totalImporte)} total
          {hasFilter && facturas.length !== filtered.length && ` (de ${facturas.length})`}
        </p>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturas emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filtered.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{f.numero}</p>
                      <Badge
                        variant={f.estado === "pagada" ? "default" : f.estado === "pendiente" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {f.estado}
                      </Badge>
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
