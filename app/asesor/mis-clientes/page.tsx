"use client";

// /asesor/mis-clientes ha sido unificado con /asesor/clientes.
// Redirigimos para mantener compatibilidad con enlaces antiguos.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AsesorMisClientesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/asesor/clientes");
  }, [router]);
  return null;
}
