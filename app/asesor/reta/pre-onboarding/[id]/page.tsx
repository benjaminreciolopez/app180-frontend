"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Link } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PreOnboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch(`/asesor/reta/pre-onboarding/${id}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center p-8"><LoadingSpinner /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No encontrado</div>;

  const po = data.preOnboarding;
  const comparacion = data.comparacion;

  const escenarios = [
    { label: "Pesimista", data: po.resultado_pesimista, color: "text-red-600" },
    { label: "Realista", data: po.resultado_realista, color: "text-foreground" },
    { label: "Optimista", data: po.resultado_optimista, color: "text-green-600" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/asesor/reta/pre-onboarding")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{po.nombre_prospecto}</h1>
          <p className="text-sm text-muted-foreground">
            {po.actividad_tipo === 'profesional' ? 'Profesional' : 'Empresarial'}
            {po.sector && ` · ${po.sector.replace(/_/g, " ")}`}
            {po.nif && ` · ${po.nif}`}
          </p>
        </div>
        <Badge className="ml-auto" variant={po.estado === 'vinculado_cliente' ? 'default' : 'secondary'}>
          {po.estado}
        </Badge>
      </div>

      {/* Datos de entrada */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos estimados</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Ingresos mensuales</p>
            <p className="font-mono font-semibold">{parseFloat(po.ingresos_mensuales_estimados).toFixed(0)} €</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gastos fijos mensuales</p>
            <p className="font-mono font-semibold">{parseFloat(po.gastos_fijos_mensuales).toFixed(0)} €</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gastos variables</p>
            <p className="font-mono">{po.gastos_variables_pct}% de ingresos</p>
          </div>
          {po.tiene_local && (
            <div>
              <p className="text-muted-foreground">Alquiler</p>
              <p className="font-mono">{parseFloat(po.alquiler_mensual).toFixed(0)} €/mes</p>
            </div>
          )}
          {po.tiene_empleados && (
            <div>
              <p className="text-muted-foreground">Coste empleados</p>
              <p className="font-mono">{parseFloat(po.coste_empleados_mensual).toFixed(0)} €/mes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarifa plana */}
      {po.elegible_tarifa_plana && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
              Elegible tarifa plana: 80 €/mes x 12 meses
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Escenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escenarios de cotizacion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            {escenarios.map((esc) => {
              const d = typeof esc.data === 'string' ? JSON.parse(esc.data) : esc.data;
              if (!d) return null;
              return (
                <div key={esc.label} className="space-y-2 p-3 rounded-lg bg-muted/30">
                  <p className={`font-semibold ${esc.color}`}>{esc.label}</p>
                  <p className="text-xs text-muted-foreground">Tramo {d.tramo}</p>
                  <p className="font-mono text-lg font-bold">{d.cuota?.toFixed(2)} €/mes</p>
                  <p className="text-xs text-muted-foreground">{d.cuotaAnual?.toLocaleString("es-ES")} €/ano</p>
                  <p className="text-xs text-muted-foreground">Rend. {d.rendimientoMensual?.toFixed(0)} €/mes</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparacion sectorial */}
      {comparacion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparacion con el sector</CardTitle>
            <CardDescription>
              Basado en {comparacion.muestra} autonomos del mismo sector (anonimizado)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Rendimiento medio</p>
              <p className="font-mono font-semibold">{comparacion.rendimientoMensualMedio.toFixed(0)} €/mes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cuota media</p>
              <p className="font-mono font-semibold">{comparacion.cuotaMedia.toFixed(2)} €/mes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Percentil 25-75</p>
              <p className="font-mono">{comparacion.percentil25.toFixed(0)} - {comparacion.percentil75.toFixed(0)} €/mes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tramo mas comun</p>
              <Badge variant="outline">{comparacion.tramoMasComun}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Estimacion orientativa. No constituye asesoramiento fiscal vinculante.
      </p>
    </div>
  );
}
