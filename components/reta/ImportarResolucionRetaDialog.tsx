"use client";

import { useState } from "react";
import { FileUp, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedFetch } from "@/utils/api";
import { showError, showSuccess } from "@/lib/toast";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Dialog del asesor para importar la resolución TGSS de cambio de base RETA
 * directamente. El sistema intenta autorrellenar los datos parseando el PDF y
 * deja al asesor revisar/corregir antes de aplicar.
 *
 * El cambio se crea en estado 'confirmado_ss' (el documento de SS ya es la
 * confirmación oficial), aplica al perfil RETA y sincroniza gastos recurrentes
 * vinculados.
 */
export function ImportarResolucionRetaDialog({
  open,
  onOpenChange,
  empresaId,
  titularId,
  ejercicio,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  titularId?: string | null;
  ejercicio: number;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [baseNueva, setBaseNueva] = useState("");
  const [fechaEfectiva, setFechaEfectiva] = useState("");
  const [motivo, setMotivo] = useState("");
  const [parsed, setParsed] = useState<{ base_nueva: number | null; fecha_efectiva: string | null; nif: string | null } | null>(null);

  const reset = () => {
    setFile(null);
    setBaseNueva("");
    setFechaEfectiva("");
    setMotivo("");
    setParsed(null);
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setParsed(null);
    if (!f) return;

    // Intentar autorrellenar
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("pdf", f);
      const res = await authenticatedFetch("/asesor/reta/parsear-pdf-cambio-base", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const j = await res.json();
        setParsed(j.datos || null);
        if (j.datos?.base_nueva) setBaseNueva(String(j.datos.base_nueva));
        if (j.datos?.fecha_efectiva) setFechaEfectiva(j.datos.fecha_efectiva);
      }
    } catch (err) {
      console.error("parse pdf:", err);
      // No bloqueamos: el asesor puede rellenar a mano
    } finally {
      setParsing(false);
    }
  };

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
      if (titularId) fd.append("titular_id", titularId);
      if (motivo) fd.append("motivo", motivo);
      if (file) fd.append("pdf", file);

      const res = await authenticatedFetch(
        `/asesor/reta/clientes/${empresaId}/cambios-base/importar`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error importando resolución");
      }
      const j = await res.json().catch(() => ({}));
      const sync: Array<{ nombre: string; importe_nuevo: number }> = j.gastos_sincronizados || [];
      if (sync.length > 0) {
        showSuccess(
          `Resolución importada · ${sync.length} gasto recurrente sincronizado a ${fmtEUR(sync[0].importe_nuevo)}`
        );
      } else {
        showSuccess("Resolución importada y aplicada al perfil RETA");
      }
      reset();
      onOpenChange(false);
      onImported();
    } catch (err: any) {
      showError(err.message || "No se pudo importar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar resolución TGSS</DialogTitle>
          <DialogDescription>
            Sube el PDF de resolución de la Seguridad Social. El cambio se aplicará
            directamente al perfil RETA del cliente y se sincronizarán los gastos
            recurrentes vinculados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="pdf">PDF resolución TGSS</Label>
            <Input
              id="pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {parsing && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Leyendo el PDF…
              </p>
            )}
            {parsed && (parsed.base_nueva || parsed.fecha_efectiva) && (
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Datos detectados automáticamente. Revisa antes de confirmar.
              </p>
            )}
            {parsed && !parsed.base_nueva && !parsed.fecha_efectiva && file && !parsing && (
              <p className="text-[11px] text-amber-700 mt-1">
                No se han podido extraer los datos del PDF. Rellénalos a mano.
              </p>
            )}
          </div>

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
              placeholder="Ej. Ajuste tras resolución TGSS"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <FileUp className="w-4 h-4" />
              {submitting ? "Aplicando…" : "Importar y aplicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
