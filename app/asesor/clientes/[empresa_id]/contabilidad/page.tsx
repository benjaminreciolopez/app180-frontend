"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calculator, FileSpreadsheet, TrendingUp, BarChart3 } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

interface BalanceData {
  activo_total?: number;
  pasivo_total?: number;
  patrimonio_neto?: number;
}

interface PygData {
  ingresos_total?: number;
  gastos_total?: number;
  resultado?: number;
}

interface AsientosResumen {
  total?: number;
}

export default function AsesorClienteContabilidadPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData>({});
  const [pyg, setPyg] = useState<PygData>({});
  const [totalAsientos, setTotalAsientos] = useState(0);

  useEffect(() => {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
    loadData();
  }, [empresaId]);

  async function loadData() {
    try {
      setLoading(true);
      const [balRes, pygRes, asientosRes] = await Promise.allSettled([
        api.get("/api/admin/contabilidad/balance"),
        api.get("/api/admin/contabilidad/pyg"),
        api.get("/api/admin/contabilidad/asientos", { params: { limit: 1 } }),
      ]);

      if (balRes.status === "fulfilled") {
        const d = balRes.value.data;
        setBalance({
          activo_total: d?.activo_total ?? d?.data?.activo_total ?? 0,
          pasivo_total: d?.pasivo_total ?? d?.data?.pasivo_total ?? 0,
          patrimonio_neto: d?.patrimonio_neto ?? d?.data?.patrimonio_neto ?? 0,
        });
      }

      if (pygRes.status === "fulfilled") {
        const d = pygRes.value.data;
        setPyg({
          ingresos_total: d?.ingresos_total ?? d?.data?.ingresos_total ?? 0,
          gastos_total: d?.gastos_total ?? d?.data?.gastos_total ?? 0,
          resultado: d?.resultado ?? d?.data?.resultado ?? 0,
        });
      }

      if (asientosRes.status === "fulfilled") {
        const d = asientosRes.value.data;
        setTotalAsientos(d?.total ?? d?.data?.length ?? 0);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar datos contables");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const sections = [
    {
      title: "Asientos Contables",
      description: `${totalAsientos} asientos registrados`,
      icon: BookOpen,
      href: `/asesor/contabilidad/asientos`,
    },
    {
      title: "Balance de Situación",
      description: balance.activo_total
        ? `Activo: ${formatCurrency(balance.activo_total)}`
        : "Sin datos",
      icon: BarChart3,
      href: `/asesor/contabilidad/balance`,
    },
    {
      title: "Pérdidas y Ganancias",
      description: pyg.resultado != null
        ? `Resultado: ${formatCurrency(pyg.resultado)}`
        : "Sin datos",
      icon: TrendingUp,
      href: `/asesor/contabilidad/pyg`,
    },
    {
      title: "Libro Mayor",
      description: "Movimientos por cuenta",
      icon: FileSpreadsheet,
      href: `/asesor/contabilidad/mayor`,
    },
    {
      title: "Plan de Cuentas",
      description: "Cuentas contables",
      icon: Calculator,
      href: `/asesor/contabilidad/cuentas`,
    },
  ];

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
          <h1 className="text-xl font-bold tracking-tight">Contabilidad del cliente</h1>
          <p className="text-xs text-muted-foreground">Libros contables, asientos y balances</p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Activo Total</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(balance.activo_total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Patrimonio Neto</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(balance.patrimonio_neto || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Resultado</p>
            <p className={`text-2xl font-bold mt-1 ${(pyg.resultado || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(pyg.resultado || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card
            key={s.title}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => router.push(s.href)}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon size={24} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
