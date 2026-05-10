"use client";

// Dialog para importar UNA factura desde un PDF.
// Flujo:
//   1. Usuario sube PDF.
//   2. Backend extrae datos heurísticos (número, fecha, NIF, base, IVA, total).
//   3. Mostramos los campos en un mini-form editable.
//   4. Submit: enviamos como CSV de una fila al endpoint /facturas/confirmar
//      reutilizando toda la maquinaria (cruce con asientos, auto-crear cliente,
//      detección de serie, etc.).

import { useState } from "react";
import { FileUp, Sparkles, Check } from "lucide-react";
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

export interface ImportPdfFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback tras crear la factura */
  onCreated?: () => void;
}

type DatosExtraidos = {
  numero: string | null;
  fecha: string | null;
  cliente_nif: string | null;
  base: number | null;
  iva_pct: number | null;
  total: number | null;
};

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[;",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ImportPdfFacturaDialog({
  open,
  onOpenChange,
  onCreated,
}: ImportPdfFacturaDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [datos, setDatos] = useState<DatosExtraidos | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Campos editables (precargados desde el parse)
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState("");
  const [clienteNif, setClienteNif] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [base, setBase] = useState<string>("");
  const [ivaPct, setIvaPct] = useState<string>("21");
  const [total, setTotal] = useState<string>("");
  const [concepto, setConcepto] = useState("Factura importada desde PDF");

  const reset = () => {
    setFile(null);
    setDatos(null);
    setNumero(""); setFecha(""); setClienteNif(""); setClienteNombre("");
    setBase(""); setIvaPct("21"); setTotal(""); setConcepto("Factura importada desde PDF");
  };

  const onClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setDatos(null);
    if (!f) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await authenticatedFetch("/api/admin/import/facturas/parsear-pdf", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Error parseando PDF");
      const d: DatosExtraidos = j.datos || {};
      setDatos(d);
      if (d.numero) setNumero(d.numero);
      if (d.fecha) setFecha(d.fecha);
      if (d.cliente_nif) setClienteNif(d.cliente_nif);
      if (d.base != null) setBase(String(d.base));
      if (d.iva_pct != null) setIvaPct(String(d.iva_pct));
      if (d.total != null) setTotal(String(d.total));
    } catch (err: any) {
      showError(err?.message || "Error parseando PDF");
    } finally {
      setParsing(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero || !fecha) {
      showError("Falta número o fecha");
      return;
    }
    if (!base && !total) {
      showError("Indica al menos base o total");
      return;
    }
    setSubmitting(true);
    try {
      // Construir CSV de una sola fila y enviarlo a /facturas/confirmar.
      // Reutiliza la maquinaria (cruce con asientos, auto-crear cliente, etc.).
      const cabecera = "fecha;numero;serie;cliente_nif;cliente_nombre;concepto;base;iva_pct;iva_importe;retencion_pct;total;metodo_pago";
      const fila = [
        csvEscape(fecha),
        csvEscape(numero),
        "", // serie: la detecta el backend
        csvEscape(clienteNif),
        csvEscape(clienteNombre),
        csvEscape(concepto),
        csvEscape(base),
        csvEscape(ivaPct),
        "",
        "",
        csvEscape(total),
        "TRANSFERENCIA",
      ].join(";");
      const csvBlob = new Blob([cabecera + "\n" + fila + "\n"], { type: "text/csv" });
      const csvFile = new File([csvBlob], "factura.csv", { type: "text/csv" });

      const fd = new FormData();
      fd.append("file", csvFile);
      const res = await authenticatedFetch("/api/admin/import/facturas/confirmar", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Error guardando factura");
      const partes = [];
      if (j.creadas > 0) partes.push("factura creada");
      if (j.clientes_creados > 0) partes.push("cliente nuevo registrado");
      if (j.asientos_vinculados > 0) partes.push("vinculada a asiento existente");
      showSuccess(partes.join(" · ") || "Importación completada");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      showError(err?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar factura desde PDF</DialogTitle>
          <DialogDescription>
            Sube un PDF de factura. Intentaremos extraer los datos automáticamente
            y los podrás revisar antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="pdf-factura">PDF de factura</Label>
            <Input
              id="pdf-factura"
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {parsing && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Leyendo el PDF…
              </p>
            )}
            {datos && (datos.numero || datos.fecha || datos.total) && (
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Datos detectados. Revisa antes de guardar.
              </p>
            )}
            {datos && !datos.numero && !datos.fecha && !datos.total && file && !parsing && (
              <p className="text-[11px] text-amber-700 mt-1">
                No se han podido extraer datos. Rellénalos a mano.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pdf-numero">Número</Label>
              <Input id="pdf-numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="2026/A/0001" required />
            </div>
            <div>
              <Label htmlFor="pdf-fecha">Fecha</Label>
              <Input id="pdf-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pdf-nif">NIF/CIF cliente</Label>
              <Input id="pdf-nif" value={clienteNif} onChange={(e) => setClienteNif(e.target.value.toUpperCase())} placeholder="B12345678" />
            </div>
            <div>
              <Label htmlFor="pdf-nombre">Nombre cliente</Label>
              <Input id="pdf-nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="(opcional si NIF existe)" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="pdf-base">Base</Label>
              <Input id="pdf-base" type="number" inputMode="decimal" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} placeholder="1000.00" />
            </div>
            <div>
              <Label htmlFor="pdf-iva">IVA %</Label>
              <Input id="pdf-iva" type="number" step="0.01" value={ivaPct} onChange={(e) => setIvaPct(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pdf-total">Total</Label>
              <Input id="pdf-total" type="number" inputMode="decimal" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="1210.00" />
            </div>
          </div>

          <div>
            <Label htmlFor="pdf-concepto">Concepto</Label>
            <Input id="pdf-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onClose(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Check className="w-4 h-4" />
              {submitting ? "Guardando…" : "Crear factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
