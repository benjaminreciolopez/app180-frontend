"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Mail,
  ExternalLink,
  Building2,
  FileText,
  ReceiptEuro,
  UserCheck,
  Calculator,
  Eye,
  Pencil,
  ShieldCheck,
  Link2,
  Check,
  X as XIcon,
  PanelRightOpen,
  RefreshCw,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

type PermisoEntry = { read?: boolean; write?: boolean; upload?: boolean };
type Permisos = {
  facturas?: PermisoEntry;
  gastos?: PermisoEntry;
  nominas?: PermisoEntry;
  fiscal?: PermisoEntry;
  contabilidad?: PermisoEntry;
  documentos?: PermisoEntry;
  [key: string]: PermisoEntry | undefined;
};

const PERMISOS_AREAS: Array<{ key: keyof Permisos; label: string }> = [
  { key: "fiscal", label: "Fiscal" },
  { key: "facturas", label: "Facturación" },
  { key: "gastos", label: "Gastos / Compras" },
  { key: "nominas", label: "Nóminas" },
  { key: "contabilidad", label: "Contabilidad" },
  { key: "documentos", label: "Documentos" },
];

type ClienteVinculado = {
  vinculo_id: string;
  empresa_id: string;
  nombre: string;
  cif: string;
  tipo_contribuyente: "autonomo" | "sociedad" | null;
  estado: "activo" | "pendiente" | "rechazado" | "revocado";
  invitado_por: "empresa" | "asesoria";
  permisos: Permisos;
  connected_at: string | null;
  email: string;
  gestionada?: boolean;
};

const estadoBadge: Record<
  string,
  { label: string; className: string }
