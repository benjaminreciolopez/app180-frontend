"use client";

import { useEffect, useState } from "react";
import { Shield, FileUp, Wallet, Calendar, ExternalLink, AlertTriangle, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { authenticatedFetch } from "@/utils/api";
import { showSuccess, showError } from "@/lib/toast";

type Perfil = {
  base_cotizacion_actual: number | null;
  tramo_actual: number | null;
  cuota_mensual_actual: number | null;
};

type Cambio = {
  id: string;
  ejercicio: number;
  estado: "borrador_asesor" | "propuesto_pdte_cliente" | "comunicado_pdte_asesor" | "confirmado_ss" | "descartado";
  base_anterior: string;
  base_nueva: string;
  fecha_efectiva: string;
  motivo: string | null;
  justificante_pdf_url: string | null;
  created_at: string;
};

const fmtEUR = (n: number | string | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n));

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

const ESTADO_LABEL: Record<Cambio["estado"], { label: string; color: string }> = {
  borrador_asesor: { label: "Borrador", color: "bg-slate-100 text-slate-700" },
  propuesto_pdte_cliente: {
    label: "Tu gestoría te propone este cambio",
    color: "bg-blue-100 text-blue-800",
  },
  comunicado_pdte_asesor: {
    label: "Esperando confirmación de tu gestor",
    color: "bg-orange-100 text-orange-800",
  },
  confirmado_ss: { label: "Aplicado", color: "bg-emerald-100 text-emerald-800" },
  descartado: { label: "Descartado", color: "bg-rose-100 text-rose-700" },
};

