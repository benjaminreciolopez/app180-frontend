"use client";

import { useParams } from "next/navigation";
import CertificadosManager from "@/components/certificados/CertificadosManager";

export default function ClienteCertificadosPage() {
  const { empresa_id } = useParams<{ empresa_id: string }>();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Certificados Digitales</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los certificados electronicos (.p12/.pfx) de este cliente para presentacion de modelos AEAT, Seguridad Social, etc.
        </p>
      </div>
      <CertificadosManager empresaId={empresa_id} />
    </div>
  );
}
