"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

interface Cert {
  id: string;
  nombre_titular?: string;
  nif_titular?: string;
  fecha_caducidad?: string;
}

interface Props {
  modelo: string;
  year: string;
  trimestre: string;
  onPresented?: () => void;
}

export default function PresentarAeatDialog({ modelo, year, trimestre, onPresented }: Props) {
  const [open, setOpen] = useState(false);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [certId, setCertId] = useState("");
  const [presentando, setPresentando] = useState(false);
  const [csv, setCsv] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCsv(null);
    authenticatedFetch("/api/admin/certificados")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const items: Cert[] = j.data || j.items || [];
          setCerts(items);
          if (items.length > 0 && !certId) setCertId(items[0].id);
        }
      })
      .catch(() => toast.error("Error cargando certificados"));
  }, [open]);

  const handlePresentar = async () => {
    if (!certId) {
      toast.error("Selecciona un certificado");
      return;
    }
    setPresentando(true);
    try {
      const res = await authenticatedFetch("/api/admin/fiscal/presentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo, year, trimestre, certificado_id: certId }),
      });
      const json = await res.json();
      if (json.success) {
        setCsv(json.csv || json.aeat_csv || "Presentación aceptada");
        toast.success("Modelo presentado correctamente");
        if (onPresented) onPresented();
      } else {
        toast.error(json.error || "Error en presentación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setPresentando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Send className="h-3.5 w-3.5 mr-1" /> Presentar AEAT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Presentar Modelo {modelo} — {year} {trimestre}T</DialogTitle>
          <DialogDescription>Se firmará y enviará telemáticamente a la AEAT con el certificado del titular.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Certificado digital</Label>
            <Select value={certId} onValueChange={setCertId}>
              <SelectTrigger><SelectValue placeholder="Selecciona certificado..." /></SelectTrigger>
              <SelectContent>
                {certs.length === 0 && <SelectItem value="__none__" disabled>No hay certificados disponibles</SelectItem>}
                {certs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre_titular || c.nif_titular || c.id} {c.fecha_caducidad ? `(válido hasta ${c.fecha_caducidad})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {csv && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex gap-2 items-start">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Presentación aceptada</div>
                <div className="text-xs mt-1">CSV: <span className="font-mono">{csv}</span></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
          <Button onClick={handlePresentar} disabled={presentando || !certId}>
            {presentando ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</> : "Enviar a AEAT"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