> = {
  activo: {
    label: "Activo",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  pendiente: {
    label: "Pendiente",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  rechazado: {
    label: "Rechazado",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  revocado: {
    label: "Revocado",
    className:
      "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
};

const permisoIcons: Record<string, { icon: React.ElementType; label: string }> =
  {
    fiscal: { icon: Calculator, label: "Fiscal" },
    facturas: { icon: FileText, label: "Facturación" },
    gastos: { icon: ReceiptEuro, label: "Gastos" },
    nominas: { icon: UserCheck, label: "Nóminas" },
    contabilidad: { icon: ShieldCheck, label: "Contabilidad" },
    documentos: { icon: FileText, label: "Documentos" },
  };

export default function AsesorClientesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteVinculado[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Cache simple en módulo: si vuelves a /asesor/clientes en menos de 5 min,
  // se sirven los datos en memoria sin llamar al backend.
  const lastLoadRef = useRef<number>(0);
  const CACHE_MS = 5 * 60 * 1000;

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Alta directa de cliente (genera contacto + empresa gestionada / vínculo automático)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: "",
    nif: "",
    tipo_fiscal: "autonomo",
    email: "",
    telefono: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateCliente() {
    setCreateError(null);
    if (!createForm.nombre.trim()) {
      setCreateError("El nombre es obligatorio");
      return;
    }
    if (!createForm.nif.trim()) {
      setCreateError("El NIF/CIF es obligatorio para crear el cliente fiscal");
      return;
    }
    setCreating(true);
    try {
      // Necesitamos un código (siguiente automático)
      const codeRes = await authenticatedFetch("/asesor/mis-clientes/next-code");
      const codeJson = await codeRes.json();
      const codigo = codeJson.codigo || "";

      const res = await authenticatedFetch("/asesor/mis-clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: createForm.nombre.trim(),
          codigo,
          nif: createForm.nif.trim().toUpperCase(),
          nif_cif: createForm.nif.trim().toUpperCase(),
          tipo_fiscal: createForm.tipo_fiscal,
          email: createForm.email.trim() || null,
          telefono: createForm.telefono.trim() || null,
          razon_social: createForm.nombre.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error creando cliente");

      setCreateOpen(false);
      setCreateForm({ nombre: "", nif: "", tipo_fiscal: "autonomo", email: "", telefono: "" });

      const empresaId = json.vinculo?.empresa_id;
      if (empresaId) {
        // Si ya hay vínculo (gestionada o con app), navegamos directamente
        router.push(`/asesor/clientes/${empresaId}`);
      } else {
        await loadClientes({ force: true });
      }
    } catch (err: any) {
      setCreateError(err.message || "Error creando cliente");
    } finally {
      setCreating(false);
    }
  }


  // Permisos editor dialog
  const [permisosOpen, setPermisosOpen] = useState(false);
  const [permisosTarget, setPermisosTarget] = useState<ClienteVinculado | null>(null);
  const [permisosDraft, setPermisosDraft] = useState<Permisos>({});
  const [permisosSaving, setPermisosSaving] = useState(false);

  function openPermisosEditor(cliente: ClienteVinculado) {
    setPermisosTarget(cliente);
    setPermisosDraft(cliente.permisos || {});
    setPermisosOpen(true);
  }

  function togglePermiso(area: keyof Permisos, kind: "read" | "write") {
    setPermisosDraft((prev) => {
      const current = prev[area] || {};
      const next = { ...current, [kind]: !current[kind] };
      // write implies read
      if (kind === "write" && next.write) next.read = true;
      // unchecking read also unchecks write
      if (kind === "read" && !next.read) next.write = false;
      return { ...prev, [area]: next };
    });
  }

  async function handleSavePermisos() {
    if (!permisosTarget) return;
    setPermisosSaving(true);
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${permisosTarget.empresa_id}/permisos`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permisos: permisosDraft }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Error");
      setClientes((prev) =>
        prev.map((c) =>
          c.empresa_id === permisosTarget.empresa_id
            ? { ...c, permisos: permisosDraft }
            : c
        )
      );
      setPermisosOpen(false);
      setPermisosTarget(null);
    } catch (err: any) {
      alert(err.message || "Error guardando permisos");
    } finally {
      setPermisosSaving(false);
    }
  }

  /**
   * Cargar lista de clientes. Por defecto reutiliza el cache si la última
   * carga fue hace menos de 5 min. Pasa { force: true } para forzar refresh
   * tras una mutación (alta, invitación, aceptación, etc.).
   */
  async function loadClientes(opts?: { force?: boolean }) {
    const now = Date.now();
    if (!opts?.force && clientes.length > 0 && (now - lastLoadRef.current) < CACHE_MS) {
      return; // cache válido, no recargamos
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/asesor/clientes");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cargar los clientes");
      }
      setClientes(json.data || []);
      lastLoadRef.current = Date.now();
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await authenticatedFetch("/asesor/clientes/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al enviar la invitacion");
      }
      setInviteSuccess(true);
      setInviteEmail("");
      loadClientes({ force: true });
    } catch (err: any) {
      setInviteError(err.message || "Error al invitar");
    } finally {
      setInviting(false);
    }
  }

  async function handleAccept(vinculoId: string) {
    setActionLoading((prev) => ({ ...prev, [vinculoId]: true }));
    try {
      const res = await authenticatedFetch(`/asesor/clientes/aceptar/${vinculoId}`, {
        method: "PUT",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Error");
      loadClientes({ force: true });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [vinculoId]: false }));
    }
  }

  async function handleReject(vinculoId: string) {
    if (!confirm("Rechazar esta solicitud?")) return;
    setActionLoading((prev) => ({ ...prev, [vinculoId]: true }));
    try {
      const res = await authenticatedFetch(`/asesor/clientes/rechazar/${vinculoId}`, {
        method: "PUT",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Error");
      loadClientes({ force: true });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [vinculoId]: false }));
    }
  }

  async function handleTipoChange(empresaId: string, tipo: "autonomo" | "sociedad") {
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/tipo-contribuyente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_contribuyente: tipo }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Error");
      setClientes((prev) =>
        prev.map((c) =>
          c.empresa_id === empresaId ? { ...c, tipo_contribuyente: tipo } : c
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    try {
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return "-";
    }
  }

  function renderPermisos(permisos: Permisos) {
    const keys = Object.keys(permisoIcons);
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {keys.map((key) => {
          const perm = permisos[key];
          if (!perm) return null;
          const { icon: Icon, label } = permisoIcons[key];
          const hasRead = perm.read;
          const hasWrite = perm.write;
          if (!hasRead && !hasWrite) return null;

          return (
            <span
              key={key}
              title={`${label}: ${hasRead ? "Lectura" : ""}${hasRead && hasWrite ? " + " : ""}${hasWrite ? "Escritura" : ""}`}
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              <Icon size={12} />
              {hasWrite ? (
                <Pencil size={10} className="text-primary" />
              ) : (
                <Eye size={10} />
              )}
            </span>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => loadClientes({ force: true })}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Empresas que gestiona tu asesoría — con app instalada o sin ella.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadClientes({ force: true })}
            disabled={loading}
            title="Refrescar lista (forzar lectura del servidor)"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus size={16} />
            Nuevo cliente
          </Button>
          <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
            <Mail size={16} />
            Invitar (con app)
          </Button>
        </div>
      </div>

      {/* Client count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users size={16} />
        {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} en total
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
            />
            <p className="text-muted-foreground">
              No tienes clientes vinculados.
            </p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => setInviteOpen(true)}
            >
              <Plus size={16} />
              Invitar tu primer cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Vinculado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente) => {
                      const estado =
                        estadoBadge[cliente.estado] || estadoBadge.revocado;
                      return (
                        <TableRow
                          key={cliente.vinculo_id}
                          className={cliente.estado === "activo" ? "cursor-pointer hover:bg-muted/40" : ""}
                          onClick={cliente.estado === "activo" ? () => router.push(`/asesor/clientes/${cliente.empresa_id}`) : undefined}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Building2
                                size={16}
                                className="text-muted-foreground shrink-0"
                              />
                              {cliente.nombre}
                              {cliente.gestionada && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                  Sin app
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {cliente.estado === "activo" ? (
                              <select
                                value={cliente.tipo_contribuyente || ""}
                                onChange={(e) => {
                                  const val = e.target.value as "autonomo" | "sociedad";
                                  if (val) handleTipoChange(cliente.empresa_id, val);
                                }}
                                className="text-xs border rounded px-2 py-1 bg-background"
                              >
                                <option value="">Sin definir</option>
                                <option value="autonomo">Autonomo</option>
                                <option value="sociedad">Sociedad</option>
                              </select>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {cliente.tipo_contribuyente === "autonomo" ? "Autonomo" : cliente.tipo_contribuyente === "sociedad" ? "Sociedad" : "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cliente.email || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={estado.className}
                            >
                              {estado.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {renderPermisos(cliente.permisos || {})}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(cliente.connected_at)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {cliente.estado === "activo" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => openPermisosEditor(cliente)}
                                    title="Servicios contratados"
                                  >
                                    <ShieldCheck size={14} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() =>
                                      router.push(
                                        `/asesor/clientes/${cliente.empresa_id}`
                                      )
                                    }
                                  >
                                    Acceder
                                    <ExternalLink size={14} />
                                  </Button>
                                </>
                              )}
                              {cliente.estado === "pendiente" && cliente.invitado_por === "empresa" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="gap-1 bg-green-600 hover:bg-green-700"
                                    disabled={actionLoading[cliente.vinculo_id]}
                                    onClick={() => handleAccept(cliente.vinculo_id)}
                                  >
                                    <Check size={14} />
                                    Aceptar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-destructive border-destructive/30"
                                    disabled={actionLoading[cliente.vinculo_id]}
                                    onClick={() => handleReject(cliente.vinculo_id)}
                                  >
                                    <XIcon size={14} />
                                  </Button>
                                </>
                              )}
                              {cliente.estado === "pendiente" && cliente.invitado_por === "asesoria" && (
                                <span className="text-xs text-muted-foreground">Esperando respuesta</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {clientes.map((cliente) => {
              const estado =
                estadoBadge[cliente.estado] || estadoBadge.revocado;
              return (
                <Card
                  key={cliente.vinculo_id}
                  className={cliente.estado === "activo" ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}
                  onClick={cliente.estado === "activo" ? () => router.push(`/asesor/clientes/${cliente.empresa_id}`) : undefined}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                            {cliente.nombre}
                            {cliente.gestionada && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                                Sin app
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.cif || cliente.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={estado.className}>
                        {estado.label}
                      </Badge>
                    </div>

                    {cliente.estado === "activo" && (
                      <div className="mb-3">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</label>
                        <select
                          value={cliente.tipo_contribuyente || ""}
                          onChange={(e) => {
                            const val = e.target.value as "autonomo" | "sociedad";
                            if (val) handleTipoChange(cliente.empresa_id, val);
                          }}
                          className="text-xs border rounded px-2 py-1 bg-background w-full mt-1"
                        >
                          <option value="">Sin definir</option>
                          <option value="autonomo">Autonomo</option>
                          <option value="sociedad">Sociedad</option>
                        </select>
                      </div>
                    )}

                    <div className="mb-3">
                      {renderPermisos(cliente.permisos || {})}
                    </div>

                    {cliente.connected_at && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Vinculado: {formatDate(cliente.connected_at)}
                      </p>
                    )}

                    {cliente.estado === "activo" && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openPermisosEditor(cliente)}
                          title="Servicios contratados"
                        >
                          <ShieldCheck size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() =>
                            router.push(
                              `/asesor/clientes/${cliente.empresa_id}`
                            )
                          }
                        >
                          Acceder
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    )}
                    {cliente.estado === "pendiente" && cliente.invitado_por === "empresa" && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                          disabled={actionLoading[cliente.vinculo_id]}
                          onClick={() => handleAccept(cliente.vinculo_id)}
                        >
                          <Check size={14} />
                          Aceptar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive border-destructive/30"
                          disabled={actionLoading[cliente.vinculo_id]}
                          onClick={() => handleReject(cliente.vinculo_id)}
                        >
                          <XIcon size={14} />
                          Rechazar
                        </Button>
                      </div>
                    )}
                    {cliente.estado === "pendiente" && cliente.invitado_por === "asesoria" && (
                      <p className="text-xs text-muted-foreground text-center">Esperando respuesta del cliente</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Permisos editor dialog */}
      <Dialog
        open={permisosOpen}
        onOpenChange={(open) => {
          setPermisosOpen(open);
          if (!open) {
            setPermisosTarget(null);
            setPermisosDraft({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servicios contratados</DialogTitle>
            <DialogDescription>
              {permisosTarget?.nombre
                ? `Marca qué áreas gestiona la asesoría para ${permisosTarget.nombre}. "Escritura" implica responsabilidad de la asesoría: la empresa verá ese módulo bloqueado en su panel.`
                : "Marca las áreas delegadas."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold pb-1 border-b">
              <span>Área</span>
              <span className="px-3">Lectura</span>
              <span className="px-3">Escritura</span>
            </div>
            {PERMISOS_AREAS.map((area) => {
              const entry = permisosDraft[area.key] || {};
              return (
                <div
                  key={area.key}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5"
                >
                  <span className="text-sm">{area.label}</span>
                  <label className="px-3 flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={!!entry.read}
                      onChange={() => togglePermiso(area.key, "read")}
                    />
                  </label>
                  <label className="px-3 flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={!!entry.write}
                      onChange={() => togglePermiso(area.key, "write")}
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermisosOpen(false)}
              disabled={permisosSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePermisos} disabled={permisosSaving}>
              {permisosSaving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail("");
            setInviteError(null);
            setInviteSuccess(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Cliente</DialogTitle>
            <DialogDescription>
              Introduce el email del administrador de la empresa que deseas
              vincular como cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="invite-email"
                className="text-sm font-medium mb-1.5 block"
              >
                Email de la empresa
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
                disabled={inviting}
              />
            </div>

            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}

            {inviteSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Invitacion enviada correctamente.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="gap-2"
            >
              {inviting ? (
                <>
                  <LoadingSpinner size="sm" showText={false} />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Enviar Invitacion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Modal: Nuevo cliente (sin app, gestionada por la asesoría) === */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setCreateError(null);
          setCreateForm({ nombre: "", nif: "", tipo_fiscal: "autonomo", email: "", telefono: "" });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Da de alta un cliente que <strong>no</strong> usa la app. La asesoría
              llevará su gestión fiscal, contabilidad, nóminas y facturación con
              permisos completos. Si más adelante el cliente se registra en
              CONTENDO con el mismo NIF, el vínculo se transferirá automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nombre / Razón social *</label>
              <Input
                value={createForm.nombre}
                onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Juan Pérez García / ACME SL"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">NIF / CIF *</label>
                <Input
                  value={createForm.nif}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nif: e.target.value.toUpperCase() }))}
                  placeholder="12345678A"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select
                  value={createForm.tipo_fiscal}
                  onChange={(e) => setCreateForm((f) => ({ ...f, tipo_fiscal: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="autonomo">Autónomo</option>
                  <option value="sociedad">Sociedad</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email contacto</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                <Input
                  value={createForm.telefono}
                  onChange={(e) => setCreateForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
            </div>
            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCliente} disabled={creating} className="gap-2">
              {creating ? (
                <>
                  <LoadingSpinner size="sm" showText={false} />
                  Creando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Crear y abrir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
