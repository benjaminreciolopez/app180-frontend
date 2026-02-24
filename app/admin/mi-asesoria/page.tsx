"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldOff,
  Link2,
  LinkOff,
  Send,
  Download,
  FileSpreadsheet,
  FileText,
  Archive,
  Receipt,
  Wallet,
  Users,
  UserCheck,
  Calculator,
  BookOpen,
  Settings,
  Lightbulb,
  AlertTriangle,
  Paperclip,
  Bot,
  Clock,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  Briefcase,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Permisos {
  facturas: { read: boolean; write: boolean };
  gastos: { read: boolean; write: boolean };
  clientes: { read: boolean; write: boolean };
  empleados: { read: boolean; write: boolean };
  nominas: { read: boolean; write: boolean };
  fiscal: { read: boolean; write: boolean };
  contabilidad: { read: boolean; write: boolean };
  configuracion: { read: boolean; write: boolean };
}

interface Vinculo {
  id: string;
  asesoria_id: string;
  estado: "activo" | "pendiente";
  invitado_por: "empresa" | "asesoria";
  permisos: Permisos;
  connected_at: string | null;
  created_at: string;
  asesoria_nombre: string;
  asesoria_cif: string;
  asesoria_email: string;
  asesoria_telefono: string;
  asesoria_direccion: string;
}

interface Mensaje {
  id: string;
  contenido: string;
  tipo: "mensaje" | "recomendacion" | "alerta" | "solicitud_doc" | "sistema";
  autor_tipo: "admin" | "asesor";
  autor_nombre: string;
  leido: boolean;
  created_at: string;
}

// ── Permission section config ──────────────────────────────────────────────

