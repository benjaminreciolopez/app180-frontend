"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, ArrowDownRight, Euro } from "lucide-react";

interface Pago {
  id: string;
  tipo: "cobro" | "pago";
  concepto: string;
  importe: number;
  fecha: string;
  estado: string;
  entidad_nombre?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

export default function AsesorPagosPage() {
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<Pago[]>([]);

  async function loadPagos() {
    try {
      setLoading(true);
      const res = await api.get("/admin/payments");
      setPagos(res.data?.pagos || res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPagos();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const cobros = pagos.filter((p) => p.tipo === "cobro");
  const gastos = pagos.filter((p) => p.tipo === "pago");
  const totalCobros = cobros.reduce((s, p) => s + p.importe, 0);
  const totalGastos = gastos.reduce((s, p) => s + p.importe, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cobros y Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Gestion financiera de tu asesoria
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowDownRight size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobros</p>
                <p className="text-xl font-bold">
                  {formatCurrency(totalCobros)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cobros.length} registros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowUpRight size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagos</p>
                <p className="text-xl font-bold">
                  {formatCurrency(totalGastos)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {gastos.length} registros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Euro size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p
                  className={`text-xl font-bold ${
                    totalCobros - totalGastos >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(totalCobros - totalGastos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {pagos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
            />
            <p className="text-muted-foreground">
              No hay cobros ni pagos registrados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pagos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    {p.tipo === "cobro" ? (
                      <ArrowDownRight
                        size={16}
                        className="text-green-500"
                      />
                    ) : (
                      <ArrowUpRight size={16} className="text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{p.concepto}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.fecha).toLocaleDateString("es-ES")}
                        {p.entidad_nombre && ` - ${p.entidad_nombre}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-sm ${
                        p.tipo === "cobro" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {p.tipo === "cobro" ? "+" : "-"}
                      {formatCurrency(p.importe)}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {p.estado}
                    </Badge>
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
