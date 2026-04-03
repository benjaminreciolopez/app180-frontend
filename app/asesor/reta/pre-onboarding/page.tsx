"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, FileText, Calendar } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PreOnboardingListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch("/asesor/reta/pre-onboarding");
        if (res.ok) {
          const data = await res.json();
          setLista(data.preOnboardings || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/asesor/reta")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pre-Onboarding RETA</h1>
            <p className="text-sm text-muted-foreground">
              Estimaciones iniciales para prospectos antes de facturar
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/asesor/reta/pre-onboarding/nuevo")}>
          <Plus className="w-4 h-4 mr-2" /> Nueva estimacion
        </Button>
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              No hay estimaciones pre-onboarding todavia.
            </p>
            <Button onClick={() => router.push("/asesor/reta/pre-onboarding/nuevo")}>
              Crear primera estimacion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lista.map((po) => (
            <Card
              key={po.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/asesor/reta/pre-onboarding/${po.id}`)}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{po.nombre_prospecto}</p>
                  <p className="text-xs text-muted-foreground">
                    {po.actividad_tipo === 'profesional' ? 'Profesional' : 'Empresarial'}
                    {po.sector && ` · ${po.sector}`}
                    {po.nif && ` · ${po.nif}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {po.cuota_estimada && (
                    <span className="font-mono font-semibold">{parseFloat(po.cuota_estimada).toFixed(2)} €/mes</span>
                  )}
                  <Badge variant={po.estado === 'vinculado_cliente' ? 'default' : po.estado === 'completado' ? 'secondary' : 'outline'}>
                    {po.estado === 'vinculado_cliente' ? 'Vinculado' : po.estado === 'completado' ? 'Completado' : 'Borrador'}
                  </Badge>
                  {po.elegible_tarifa_plana && (
                    <Badge variant="secondary" className="text-[10px]">Tarifa plana</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