const PERMISOS_SECTIONS: {
  key: keyof Permisos;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { key: "facturas", label: "Facturas", icon: Receipt, description: "Facturas emitidas y recibidas" },
  { key: "gastos", label: "Gastos", icon: Wallet, description: "Gastos y tickets" },
  { key: "clientes", label: "Clientes", icon: Users, description: "Base de datos de clientes" },
  { key: "empleados", label: "Empleados", icon: UserCheck, description: "Datos de empleados" },
  { key: "nominas", label: "Nominas", icon: FileText, description: "Nominas y pagos" },
  { key: "fiscal", label: "Fiscal", icon: Calculator, description: "Modelos fiscales (303, 130...)" },
  { key: "contabilidad", label: "Contabilidad", icon: BookOpen, description: "Asientos y balances" },
  { key: "configuracion", label: "Configuracion", icon: Settings, description: "Ajustes de la empresa" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return formatTime(dateStr);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MiAsesoriaPage() {
  const [loading, setLoading] = useState(true);
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invitation
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // Permissions
  const [permisos, setPermisos] = useState<Permisos | null>(null);
  const [savingPermisos, setSavingPermisos] = useState(false);
  const [permisosChanged, setPermisosChanged] = useState(false);

  // Chat
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Export
  const [exportAnio, setExportAnio] = useState(new Date().getFullYear().toString());
  const [exportTrimestre, setExportTrimestre] = useState(() => {
    const month = new Date().getMonth() + 1;
    return Math.ceil(month / 3).toString();
  });
  const [exportFormato, setExportFormato] = useState("excel");
  const [exporting, setExporting] = useState(false);

  // Dialogs
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load vinculo ──────────────────────────────────────────────────────────

  const loadVinculo = useCallback(async () => {
    try {
      setError(null);
      const res = await authenticatedFetch("/admin/asesoria/vinculo");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setVinculo(json.data);
        if (json.data.permisos) {
          setPermisos(JSON.parse(JSON.stringify(json.data.permisos)));
        }
      } else {
        setVinculo(null);
        setPermisos(null);
      }
    } catch (err) {
      console.error("Error cargando vinculo:", err);
      setError("No se pudo cargar la informacion de la asesoria");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVinculo();
  }, [loadVinculo]);

  // ── Load messages ─────────────────────────────────────────────────────────

  const loadMensajes = useCallback(async () => {
    if (!vinculo || vinculo.estado !== "activo") return;
    setLoadingMensajes(true);
    try {
      const res = await authenticatedFetch("/admin/asesoria/mensajes?page=1&limit=50");
      const json = await res.json();
      if (res.ok && json.success) {
        setMensajes((json.data || []).reverse());
      }
    } catch (err) {
      console.error("Error cargando mensajes:", err);
    } finally {
      setLoadingMensajes(false);
    }
  }, [vinculo]);

  const loadUnread = useCallback(async () => {
    if (!vinculo || vinculo.estado !== "activo") return;
    try {
      const res = await authenticatedFetch("/admin/asesoria/mensajes/no-leidos");
      const json = await res.json();
      if (res.ok && json.success) {
        setUnreadCount(json.data?.total ?? 0);
      }
    } catch {
      // silent
    }
  }, [vinculo]);

  useEffect(() => {
    if (vinculo?.estado === "activo") {
      loadMensajes();
      loadUnread();
    }
  }, [vinculo, loadMensajes, loadUnread]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Mark messages as read when chat tab is viewed
  const markAsRead = useCallback(async () => {
    const unread = mensajes.filter((m) => !m.leido && m.autor_tipo === "asesor");
    for (const msg of unread) {
      try {
        await authenticatedFetch(`/admin/asesoria/mensajes/${msg.id}/leido`, {
          method: "PUT",
        });
      } catch {
        // silent
      }
    }
    if (unread.length > 0) {
      setMensajes((prev) => prev.map((m) => ({ ...m, leido: true })));
      setUnreadCount(0);
    }
  }, [mensajes]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleInvitar = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/admin/asesoria/invitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setInviteEmail("");
        await loadVinculo();
      } else {
        setError(json.error || json.message || "Error al enviar la invitacion");
      }
    } catch {
      setError("Error de conexion al enviar la invitacion");
    } finally {
      setInviting(false);
    }
  };

  const handleAceptar = async () => {
    if (!vinculo) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/admin/asesoria/aceptar/${vinculo.id}`, {
        method: "PUT",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadVinculo();
      } else {
        setError(json.error || "Error al aceptar la invitacion");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!vinculo) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/admin/asesoria/rechazar/${vinculo.id}`, {
        method: "PUT",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadVinculo();
      } else {
        setError(json.error || "Error al rechazar la invitacion");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevocar = async () => {
    setRevoking(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/admin/asesoria/revocar", {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowRevokeDialog(false);
        setVinculo(null);
        setPermisos(null);
        setMensajes([]);
      } else {
        setError(json.error || "Error al revocar el acceso");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setRevoking(false);
    }
  };

  const handleSavePermisos = async () => {
    if (!permisos) return;
    setSavingPermisos(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/admin/asesoria/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permisos }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPermisosChanged(false);
        await loadVinculo();
      } else {
        setError(json.error || "Error al guardar los permisos");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setSavingPermisos(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    setSendingMsg(true);
    try {
      const res = await authenticatedFetch("/admin/asesoria/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: chatInput.trim(), tipo: "mensaje" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setChatInput("");
        await loadMensajes();
      }
    } catch {
      // silent
    } finally {
      setSendingMsg(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `/admin/asesoria/export/trimestral?anio=${exportAnio}&trimestre=${exportTrimestre}&formato=${exportFormato}`
      );
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Error al exportar los datos");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = exportFormato === "excel" ? "xlsx" : exportFormato;
      a.href = url;
      a.download = `datos-asesoria-${exportAnio}-T${exportTrimestre}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Error de conexion al exportar");
    } finally {
      setExporting(false);
    }
  };

  // ── Permission toggle ─────────────────────────────────────────────────────

  const togglePermiso = (section: keyof Permisos, type: "read" | "write") => {
    if (!permisos) return;
    setPermisos((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated[section] = {
        ...updated[section],
        [type]: !updated[section][type],
      };
      // If disabling read, also disable write
      if (type === "read" && !updated[section].read) {
        updated[section].write = false;
      }
      // If enabling write, also enable read
      if (type === "write" && updated[section].write) {
        updated[section].read = true;
      }
      return updated;
    });
    setPermisosChanged(true);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const getMsgIcon = (tipo: Mensaje["tipo"]) => {
    switch (tipo) {
      case "recomendacion":
        return <Lightbulb className="size-3.5 text-amber-500 shrink-0" />;
      case "alerta":
        return <AlertTriangle className="size-3.5 text-red-500 shrink-0" />;
      case "solicitud_doc":
        return <Paperclip className="size-3.5 text-blue-500 shrink-0" />;
      case "sistema":
        return <Bot className="size-3.5 text-muted-foreground shrink-0" />;
      default:
        return null;
    }
  };

  const getMsgBorderClass = (tipo: Mensaje["tipo"]) => {
    switch (tipo) {
      case "alerta":
        return "border-l-2 border-l-red-500";
      case "recomendacion":
        return "border-l-2 border-l-amber-500";
      case "solicitud_doc":
        return "border-l-2 border-l-blue-500";
      case "sistema":
        return "border-l-2 border-l-muted-foreground";
      default:
        return "";
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // ── Page ──────────────────────────────────────────────────────────────────

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Briefcase className="size-6" />
          Mi Asesoria
        </h1>
        <p className="text-muted-foreground text-sm">
          Gestiona la conexion con tu asesoria fiscal y comparte datos de forma segura.
        </p>
      </div>

      {/* Global error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Tab layout */}
      <Tabs defaultValue="vinculo" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vinculo" className="gap-1.5">
            <Link2 className="size-4" />
            <span className="hidden sm:inline">Vinculo</span>
          </TabsTrigger>
          {vinculo?.estado === "activo" && (
            <TabsTrigger value="permisos" className="gap-1.5">
              <Shield className="size-4" />
              <span className="hidden sm:inline">Permisos</span>
            </TabsTrigger>
          )}
          {vinculo?.estado === "activo" && (
            <TabsTrigger
              value="chat"
              className="gap-1.5"
              onClick={() => markAsRead()}
            >
              <MessageSquare className="size-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="exportar" className="gap-1.5">
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB: VINCULO ═══════════════════ */}
        <TabsContent value="vinculo" className="mt-4">
          {!vinculo && <EstadoSinVinculo email={inviteEmail} setEmail={setInviteEmail} onInvitar={handleInvitar} loading={inviting} />}

          {vinculo?.estado === "pendiente" && vinculo.invitado_por === "empresa" && (
            <EstadoPendienteEnviado vinculo={vinculo} onRefresh={loadVinculo} />
          )}

          {vinculo?.estado === "pendiente" && vinculo.invitado_por === "asesoria" && (
            <EstadoPendienteRecibido
              vinculo={vinculo}
              onAceptar={handleAceptar}
              onRechazar={handleRechazar}
              loading={actionLoading}
            />
          )}

          {vinculo?.estado === "activo" && (
            <EstadoActivo
              vinculo={vinculo}
              onRevocar={() => setShowRevokeDialog(true)}
            />
          )}
        </TabsContent>

        {/* ═══════════════════ TAB: PERMISOS ═══════════════════ */}
        {vinculo?.estado === "activo" && (
          <TabsContent value="permisos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Permisos de Acceso
                </CardTitle>
                <CardDescription>
                  Controla que datos puede ver y editar tu asesoria. Los cambios se guardan al pulsar el boton.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permisos && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PERMISOS_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const p = permisos[section.key];
                        return (
                          <div
                            key={section.key}
                            className="border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-primary/10 text-primary rounded-md p-2">
                                <Icon className="size-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{section.label}</p>
                                <p className="text-xs text-muted-foreground">{section.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                  checked={p.read}
                                  onCheckedChange={() => togglePermiso(section.key, "read")}
                                />
                                <span className="text-muted-foreground">Lectura</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Switch
                                  checked={p.write}
                                  onCheckedChange={() => togglePermiso(section.key, "write")}
                                />
                                <span className="text-muted-foreground">Escritura</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSavePermisos}
                        disabled={savingPermisos || !permisosChanged}
                      >
                        {savingPermisos ? (
                          <>
                            <RefreshCw className="size-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Check className="size-4" />
                            Guardar Permisos
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ═══════════════════ TAB: CHAT ═══════════════════ */}
        {vinculo?.estado === "activo" && (
          <TabsContent value="chat" className="mt-4">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: "500px" }}>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-5 text-primary" />
                  Chat con {vinculo.asesoria_nombre}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMensajes ? (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <MessageSquare className="size-10 opacity-30" />
                    <p className="text-sm">No hay mensajes todavia.</p>
                    <p className="text-xs">Envia el primer mensaje a tu asesoria.</p>
                  </div>
                ) : (
                  <>
                    {mensajes.map((msg) => {
                      const isMe = msg.autor_tipo === "admin";
                      const icon = getMsgIcon(msg.tipo);
                      const borderClass = getMsgBorderClass(msg.tipo);
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm ${borderClass} ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            {icon && (
                              <div className="flex items-center gap-1.5 mb-1">
                                {icon}
                                <span className="text-[10px] uppercase font-semibold opacity-70">
                                  {msg.tipo === "recomendacion"
                                    ? "Recomendacion"
                                    : msg.tipo === "alerta"
                                    ? "Alerta"
                                    : msg.tipo === "solicitud_doc"
                                    ? "Solicitud de documento"
                                    : "Sistema"}
                                </span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.contenido}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-[10px] ${
                                isMe ? "justify-end opacity-70" : "opacity-50"
                              }`}
                            >
                              <Clock className="size-2.5" />
                              {formatDateShort(msg.created_at)}
                              {isMe && msg.leido && <Check className="size-2.5 ml-0.5" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </CardContent>
              {/* Chat input */}
              <div className="border-t p-3 flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendingMsg}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={sendingMsg || !chatInput.trim()}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ═══════════════════ TAB: EXPORTAR ═══════════════════ */}
        <TabsContent value="exportar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="size-5 text-primary" />
                Exportar Datos para Asesoria
              </CardTitle>
              <CardDescription>
                Descarga un paquete con los datos trimestrales para enviar a tu asesoria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Year */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ejercicio</label>
                  <Select value={exportAnio} onValueChange={setExportAnio}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quarter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Trimestre</label>
                  <Select value={exportTrimestre} onValueChange={setExportTrimestre}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar trimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">T1 - Enero a Marzo</SelectItem>
                      <SelectItem value="2">T2 - Abril a Junio</SelectItem>
                      <SelectItem value="3">T3 - Julio a Septiembre</SelectItem>
                      <SelectItem value="4">T4 - Octubre a Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Formato</label>
                  <Select value={exportFormato} onValueChange={setExportFormato}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="size-4 text-green-600" />
                          Excel (.xlsx)
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-blue-600" />
                          CSV (.csv)
                        </div>
                      </SelectItem>
                      <SelectItem value="zip">
                        <div className="flex items-center gap-2">
                          <Archive className="size-4 text-amber-600" />
                          ZIP (todo incluido)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleExport} disabled={exporting}>
                  {exporting ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Descargar {exportFormato === "excel" ? "Excel" : exportFormato === "csv" ? "CSV" : "ZIP"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revoke confirmation dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar acceso de asesoria</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la conexion con <span className="font-semibold">{vinculo?.asesoria_nombre}</span>.
              La asesoria perdera acceso inmediato a todos tus datos. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevocar} disabled={revoking}>
              {revoking ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Revocando...
                </>
              ) : (
                <>
                  <ShieldOff className="size-4" />
                  Revocar Acceso
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EstadoSinVinculo({
  email,
  setEmail,
  onInvitar,
  loading,
}: {
  email: string;
  setEmail: (v: string) => void;
  onInvitar: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkOff className="size-5 text-muted-foreground" />
          Sin asesoria conectada
        </CardTitle>
        <CardDescription>
          Conecta con tu asesoria fiscal para compartir datos de forma segura y facilitar la comunicacion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-6 border border-dashed">
          <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
            <div className="bg-primary/10 text-primary rounded-full p-4">
              <Building2 className="size-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Invitar Asesoria</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Introduce el email de tu asesoria fiscal para enviarle una invitacion de conexion.
              </p>
            </div>
            <div className="flex w-full gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@asesoria.com"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onInvitar();
                }}
                disabled={loading}
              />
              <Button onClick={onInvitar} disabled={loading || !email.trim()}>
                {loading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="size-4" />
                    Invitar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoPendienteEnviado({
  vinculo,
  onRefresh,
}: {
  vinculo: Vinculo;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5 text-amber-500" />
          Invitacion pendiente
        </CardTitle>
        <CardDescription>
          Has enviado una invitacion a una asesoria. Esperando a que la acepten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md p-2 shrink-0">
              <Building2 className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{vinculo.asesoria_nombre || "Asesoria invitada"}</p>
              {vinculo.asesoria_email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="size-3.5" />
                  {vinculo.asesoria_email}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                  <Clock className="size-3 mr-1" />
                  Pendiente
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Enviada el {formatDate(vinculo.created_at)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh} title="Actualizar estado">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoPendienteRecibido({
  vinculo,
  onAceptar,
  onRechazar,
  loading,
}: {
  vinculo: Vinculo;
  onAceptar: () => void;
  onRechazar: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-blue-500" />
          Invitacion recibida
        </CardTitle>
        <CardDescription>
          Una asesoria quiere conectarse con tu empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md p-2 shrink-0">
              <Building2 className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{vinculo.asesoria_nombre}</p>
              {vinculo.asesoria_cif && (
                <p className="text-sm text-muted-foreground mt-0.5">CIF: {vinculo.asesoria_cif}</p>
              )}
              {vinculo.asesoria_email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="size-3.5" />
                  {vinculo.asesoria_email}
                </p>
              )}
              {vinculo.asesoria_telefono && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="size-3.5" />
                  {vinculo.asesoria_telefono}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-blue-600 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30">
                  Solicitud de conexion
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Recibida el {formatDate(vinculo.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
            <Button onClick={onAceptar} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <>
                  <Check className="size-4" />
                  Aceptar
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onRechazar} disabled={loading} className="flex-1 sm:flex-none">
              <X className="size-4" />
              Rechazar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EstadoActivo({
  vinculo,
  onRevocar,
}: {
  vinculo: Vinculo;
  onRevocar: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-green-500" />
          Asesoria conectada
        </CardTitle>
        <CardDescription>
          Tu empresa esta conectada con la siguiente asesoria fiscal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg p-3 shrink-0">
              <Building2 className="size-6" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-lg font-semibold text-foreground">{vinculo.asesoria_nombre}</p>
                <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white mt-1">
                  <Check className="size-3 mr-1" />
                  Activo
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm pt-2">
                {vinculo.asesoria_cif && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="size-3.5 shrink-0" />
                    <span>CIF: {vinculo.asesoria_cif}</span>
                  </div>
                )}
                {vinculo.asesoria_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{vinculo.asesoria_email}</span>
                  </div>
                )}
                {vinculo.asesoria_telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    <span>{vinculo.asesoria_telefono}</span>
                  </div>
                )}
                {vinculo.asesoria_direccion && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{vinculo.asesoria_direccion}</span>
                  </div>
                )}
              </div>
              {vinculo.connected_at && (
                <p className="text-xs text-muted-foreground pt-1">
                  Conectado desde el {formatDate(vinculo.connected_at)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex justify-end">
          <Button variant="destructive" onClick={onRevocar}>
            <ShieldOff className="size-4" />
            Revocar Acceso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
