"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Inbox,
  FileText,
  Check,
  X as XIcon,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/utils/api";
import { showSuccess, showError } from "@/lib/toast";

type CambioPendiente = {
  id: string;
  empresa_id: string;
  empresa_nombre: string;
  ejercicio: number;
  estado: "comunicado_pdte_asesor" | "propuesto_pdte_cliente";
  base_anterior: string;
  base_nueva: string;
  tramo_anterior: number | null;
  tramo_nuevo: number | null;
  fecha_efectiva: string;
  motivo: string | null;
  justificante_pdf_url: string | null;
  justificante_uploaded_at: string | null;
  created_at: string;
};

const fmtEUR = (n: number | string) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

export function CambiosPendientesPanel() {
  const [cambios, setCambios] = useState<CambioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/asesor/reta/cambios-pendientes");
      if (!res.ok) throw new Error("Error cargando cambios pendientes");
      const data = await res.json();
      setCambios(data.cambios || []);
    } catch (err) {
      console.error(err);
      setCambios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmar = async (cambio: CambioPendiente) => {
    if (!confirm(`Confirmar el cambio a ${fmtEUR(cambio.base_nueva)} para ${cambio.empresa_nombre}? Se aplicará al perfil RETA.`)) return;
    setActionId(cambio.id);
    try {
      const res = await authenticatedFetch(
        `/asesor/reta/clientes/${cambio.empresa_id}/cambios-base/${cambio.id}/confirmar`,
        { method: "PUT" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error confirmando");
      }
      const j = await res.json().catch(() => ({}));
      const sync: Array<{ nombre: string; importe_nuevo: number }> = j.gastos_sincronizados || [];
      if (sync.length > 0) {
        showSuccess(
          `Cambio confirmado · ${sync.length} gasto${sync.length > 1 ? "s" : ""} recurrente${sync.length > 1 ? "s" : ""} sincronizado${sync.length > 1 ? "s" : ""} a ${fmtEUR(sync[0].importe_nuevo)}`
        );
      } else {
        showSuccess("Cambio confirmado y aplicado al perfil RETA");
      }
      await load();
    } catch (err: any) {
      showError(err.message || "No se pudo confirmar");
    } finally {
      setActionId(null);
    }
  };

  const descartar = async (cambio: CambioPendiente) => {
    const motivo = prompt("Motivo del descarte (opcional):");
    if (motivo === null) return; // cancel
    setActionId(cambio.id);
    try {
      const res = await authenticatedFetch(
        `/asesor/reta/clientes/${cambio.empresa_id}/cambios-base/${cambio.id}/descartar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivo || null }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error descartando");
      }
      showSuccess("Cambio descartado");
      await load();
    } catch (err: any) {
      showError(err.message || "No se pudo descartar");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cambios RETA pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">Cargando…</p>
        </CardContent>
      </Card>
    );
  }

  if (cambios.length === 0) return null; // no mostramos card vacía

  const comunicados = cambios.filter((c) => c.estado === "comunicado_pdte_asesor");
  const propuestos = cambios.filter((c) => c.estado === "propuesto_pdte_cliente");

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Inbox className="w-5 h-5" />
          Cambios RETA pendientes
          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800">
            {cambios.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Revisa y confirma los cambios de base que tus clientes han comunicado tras
          aplicarlos en la TGSS, o descarta propuestas que ya no apliquen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {comunicados.length > 0 && (
          <Section
            label="Comunicados por el cliente — pendientes de confirmar"
            badgeColor="bg-orange-100 text-orange-800"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            cambios={comunicados}
            actionId={actionId}
            onConfirm={confirmar}
            onDiscard={descartar}
          />
        )}
        {propuestos.length > 0 && (
          <Section
            label="Propuestos por mí — esperando que el cliente actúe"
            badgeColor="bg-blue-100 text-blue-800"
            icon={<FileText className="w-3.5 h-3.5" />}
            cambios={propuestos}
            actionId={actionId}
            onConfirm={confirmar}
            onDiscard={descartar}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  label,
  badgeColor,
  icon,
  cambios,
  actionId,
  onConfirm,
  onDiscard,
}: {
  label: string;
  badgeColor: string;
  icon: React.ReactNode;
  cambios: CambioPendiente[];
  actionId: string | null;
  onConfirm: (c: CambioPendiente) => void;
  onDiscard: (c: CambioPendiente) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="space-y-2">
        {cambios.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-card rounded-lg border border-border px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold truncate">{c.empresa_nombre}</span>
                  <Badge className={`text-[10px] ${badgeColor}`}>
                    Ejercicio {c.ejercicio}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Base {fmtEUR(c.base_anterior)} → <strong className="text-foreground">{fmtEUR(c.base_nueva)}</strong>
                  {" · efectos "}{fmtDate(c.fecha_efectiva)}
                </div>
                {c.motivo && (
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5 italic">
                    {c.motivo}
                  </div>
                )}
                {c.justificante_pdf_url && (
                  <a
                    href={c.justificante_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline mt-1"
                  >
                    <FileText className="w-3 h-3" />
                    Justificante TGSS
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs gap-1"
                  disabled={actionId === c.id}
                  onClick={() => onConfirm(c)}
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  disabled={actionId === c.id}
                  onClick={() => onDiscard(c)}
                >
                  <XIcon className="w-3.5 h-3.5" />
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
