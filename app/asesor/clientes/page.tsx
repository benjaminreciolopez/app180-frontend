"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Mail,
  ExternalLink,
  Building2,
  FileText,
  Receipt,
  UserCheck,
  Calculator,
  Eye,
  Pencil,
  ShieldCheck,
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

type Permisos = {
  facturacion?: { lectura?: boolean; escritura?: boolean };
  gastos?: { lectura?: boolean; escritura?: boolean };
  empleados?: { lectura?: boolean; escritura?: boolean };
  fiscal?: { lectura?: boolean; escritura?: boolean };
  contabilidad?: { lectura?: boolean; escritura?: boolean };
  [key: string]: { lectura?: boolean; escritura?: boolean } | undefined;
};

type ClienteVinculado = {
  vinculo_id: string;
  empresa_id: string;
  nombre: string;
  cif: string;
  estado: "activo" | "pendiente" | "rechazado" | "revocado";
  permisos: Permisos;
  connected_at: string | null;
  email: string;
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
    facturacion: { icon: FileText, label: "Facturacion" },
    gastos: { icon: Receipt, label: "Gastos" },
    empleados: { icon: UserCheck, label: "Empleados" },
    fiscal: { icon: Calculator, label: "Fiscal" },
    contabilidad: { icon: ShieldCheck, label: "Contabilidad" },
  };

export default function AsesorClientesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteVinculado[]>([]);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  async function loadClientes() {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/asesor/clientes");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cargar los clientes");
      }
      setClientes(json.data || []);
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientes();
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
      loadClientes();
    } catch (err: any) {
      setInviteError(err.message || "Error al invitar");
    } finally {
      setInviting(false);
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
          const hasRead = perm.lectura;
          const hasWrite = perm.escritura;
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
        <Button variant="outline" onClick={loadClientes}>
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
            Gestiona tus clientes vinculados
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus size={16} />
          Invitar Cliente
        </Button>
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
                      <TableHead>CIF</TableHead>
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
                        <TableRow key={cliente.vinculo_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2
                                size={16}
                                className="text-muted-foreground shrink-0"
                              />
                              {cliente.nombre}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cliente.cif || "-"}
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
                          <TableCell className="text-right">
                            {cliente.estado === "activo" && (
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
                            )}
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
                <Card key={cliente.vinculo_id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {cliente.nombre}
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

                    <div className="mb-3">
                      {renderPermisos(cliente.permisos || {})}
                    </div>

                    {cliente.connected_at && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Vinculado: {formatDate(cliente.connected_at)}
                      </p>
                    )}

                    {cliente.estado === "activo" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1"
                        onClick={() =>
                          router.push(
                            `/asesor/clientes/${cliente.empresa_id}`
                          )
                        }
                      >
                        Acceder
                        <ExternalLink size={14} />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

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
    </div>
  );
}
