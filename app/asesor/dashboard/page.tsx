"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Mail,
  MessageSquare,
  FileText,
  AlertTriangle,
  Plus,
  Clock,
  Building2,
  ArrowRight,
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

type Cliente = {
  empresa_id: string;
  nombre: string;
  ultimo_acceso: string | null;
  facturas_pendientes: number;
  alertas: number;
};

type DashboardData = {
  clientes_activos: number;
  invitaciones_pendientes: number;
  mensajes_no_leidos: number;
  clientes: Cliente[];
};

export default function AsesorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/asesor/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cargar el dashboard");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
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
      // Reload dashboard to reflect new invitation
      loadDashboard();
    } catch (err: any) {
      setInviteError(err.message || "Error al invitar");
    } finally {
      setInviting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Sin acceso";
    try {
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return "Fecha no disponible";
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={loadDashboard}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Resumen general de tus clientes
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus size={16} />
          Invitar Cliente
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Clientes activos
                </p>
                <p className="text-3xl font-bold">{data.clientes_activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Mail size={24} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Invitaciones pendientes
                </p>
                <p className="text-3xl font-bold">
                  {data.invitaciones_pendientes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <MessageSquare size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Mensajes no leidos
                </p>
                <p className="text-3xl font-bold">
                  {data.mensajes_no_leidos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client cards grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Mis Clientes</h2>
        {data.clientes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2
                size={48}
                className="mx-auto text-muted-foreground/30 mb-4"
              />
              <p className="text-muted-foreground">
                No tienes clientes vinculados todavia.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Invita a tu primer cliente para comenzar.
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => setInviteOpen(true)}
              >
                <Plus size={16} />
                Invitar Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.clientes.map((cliente) => (
              <Card
                key={cliente.empresa_id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                onClick={() =>
                  router.push(`/asesor/clientes/${cliente.empresa_id}`)
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={20} className="text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {cliente.nombre}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {formatDate(cliente.ultimo_acceso)}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {cliente.facturas_pendientes > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText size={12} />
                        {cliente.facturas_pendientes} factura
                        {cliente.facturas_pendientes !== 1 ? "s" : ""}{" "}
                        pendiente
                        {cliente.facturas_pendientes !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {cliente.alertas > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle size={12} />
                        {cliente.alertas} alerta
                        {cliente.alertas !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {cliente.facturas_pendientes === 0 &&
                      cliente.alertas === 0 && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 dark:border-green-800"
                        >
                          Al dia
                        </Badge>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
