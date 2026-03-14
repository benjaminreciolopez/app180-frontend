"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt } from "lucide-react";

interface Gasto {
  id: string;
  numero?: string;
  concepto: string;
  proveedor_nombre?: string;
  fecha: string;
  base_imponible: number;
  total: number;
  categoria?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function AsesorClienteGastosPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  useEffect(() => {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
    loadGastos();
  }, [empresaId]);

  async function loadGastos() {
    try {
      setLoading(true);
      const res = await api.get("/admin/gastos");
      setGastos(res.data?.gastos || res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const totalGastos = gastos.reduce((s, g) => s + (g.total || 0), 0);

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
          <h1 className="text-xl font-bold tracking-tight">Gastos del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {gastos.length} gastos - {formatCurrency(totalGastos)} total
          </p>
        </div>
      </div>

      {gastos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">El cliente no tiene gastos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {gastos.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{g.concepto}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.proveedor_nombre && `${g.proveedor_nombre} - `}
                      {new Date(g.fecha).toLocaleDateString("es-ES")}
                    </p>
                    {g.categoria && (
                      <Badge variant="outline" className="text-[10px] mt-1">{g.categoria}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(g.total)}</p>
                    <p className="text-[10px] text-muted-foreground">Base: {formatCurrency(g.base_imponible)}</p>
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
