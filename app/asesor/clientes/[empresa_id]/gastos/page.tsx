"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, X } from "lucide-react";

interface Gasto {
  id: string;
  numero_factura?: string;
  descripcion: string;
  proveedor?: string;
  fecha_compra: string;
  base_imponible: string | number;
  total: string | number;
  categoria?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function AsesorClienteGastosPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    loadGastos();
  }, [empresaId]);

  async function loadGastos() {
    try {
      setLoading(true);
      const res = await api.get("/admin/purchases");
      const arr = res.data?.data ?? res.data?.gastos ?? res.data;
      setGastos(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return gastos.filter((g) => {
      const fecha = g.fecha_compra?.slice(0, 10);
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      return true;
    });
  }, [gastos, desde, hasta]);

  if (loading) return <LoadingSpinner fullPage />;

  const totalGastos = filtered.reduce((s, g) => s + (parseFloat(String(g.total)) || 0), 0);
  const hasFilter = desde || hasta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Gastos del cliente</h1>
        <p className="text-xs text-muted-foreground">
          {filtered.length} gastos - {formatCurrency(totalGastos)} total
          {hasFilter && gastos.length !== filtered.length && ` (de ${gastos.length})`}
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
            <Receipt size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {hasFilter ? "No hay gastos en este rango de fechas" : "El cliente no tiene gastos registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filtered.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{g.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.proveedor && `${g.proveedor} - `}
                      {new Date(g.fecha_compra).toLocaleDateString("es-ES")}
                    </p>
                    {g.categoria && (
                      <Badge variant="outline" className="text-[10px] mt-1">{g.categoria}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(parseFloat(String(g.total)) || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">Base: {formatCurrency(parseFloat(String(g.base_imponible)) || 0)}</p>
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
