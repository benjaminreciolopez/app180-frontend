"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function AsesorClienteContabilidadPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  useEffect(() => {
    sessionStorage.setItem("asesor_empresa_id", empresaId);
  }, [empresaId]);

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

      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Modulo de contabilidad</p>
          <p className="text-sm text-muted-foreground mt-1">
            Proximamente: asientos contables, libros diario y mayor, balances de situacion
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
