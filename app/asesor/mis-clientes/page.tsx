"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Building2,
  Search,
  Link2,
  X,
  Trash2,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Cliente = {
  id: string;
  nombre: string;
  codigo?: string | null;
  activo: boolean;
  nif?: string | null;
  nif_cif?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  contacto_nombre?: string | null;
  contacto_email?: string | null;
  razon_social?: string | null;
  vinculado_empresa_id?: string | null;
  poblacion?: string | null;
  municipio?: string | null;
  provincia?: string | null;
  cp?: string | null;
  codigo_postal?: string | null;
  pais?: string | null;
  // Fiscal
  tipo_fiscal?: string | null;
  direccion_fiscal?: string | null;
  email_factura?: string | null;
  telefono_factura?: string | null;
  persona_contacto?: string | null;
  iva_defecto?: string | null;
  exento_iva?: boolean | null;
  forma_pago?: string | null;
  iban?: string | null;
};

const emptyForm = {
  nombre: "",
  codigo: "",
  nif_cif: "",
  email: "",
  telefono: "",
  direccion: "",
  contacto_nombre: "",
  contacto_email: "",
  razon_social: "",
  poblacion: "",
  provincia: "",
  cp: "",
  pais: "ES",
  // Fiscal
  tipo_fiscal: "",
  direccion_fiscal: "",
  email_factura: "",
  iva_defecto: "",
  forma_pago: "",
  iban: "",
};

export default function AsesorMisClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/asesor/mis-clientes");
      if (!res.ok) throw new Error("Error al cargar clientes");
      const data = await res.json();
      setClientes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    // Fetch next code
    authenticatedFetch("/asesor/mis-clientes/next-code")
      .then((r) => r.json())
      .then((d) => setForm((f) => ({ ...f, codigo: d.codigo || "" })))
      .catch(() => {});
    setFormOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setForm({
      nombre: cliente.nombre || "",
      codigo: cliente.codigo || "",
      nif_cif: cliente.nif_cif || cliente.nif || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      contacto_nombre: cliente.contacto_nombre || "",
      contacto_email: cliente.contacto_email || "",
      razon_social: cliente.razon_social || "",
      poblacion: cliente.poblacion || cliente.municipio || "",
      provincia: cliente.provincia || "",
      cp: cliente.cp || cliente.codigo_postal || "",
      pais: cliente.pais || "ES",
      tipo_fiscal: cliente.tipo_fiscal || "",
      direccion_fiscal: cliente.direccion_fiscal || "",
      email_factura: cliente.email_factura || "",
      iva_defecto: cliente.iva_defecto || "",
      forma_pago: cliente.forma_pago || "",
      iban: cliente.iban || "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (!editing && !form.codigo.trim()) {
      setFormError("El codigo es obligatorio");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const url = editing
        ? `/asesor/mis-clientes/${editing.id}`
        : "/asesor/mis-clientes";
      const method = editing ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      setFormOpen(false);
      loadClientes();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desactivar este cliente?")) return;
    try {
      const res = await authenticatedFetch(`/asesor/mis-clientes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al desactivar");
      loadClientes();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = clientes.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(s) ||
      c.codigo?.toLowerCase().includes(s) ||
      c.nif_cif?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    );
  });

  if (loading) return <LoadingSpinner fullPage />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={loadClientes}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona tus clientes para facturacion y contabilidad
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por nombre, codigo, NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={16} />
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
            />
            <p className="text-muted-foreground">
              {search
                ? "No se encontraron clientes"
                : "No tienes clientes. Crea tu primer cliente."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={openNew}
              >
                <Plus size={16} />
                Crear primer cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>NIF/CIF</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">
                          {c.codigo || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {c.nombre}
                            {c.vinculado_empresa_id && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                              >
                                <Link2 size={10} className="mr-0.5" />
                                Vinculado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.nif_cif || c.nif || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.email || c.contacto_email || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.telefono || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              c.activo
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            }
                          >
                            {c.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil size={14} />
                            </Button>
                            {c.activo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeactivate(c.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        {c.nombre}
                        {c.vinculado_empresa_id && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <Link2 size={10} className="mr-0.5" />
                            Vinculado
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.codigo} {c.nif_cif ? `- ${c.nif_cif}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        c.activo
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  {(c.email || c.telefono) && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {c.email}
                      {c.email && c.telefono ? " | " : ""}
                      {c.telefono}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                    {c.activo && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30"
                        onClick={() => handleDeactivate(c.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Datos basicos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Nombre *
                </label>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Codigo *
                </label>
                <Input
                  value={form.codigo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, codigo: e.target.value }))
                  }
                  placeholder="CLI-00001"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  NIF/CIF
                </label>
                <Input
                  value={form.nif_cif}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nif_cif: e.target.value }))
                  }
                  placeholder="B12345678"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Telefono
                </label>
                <Input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  placeholder="600 000 000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Persona de contacto
                </label>
                <Input
                  value={form.contacto_nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contacto_nombre: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email contacto
                </label>
                <Input
                  type="email"
                  value={form.contacto_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contacto_email: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Direccion */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Direccion
                </label>
                <Input
                  value={form.direccion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Poblacion
                </label>
                <Input
                  value={form.poblacion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, poblacion: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Provincia
                </label>
                <Input
                  value={form.provincia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, provincia: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Codigo postal
                </label>
                <Input
                  value={form.cp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cp: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pais</label>
                <Input
                  value={form.pais}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pais: e.target.value }))
                  }
                  placeholder="ES"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Datos fiscales */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3 text-muted-foreground">
                Datos fiscales
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Razon social
                  </label>
                  <Input
                    value={form.razon_social}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, razon_social: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Email facturacion
                  </label>
                  <Input
                    type="email"
                    value={form.email_factura}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email_factura: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    IVA por defecto (%)
                  </label>
                  <Input
                    type="number"
                    value={form.iva_defecto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iva_defecto: e.target.value }))
                    }
                    placeholder="21"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Forma de pago
                  </label>
                  <Input
                    value={form.forma_pago}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, forma_pago: e.target.value }))
                    }
                    placeholder="Transferencia"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">IBAN</label>
                  <Input
                    value={form.iban}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iban: e.target.value }))
                    }
                    placeholder="ES00 0000 0000 0000 0000 0000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Direccion fiscal
                  </label>
                  <Input
                    value={form.direccion_fiscal}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        direccion_fiscal: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <LoadingSpinner size="sm" showText={false} />
                  Guardando...
                </>
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Crear cliente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
