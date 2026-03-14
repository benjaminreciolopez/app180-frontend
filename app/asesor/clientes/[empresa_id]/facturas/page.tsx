"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Euro } from "lucide-react";

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  base_imponible: number;
  total: number;
  estado: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function AsesorClienteFacturasPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState<Factura[]>([]);

  useEffect(() => {
    // Set context for API calls
    sessionStorage.setItem("asesor_empresa_id", empresaId);
    loadFacturas();
  }, [empresaId]);

  async function loadFacturas() {
    try {
      setLoading(true);
      const res = await api.get("/admin/facturacion/facturas");
      setFacturas(res.data?.facturas || res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const totalImporte = facturas.reduce((s, f) => s + (f.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/asesor/clientes/${empresaId}`)}
          className="gap-1"
        >
          <ArrowLeft size={16} />
          Volver al cliente
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Facturas del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {facturas.length} facturas - {formatCurrency(totalImporte)} total
          </p>
        </div>
      </div>

      {facturas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">El cliente no tiene facturas emitidas</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturas emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {facturas.map((f) => (
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
                    <p className="font-bold text-sm">{formatCurrency(f.total)}</p>
                    <p className="text-[10px] text-muted-foreground">Base: {formatCurrency(f.base_imponible)}</p>
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
