"use client";

// Mini-dialog para alta rápida de cliente (deudor) sin salir del flujo de
// creación de factura/proforma. Guarda con POST /admin/clientes que respeta
// X-Empresa-Id, así que cuando el asesor lo lanza desde
// /asesor/clientes/[id]/facturas/... el alta se aplica a la empresa cliente
// vinculada (no al despacho).

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";

export type ClienteCreado = {
  id: number;
  nombre: string;
  nif?: string | null;
  telefono?: string | null;
  email?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Llamado tras crear con éxito. Recibe el cliente creado para que el
   *  formulario padre pueda añadirlo a su lista y preseleccionarlo. */
  onCreated: (cliente: ClienteCreado) => void;
  /** Valores por defecto opcionales (ej. NIF detectado de un PDF) */
  initialValues?: Partial<ClienteCreado> & {
    direccion?: string;
    poblacion?: string;
    cp?: string;
    provincia?: string;
  };
}

export default function CrearClienteDialog({ open, onOpenChange, onCreated, initialValues }: Props) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState(initialValues?.nombre || "");
  const [nif, setNif] = useState(initialValues?.nif || "");
  const [email, setEmail] = useState(initialValues?.email || "");
  const [telefono, setTelefono] = useState(initialValues?.telefono || "");
  const [direccion, setDireccion] = useState(initialValues?.direccion || "");
  const [poblacion, setPoblacion] = useState(initialValues?.poblacion || "");
  const [provincia, setProvincia] = useState(initialValues?.provincia || "");
  const [cp, setCp] = useState(initialValues?.cp || "");
  const [submitting, setSubmitting] = useState(false);

  // Al abrir el dialog, sugerimos el próximo código autogenerado por el
  // backend. El asesor puede sobreescribirlo si quiere.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/admin/clientes/next-code");
        const sugerido = res.data?.codigo || res.data?.next || "";
        if (!cancelled && sugerido) setCodigo((prev) => prev || sugerido);
      } catch {
        // si falla, dejamos al usuario que lo escriba a mano
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const reset = () => {
    setCodigo("");
    setNombre(initialValues?.nombre || "");
    setNif(initialValues?.nif || "");
    setEmail(initialValues?.email || "");
    setTelefono(initialValues?.telefono || "");
    setDireccion(initialValues?.direccion || "");
    setPoblacion(initialValues?.poblacion || "");
    setProvincia(initialValues?.provincia || "");
    setCp(initialValues?.cp || "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showError("El nombre es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      // Asegurar código: si el campo está vacío, pedimos uno al backend.
      let finalCodigo = codigo.trim();
      if (!finalCodigo) {
        try {
          const r = await api.get("/admin/clientes/next-code");
          finalCodigo = r.data?.codigo || r.data?.next || "";
        } catch { /* manejado abajo */ }
      }
      if (!finalCodigo) {
        showError("No se pudo obtener un código de cliente. Introduce uno manualmente.");
        setSubmitting(false);
        return;
      }

      const payload: any = {
        codigo: finalCodigo,
        nombre: nombre.trim(),
        nif: nif.trim() || undefined,
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        poblacion: poblacion.trim() || undefined,
        provincia: provincia.trim() || undefined,
        cp: cp.trim() || undefined,
        // Datos fiscales mínimos: replicamos NIF / nombre como razón social por
        // defecto para que la factura tenga datos válidos. El asesor puede
        // refinarlos luego desde el detalle del cliente.
        nif_cif: nif.trim() || undefined,
        razon_social: nombre.trim(),
      };
      const res = await api.post("/admin/clientes", payload);
      const cliente: ClienteCreado = res.data?.cliente || res.data;
      if (!cliente?.id) {
        throw new Error("No se obtuvo el ID del cliente creado");
      }
      showSuccess("Cliente creado");
      reset();
      onOpenChange(false);
      onCreated(cliente);
    } catch (err: any) {
      showError(err?.response?.data?.error || err?.message || "Error creando cliente");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Alta rápida. Solo el nombre es obligatorio. Podrás completar el resto
            de datos fiscales más tarde desde el detalle del cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label htmlFor="cli-codigo">Código</Label>
              <Input
                id="cli-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Auto"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="cli-nombre">Nombre *</Label>
              <Input
                id="cli-nombre"
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan García López"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cli-nif">NIF / CIF</Label>
              <Input
                id="cli-nif"
                value={nif}
                onChange={(e) => setNif(e.target.value.toUpperCase())}
                placeholder="12345678X"
              />
            </div>
            <div>
              <Label htmlFor="cli-tel">Teléfono</Label>
              <Input
                id="cli-tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="600 123 456"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cli-email">Email</Label>
            <Input
              id="cli-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com"
            />
          </div>
          <div>
            <Label htmlFor="cli-direccion">Dirección</Label>
            <Input
              id="cli-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle Mayor 1"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="cli-poblacion">Población</Label>
              <Input
                id="cli-poblacion"
                value={poblacion}
                onChange={(e) => setPoblacion(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cli-cp">CP</Label>
              <Input
                id="cli-cp"
                value={cp}
                onChange={(e) => setCp(e.target.value)}
                placeholder="28001"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cli-provincia">Provincia</Label>
            <Input
              id="cli-provincia"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              placeholder="Madrid"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Plus size={14} />
              {submitting ? "Creando…" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
