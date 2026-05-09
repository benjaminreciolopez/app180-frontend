// Reutiliza el flujo de creación de proforma admin en el contexto del cliente
// del asesor. Redirige al formulario de "crear proforma" para que el asesor
// pueda emitir una con los datos del cliente preseleccionado por contexto.
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AsesorClienteProformasIndex() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  useEffect(() => {
    // El layout del cliente ya tiene seteado sessionStorage.asesor_empresa_id
    // así que el formulario admin operará bajo el contexto del cliente.
    router.replace(`/asesor/facturacion/proformas/crear?cliente_empresa=${empresaId}`);
  }, [empresaId, router]);

  return null;
}
