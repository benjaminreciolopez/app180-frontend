"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Calculator, FileSpreadsheet, TrendingUp, BarChart3, ExternalLink } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

interface BalanceData {
  activo_total: number;
  pasivo_total: number;
  patrimonio_total: number;
}

interface PygData {
  ingresos_total: number;
  gastos_total: number;
  resultado: number;
}

export default function AsesorClienteContabilidadPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData>({ activo_total: 0, pasivo_total: 0, patrimonio_total: 0 });
  const [pyg, setPyg] = useState<PygData>({ ingresos_total: 0, gastos_total: 0, resultado: 0 });
  const [totalAsientos, setTotalAsientos] = useState(0);

  useEffect(() => {
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
          activo_total: d?.activo?.total ?? 0,
          pasivo_total: d?.pasivo?.total ?? 0,
          patrimonio_total: d?.patrimonio?.total ?? 0,
        });
      }

      if (pygRes.status === "fulfilled") {
        const d = pygRes.value.data;
        setPyg({
          ingresos_total: d?.ingresos?.total ?? 0,
          gastos_total: d?.gastos?.total ?? 0,
          resultado: d?.resultado ?? 0,
        });
      }

      if (asientosRes.status === "fulfilled") {
        const d = asientosRes.value.data;
        setTotalAsientos(d?.total ?? 0);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar datos contables");
    } finally {
      setLoading(false);
    }
  }

  // Detectar PWA
  const isPWA = typeof window !== "undefined" && (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (window.navigator as any).standalone === true
  );

  const openInPopup = (href: string) => {
    const url = `${href}?popup=true`;
    if (isPWA) {
      const w = Math.min(1200, screen.availWidth - 100);
      const h = Math.min(800, screen.availHeight - 100);
      const left = Math.round((screen.availWidth - w) / 2);
      const top = Math.round((screen.availHeight - h) / 2);
      window.open(url, "_blank", `popup,width=${w},height=${h},left=${left},top=${top}`);
    } else {
      window.open(url, "_blank");
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  const clientBase = `/asesor/clientes/${empresaId}/contabilidad`;

  const sections = [
    {
      title: "Asientos Contables",
      description: `${totalAsientos} asientos registrados`,
      icon: BookOpen,
      href: `${clientBase}/asientos`,
    },
    {
      title: "Balance de Situaci\u00f3n",
      description: balance.activo_total
        ? `Activo: ${formatCurrency(balance.activo_total)}`
        : "Sin datos",
      icon: BarChart3,
      href: `${clientBase}/balance`,
    },
    {
      title: "P\u00e9rdidas y Ganancias",
      description: pyg.resultado != null
        ? `Resultado: ${formatCurrency(pyg.resultado)}`
        : "Sin datos",
      icon: TrendingUp,
      href: `${clientBase}/pyg`,
    },
    {
      title: "Libro Mayor",
      description: "Movimientos por cuenta",
      icon: FileSpreadsheet,
      href: `${clientBase}/mayor`,
    },
    {
      title: "Plan de Cuentas",
      description: "Cuentas contables",
      icon: Calculator,
      href: `${clientBase}/cuentas`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Contabilidad del cliente</h1>
        <p className="text-xs text-muted-foreground">Libros contables, asientos y balances</p>
      </div>

      {/* KPIs r\u00e1pidos */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Activo Total</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(balance.activo_total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pasivo Total</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(balance.pasivo_total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Patrimonio Neto</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(balance.patrimonio_total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Resultado</p>
            <p className={`text-2xl font-bold mt-1 ${pyg.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(pyg.resultado)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card
            key={s.title}
            className="group cursor-pointer hover:border-primary/50 transition-colors relative"
            onClick={() => router.push(s.href)}
            onAuxClick={(e) => {
              if (e.button === 1) { e.preventDefault(); openInPopup(s.href); }
            }}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <s.icon size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openInPopup(s.href); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted shrink-0"
                title={`Abrir ${s.title} en ventana independiente`}
              >
                <ExternalLink size={14} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
