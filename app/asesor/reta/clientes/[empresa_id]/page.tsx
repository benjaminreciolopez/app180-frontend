"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// La pantalla de RETA por cliente vive ahora como un tab dentro del cliente:
//   /asesor/clientes/[empresa_id]/reta
// Mantenemos este path como redirect para no romper enlaces antiguos
// (notificaciones, deep-links, widgets cacheados, etc.).
export default function RetaClienteLegacyRedirect() {
  const { empresa_id } = useParams<{ empresa_id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/asesor/clientes/${empresa_id}/reta${qs ? `?${qs}` : ""}`);
  }, [empresa_id, router, searchParams]);

  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  );
}
