"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import {
  Calculator, Users, Building2, TrendingUp, TrendingDown,
  CheckCircle2, Clock, FileText, AlertCircle, ArrowRight,
} from "lucide-react";

interface ClienteRenta {
  empresa_id: string;
  nombre: string;
  tipo_contribuyente: string;
  renta_id: string | null;
  renta_estado: string | null;
  renta_resultado: string | null;
  renta_importe: number;
  renta_cuota_diferencial: number;
  renta_fecha_presentacion: string | null;
  is_id: string | null;
  is_estado: string | null;
  is_resultado: string | null;
  is_importe: number;
  is_cuota_diferencial: number;
  is_fecha_presentacion: string | null;
  is_fecha_limite: string | null;
}

interface CampanaData {
  ejercicio: number;
  autonomos: {
    clientes: ClienteRenta[];
    total: number;
    estados: Record<string, number>;
    total_a_pagar: number;
    total_a_devolver: number;
  };
  sociedades: {
    clientes: ClienteRenta[];
    total: number;
    estados: Record<string, number>;
    total_a_pagar: number;
    total_a_devolver: number;
  };
  resumen: {
    total_clientes: number;
    total_a_pagar: number;
    total_a_devolver: number;
  };
}

const estadoConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  borrador: { label: "Borrador", variant: "outline", icon: FileText },
  en_progreso: { label: "En progreso", variant: "secondary", icon: Clock },
  calculado: { label: "Calculado", variant: "default", icon: Calculator },
  presentado: { label: "Presentado", variant: "default", icon: CheckCircle2 },
  sin_datos: { label: "Sin datos", variant: "outline", icon: AlertCircle },
};

function EstadoBadge({ estado }: { estado: string | null }) {
  const cfg = estadoConfig[estado || "sin_datos"] || estadoConfig.sin_datos;
  return (
    <Badge variant={cfg.variant} className={estado === "presentado" ? "bg-green-600 text-white" : ""}>
      {cfg.label}
    </Badge>
  );
}

export default function RentaCampanaPage() {
  const router = useRouter();
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState<CampanaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"autonomos" | "sociedades">("autonomos");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/asesor/fiscal/renta-campana/${ejercicio}`);
      if (!res.ok) throw new Error("Error al cargar campana");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la campana de renta");
    } finally {
      setLoading(false);
    }
  }, [ejercicio]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner fullPage />;

  const section = tab === "autonomos" ? data?.autonomos : data?.sociedades;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Campana Renta / IS {ejercicio}
          </h1>
          <p className="text-muted-foreground text-sm">
            Vista consolidada de la declaracion anual de todos los clientes
          </p>
        </div>
        <Select value={ejercicio.toString()} onValueChange={(v) => setEjercicio(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Ejercicio" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 - i).map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="w-4 h-4" /> Total clientes
              </div>
              <p className="text-2xl font-bold">{data.resumen.total_clientes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-red-500" /> Total a pagar
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(data.resumen.total_a_pagar)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingDown className="w-4 h-4 text-green-500" /> Total a devolver
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.resumen.total_a_devolver)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Presentadas
              </div>
              <p className="text-2xl font-bold">
                {(data.autonomos.estados.presentado || 0) + (data.sociedades.estados.presentado || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {[
          { id: "autonomos" as const, label: "Renta IRPF (Autonomos)", icon: Users, count: data?.autonomos.total || 0 },
          { id: "sociedades" as const, label: "Impuesto Sociedades", icon: Building2, count: data?.sociedades.total || 0 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
            <Badge variant="secondary" className="ml-1">{t.count}</Badge>
          </button>
        ))}
      </div>

      {/* Estado summary */}
      {section && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(section.estados).map(([estado, count]) => {
            const cfg = estadoConfig[estado] || estadoConfig.sin_datos;
            return (
              <div key={estado} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-sm">
                <cfg.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{cfg.label}:</span>
                <span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Client list */}
      <div className="space-y-2">
        {section?.clientes.map((c) => {
          const estado = tab === "autonomos" ? c.renta_estado : c.is_estado;
          const resultado = tab === "autonomos" ? c.renta_resultado : c.is_resultado;
          const importe = tab === "autonomos" ? c.renta_importe : c.is_importe;
          const href = tab === "autonomos"
            ? `/asesor/clientes/${c.empresa_id}/renta`
            : `/asesor/clientes/${c.empresa_id}/sociedades`;

          return (
            <Card
              key={c.empresa_id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(href)}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tab === "autonomos"
                    ? <Users className="w-5 h-5 text-blue-500" />
                    : <Building2 className="w-5 h-5 text-purple-500" />
                  }
                  <div>
                    <p className="font-medium text-sm">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.tipo_contribuyente || "Sin tipo"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {resultado && (
                    <span className={`text-sm font-semibold ${
                      resultado === "a_pagar" ? "text-red-600" :
                      resultado === "a_devolver" ? "text-green-600" : "text-slate-500"
                    }`}>
                      {resultado === "a_pagar" ? "+" : resultado === "a_devolver" ? "-" : ""}
                      {formatCurrency(importe || 0)}
                    </span>
                  )}
                  <EstadoBadge estado={estado} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!section || section.clientes.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No hay clientes {tab === "autonomos" ? "autonomos" : "sociedades"} vinculados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