export default function MiRetaPage() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [estimacion, setEstimacion] = useState<any>(null);
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  const ejercicio = new Date().getFullYear();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resPerfil, resEst, resCambios] = await Promise.all([
        authenticatedFetch(`/api/admin/reta/perfil?ejercicio=${ejercicio}`),
        authenticatedFetch(`/api/admin/reta/estimacion?ejercicio=${ejercicio}`),
        authenticatedFetch(`/api/admin/reta/cambios-base?ejercicio=${ejercicio}`),
      ]);
      if (resPerfil.ok) setPerfil((await resPerfil.json()).perfil || null);
      if (resEst.ok) {
        const j = await resEst.json();
        setEstimacion(j.estimacion ? { ...j.estimacion, perfil: j.perfil } : null);
      }
      if (resCambios.ok) setCambios((await resCambios.json()).cambios || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const hayPropuesta = cambios.find((c) => c.estado === "propuesto_pdte_cliente");
  const hayComunicado = cambios.find((c) => c.estado === "comunicado_pdte_asesor");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" />
          Mi cotización RETA
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tu base de cotización en la Seguridad Social y los cambios pendientes con
          tu gestoría.
        </p>
      </div>

      {/* Card: Mi cotización actual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cotización actual ({ejercicio})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPI
              icon={<Wallet className="w-4 h-4 text-emerald-600" />}
              label="Base de cotización"
              value={fmtEUR(perfil?.base_cotizacion_actual ?? null)}
            />
            <KPI
              icon={<Calendar className="w-4 h-4 text-blue-600" />}
              label="Tramo"
              value={perfil?.tramo_actual ? `Tramo ${perfil.tramo_actual}` : "—"}
            />
            <KPI
              icon={<Wallet className="w-4 h-4 text-purple-600" />}
              label="Cuota mensual"
              value={fmtEUR(perfil?.cuota_mensual_actual ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Avisos visuales según estado */}
      {hayPropuesta && (
        <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-700 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Tu gestoría te propone cambiar la base a {fmtEUR(hayPropuesta.base_nueva)}
                </p>
                <p className="text-blue-800/80 dark:text-blue-300/80 mt-1">
                  Cuando hagas el cambio en Importass y la TGSS te emita el
                  justificante, súbelo desde aquí para que tu gestor lo confirme.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hayComunicado && (
        <Card className="border-orange-300 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-700 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900 dark:text-orange-200">
                  Cambio comunicado · Esperando que tu gestor lo confirme
                </p>
                <p className="text-orange-800/80 dark:text-orange-300/80 mt-1">
                  Ya hemos avisado a tu gestoría. Cuando lo verifique, tu base
                  cotización se actualizará automáticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acción principal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">¿Has cambiado tu base en la Seguridad Social?</CardTitle>
          <CardDescription>
            Si has hecho un cambio en Importass y la TGSS te ha confirmado los nuevos datos,
            comunícalo aquí subiendo el justificante. Tu gestoría lo verá y lo aplicará.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FileUp className="w-4 h-4" />
                He cambiado mi base en la SS
              </Button>
            </DialogTrigger>
            <ComunicarCambioDialog
              ejercicio={ejercicio}
              onClose={() => setOpenDialog(false)}
              onSuccess={() => {
                setOpenDialog(false);
                loadAll();
                showSuccess("Comunicación enviada a tu gestoría");
              }}
            />
          </Dialog>

          <p className="text-[11px] text-muted-foreground mt-3">
            <a
              href="https://portal.seg-social.gob.es/wps/portal/importass/importass"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Abrir Importass
              <ExternalLink className="w-3 h-3" />
            </a>
            {" · "}El cambio se hace primero en el portal oficial. Aquí solo lo
            comunicas.
          </p>
        </CardContent>
      </Card>

      {/* Histórico de cambios */}
      {cambios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de cambios</CardTitle>
            <CardDescription>Estado de los cambios de base en {ejercicio}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cambios.map((c) => {
                const e = ESTADO_LABEL[c.estado] || ESTADO_LABEL.borrador_asesor;
                return (
                  <div
                    key={c.id}
                    className="bg-background rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          Base {fmtEUR(c.base_anterior)} → <strong>{fmtEUR(c.base_nueva)}</strong>
                          {" · efectos "}{fmtDate(c.fecha_efectiva)}
                        </div>
                        {c.motivo && (
                          <p className="text-[11px] text-muted-foreground italic mt-0.5">{c.motivo}</p>
                        )}
                        {c.justificante_pdf_url && (
                          <a
                            href={c.justificante_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline mt-0.5"
                          >
                            Justificante TGSS
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${e.color}`}>
                        {c.estado === "confirmado_ss" && <Check className="w-3 h-3 mr-1" />}
                        {e.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function ComunicarCambioDialog({
  ejercicio,
  onClose,
  onSuccess,
}: {
  ejercicio: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [baseNueva, setBaseNueva] = useState("");
  const [fechaEfectiva, setFechaEfectiva] = useState("");
  const [motivo, setMotivo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = parseFloat(baseNueva.replace(",", "."));
    if (!base || base <= 0) {
      showError("Indica la nueva base de cotización");
      return;
    }
    if (!fechaEfectiva) {
      showError("Indica la fecha de efectos");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("ejercicio", String(ejercicio));
      fd.append("base_nueva", String(base));
      fd.append("fecha_efectiva", fechaEfectiva);
      if (motivo) fd.append("motivo", motivo);
      if (file) fd.append("justificante", file);
      const res = await authenticatedFetch("/api/admin/reta/cambios-base/comunicar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error enviando la comunicación");
      }
      onSuccess();
    } catch (err: any) {
      showError(err.message || "No se pudo enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Comunicar cambio de base</DialogTitle>
        <DialogDescription>
          Rellena la nueva base que has confirmado en Importass y, si lo tienes,
          adjunta el justificante PDF que emite la TGSS.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="base_nueva">Nueva base (€/mes)</Label>
          <Input
            id="base_nueva"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={baseNueva}
            onChange={(e) => setBaseNueva(e.target.value)}
            placeholder="Ej. 1041.66"
            required
          />
        </div>
        <div>
          <Label htmlFor="fecha_efectiva">Fecha de efectos</Label>
          <Input
            id="fecha_efectiva"
            type="date"
            value={fechaEfectiva}
            onChange={(e) => setFechaEfectiva(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="motivo">Motivo (opcional)</Label>
          <Input
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Ajuste tras cambio de actividad"
          />
        </div>
        <div>
          <Label htmlFor="justificante">Justificante TGSS (PDF, opcional)</Label>
          <Input
            id="justificante"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Si no lo tienes a mano, puedes comunicarlo igual y subirlo después.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando…" : "Comunicar a mi gestoría"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
