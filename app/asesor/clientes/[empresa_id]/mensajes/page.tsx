"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCheck,
  Lightbulb,
  AlertTriangle,
  Paperclip,
  Bot,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mensaje = {
  id: string;
  contenido: string;
  tipo: "mensaje" | "recomendacion" | "alerta" | "solicitud_doc" | "sistema";
  adjuntos: unknown | null;
  autor_id: string;
  autor_tipo: "asesor" | "admin";
  leido: boolean;
  leido_at: string | null;
  created_at: string;
  autor_nombre: string;
  autor_avatar: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date to HH:mm */
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Format a Date to a readable day label */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(d, today)) return "Hoy";
  if (isSameDay(d, yesterday)) return "Ayer";

  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Get the date-only key (YYYY-MM-DD) for grouping */
function dateKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AsesorMensajesPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;

  // State
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [clienteName, setClienteName] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstLoad = useRef(true);
  const shouldAutoScroll = useRef(true);

  // -------------------------------------------------------------------------
  // Auto-scroll
  // -------------------------------------------------------------------------

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      // Small delay to let DOM render
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      });
    }
  }, []);

  // Track if user has scrolled up (disable auto-scroll)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 100;
  }, []);

  // -------------------------------------------------------------------------
  // Fetch messages
  // -------------------------------------------------------------------------

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const res = await authenticatedFetch(
          `/asesor/clientes/${empresaId}/mensajes?page=1&limit=50`
        );
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Error al cargar los mensajes");
        }

        // API returns newest first; we need chronological order (oldest first)
        const reversed: Mensaje[] = [...(json.data || [])].reverse();
        setMensajes(reversed);
        setPagination(json.pagination || null);

        // Auto-mark unread client messages as read
        const unreadFromClient = reversed.filter(
          (m) => m.autor_tipo === "admin" && !m.leido
        );
        if (unreadFromClient.length > 0) {
          markMessagesAsRead(unreadFromClient.map((m) => m.id));
        }

        // Auto-scroll on first load or if user is at bottom
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          // Use instant scroll on first load
          setTimeout(() => scrollToBottom("instant"), 50);
        } else if (shouldAutoScroll.current) {
          scrollToBottom("smooth");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error de conexion";
        if (!silent) setError(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [empresaId, scrollToBottom]
  );

  // -------------------------------------------------------------------------
  // Fetch client name (from resumen endpoint)
  // -------------------------------------------------------------------------

  const fetchClienteName = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/resumen`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data?.nombre) {
        setClienteName(json.data.nombre);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [empresaId]);

  // -------------------------------------------------------------------------
  // Fetch unread count
  // -------------------------------------------------------------------------

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/mensajes/no-leidos`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setUnreadCount(json.data?.total ?? 0);
      }
    } catch {
      // Non-critical
    }
  }, [empresaId]);

  // -------------------------------------------------------------------------
  // Mark messages as read
  // -------------------------------------------------------------------------

  const markMessagesAsRead = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        try {
          await authenticatedFetch(
            `/asesor/clientes/${empresaId}/mensajes/${id}/leido`,
            { method: "PUT" }
          );
        } catch {
          // Ignore individual failures
        }
      }
      // Refresh unread count after marking
      fetchUnreadCount();
    },
    [empresaId, fetchUnreadCount]
  );

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/mensajes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenido: trimmed, tipo: "mensaje" }),
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al enviar el mensaje");
      }

      setInputValue("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Immediately refresh messages
      shouldAutoScroll.current = true;
      await fetchMessages(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al enviar el mensaje";
      alert(message);
    } finally {
      setSending(false);
      // Re-focus input
      textareaRef.current?.focus();
    }
  }, [inputValue, sending, empresaId, fetchMessages]);

  // -------------------------------------------------------------------------
  // Keyboard handling for textarea
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // Auto-resize textarea
  const handleTextareaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    },
    []
  );

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Initial load
  useEffect(() => {
    if (!empresaId) return;
    fetchMessages();
    fetchClienteName();
    fetchUnreadCount();
  }, [empresaId, fetchMessages, fetchClienteName, fetchUnreadCount]);

  // Polling every 10 seconds
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchMessages(true);
      fetchUnreadCount();
    }, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchMessages, fetchUnreadCount]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  /** Returns the icon and border style for a message type */
  function getMessageTypeStyle(tipo: Mensaje["tipo"]) {
    switch (tipo) {
      case "recomendacion":
        return {
          icon: <Lightbulb size={14} className="text-yellow-500 shrink-0" />,
          borderClass: "border-l-2 border-l-yellow-400",
        };
      case "alerta":
        return {
          icon: <AlertTriangle size={14} className="text-red-500 shrink-0" />,
          borderClass: "border-l-2 border-l-red-400",
        };
      case "solicitud_doc":
        return {
          icon: <Paperclip size={14} className="text-blue-500 shrink-0" />,
          borderClass: "border-l-2 border-l-blue-400",
        };
      case "sistema":
        return {
          icon: <Bot size={14} className="text-muted-foreground shrink-0" />,
          borderClass: "",
        };
      default:
        return { icon: null, borderClass: "" };
    }
  }

  /** Group messages by date for date separators */
  function groupByDate(msgs: Mensaje[]): { date: string; messages: Mensaje[] }[] {
    const groups: { date: string; messages: Mensaje[] }[] = [];
    let currentKey = "";

    for (const msg of msgs) {
      const key = dateKey(msg.created_at);
      if (key !== currentKey) {
        currentKey = key;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }

  // -------------------------------------------------------------------------
  // Render: Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // -------------------------------------------------------------------------
  // Render: Error state
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => fetchMessages()}>
          Reintentar
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(`/asesor/clientes/${empresaId}`)}
        >
          Volver al cliente
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Main chat UI
  // -------------------------------------------------------------------------

  const dateGroups = groupByDate(mensajes);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] -m-4 md:-m-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(`/asesor/clientes/${empresaId}`)}
          title="Volver al cliente"
        >
          <ArrowLeft size={18} />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {clienteName ? clienteName.charAt(0).toUpperCase() : "C"}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {clienteName || "Cliente"}
            </h1>
            <p className="text-[11px] text-muted-foreground">Chat con cliente</p>
          </div>
        </div>

        {/* Unread badge + refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Badge variant="default" className="text-[10px] px-2 py-0.5">
              {unreadCount} no leido{unreadCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fetchMessages(true)}
            title="Actualizar mensajes"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* ── Messages area ──────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-muted/30"
      >
        {mensajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare size={28} className="text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                No hay mensajes todavia
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Envia el primer mensaje para iniciar la conversacion
              </p>
            </div>
          </div>
        ) : (
          dateGroups.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-muted rounded-full text-[11px] font-medium text-muted-foreground shadow-sm">
                  {formatDateLabel(group.date)}
                </span>
              </div>

              {/* Messages in this date group */}
              {group.messages.map((msg) => {
                const isMe = msg.autor_tipo === "asesor";
                const isSistema = msg.tipo === "sistema";
                const typeStyle = getMessageTypeStyle(msg.tipo);

                // System messages: centered, distinct style
                if (isSistema) {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center my-2"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/80 rounded-lg max-w-[85%]">
                        {typeStyle.icon}
                        <p className="text-xs italic text-muted-foreground">
                          {msg.contenido}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60 ml-2 shrink-0">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Regular messages
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm
                        ${typeStyle.borderClass}
                        ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border rounded-bl-md"
                        }
                      `}
                    >
                      {/* Author name + type icon */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {typeStyle.icon}
                        <span
                          className={`text-[11px] font-semibold ${
                            isMe
                              ? "text-primary-foreground/80"
                              : "text-foreground/70"
                          }`}
                        >
                          {isMe ? "Tu" : msg.autor_nombre}
                        </span>
                      </div>

                      {/* Message content */}
                      <p
                        className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${
                          isMe ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {msg.contenido}
                      </p>

                      {/* Timestamp + read receipts */}
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMe ? "justify-end" : "justify-end"
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            isMe
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </span>
                        {isMe && (
                          <CheckCheck
                            size={14}
                            className={
                              msg.leido
                                ? "text-blue-300"
                                : isMe
                                  ? "text-primary-foreground/40"
                                  : "text-muted-foreground/40"
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-input/30"
            style={{ maxHeight: "120px", minHeight: "40px" }}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!inputValue.trim() || sending}
            title="Enviar mensaje"
            className="shrink-0 rounded-xl h-10 w-10"
          >
            {sending ? (
              <LoadingSpinner size="sm" showText={false} />
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Enter para enviar, Shift+Enter para nueva linea
        </p>
      </div>
    </div>
  );
}
