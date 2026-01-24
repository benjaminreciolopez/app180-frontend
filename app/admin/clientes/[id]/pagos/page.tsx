"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PagosPage() {
  const { id } = useParams();
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/clientes/${id}`)}
        >
          <ArrowLeft size={18} />
        </Button>

        <h1 className="text-xl font-semibold">Pagos</h1>
      </div>

      <div className="text-slate-500 text-sm">
        Módulo de pagos en desarrollo.
      </div>
    </div>
  );
}
