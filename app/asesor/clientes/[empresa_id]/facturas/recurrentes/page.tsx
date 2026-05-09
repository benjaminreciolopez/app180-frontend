"use client";

// Subsección "Facturas recurrentes" del cliente en el panel del asesor.
// Reutiliza el componente compartido FacturasRecurrentesContent que el admin
// también usa en /admin/facturacion/listado?tab=recurrentes.
// El layout del cliente del asesor setea sessionStorage.asesor_empresa_id, y
// api inyecta X-Empresa-Id, por lo que las queries van al cliente correcto.

import { FacturasRecurrentesContent } from "@/components/admin/facturacion/FacturasRecurrentesContent";

export default function AsesorClienteFacturasRecurrentesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Facturas recurrentes</h2>
        <p className="text-sm text-muted-foreground">
          Plantillas de facturación periódica que se ejecutan automáticamente.
        </p>
      </div>
      <FacturasRecurrentesContent />
    </div>
  );
}
