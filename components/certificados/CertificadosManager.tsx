"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, ShieldOff,
  Plus, Trash2, Clock, FileText, ChevronDown, ChevronUp,
  Upload, CheckCircle2, AlertTriangle, Loader2, Download, RefreshCw, ExternalLink,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───────────────────────────────────────────────────
type Certificado = {
  id: string;
  empresa_id: string;
  nombre_alias: string;
  tipo: string;
  titular_nombre: string;
  titular_nif: string;
  emisor: string | null;
  numero_serie: string | null;
  fecha_emision: string | null;
  fecha_caducidad: string | null;
  archivo_nombre: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  // Legacy fields from metadata-only system
  nombre?: string;
  password_hint?: string;
  instalado_en?: string[] | null;
  estado_calculado?: string;
  dias_hasta_caducidad?: number;
};

type LogEntry = {
  id: string;
  accion: string;
  detalle: string | null;
  modelo_aeat?: string | null;
  modelo?: string | null;
  resultado?: string | null;
  usuario_nombre?: string | null;
  usuario_id?: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────
function estadoBadge(estado: string) {
  switch (estado) {
    case "activo":
      return <Badge className="bg-green-100 text-green-800 border-green-300"><ShieldCheck className="w-3 h-3 mr-1" />Activo</Badge>;
    case "proximo_caducar":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300"><ShieldAlert className="w-3 h-3 mr-1" />Prox. caducar</Badge>;
    case "caducado":
      return <Badge className="bg-red-100 text-red-800 border-red-300"><ShieldX className="w-3 h-3 mr-1" />Caducado</Badge>;
    case "revocado":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-300"><ShieldOff className="w-3 h-3 mr-1" />Revocado</Badge>;
    default:
      return <Badge variant="outline">{estado}</Badge>;
  }
}

function diasHastaCaducidad(fecha: string | null): { dias: number; text: string; color: string } {
  if (!fecha) return { dias: 0, text: "Sin fecha", color: "text-muted-foreground" };
  const diff = Math.floor((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { dias: diff, text: `Caducado hace ${Math.abs(diff)} dias`, color: "text-red-600 font-bold" };
  if (diff <= 30) return { dias: diff, text: `${diff} dias`, color: "text-red-500 font-semibold" };
  if (diff <= 60) return { dias: diff, text: `${diff} dias`, color: "text-amber-500 font-semibold" };
  return { dias: diff, text: `${diff} dias`, color: "text-green-600" };
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getEstadoCalculado(cert: Certificado): string {
  if (cert.estado_calculado) return cert.estado_calculado;
  if (cert.estado === "revocado") return "revocado";
  if (!cert.fecha_caducidad) return cert.estado || "activo";
  const dias = Math.floor((new Date(cert.fecha_caducidad).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "caducado";
  if (dias <= 30) return "proximo_caducar";
  return "activo";
}

const FNMT_URLS = {
  renovar: "https://www.sede.fnmt.gob.es/certificados/persona-fisica/renovar",
  solicitar: "https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener",
};

// ─── Component ───────────────────────────────────────────────
export function CertificadosManager({ empresaId }: { empresaId: string }) {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [nombreAlias, setNombreAlias] = useState("");
  const [notas, setNotas] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine API base path based on user context
  // Asesor mode uses /asesor/clientes/:empresa_id/certificados (real upload routes)
  // Admin mode uses /api/admin/certificados
  const isAsesorMode = typeof window !== "undefined" && !!sessionStorage.getItem("asesor_empresa_id");
  const apiBase = isAsesorMode
    ? `/asesor/clientes/${empresaId}/certificados`
    : `/api/admin/certificados`;

  const fetchCertificados = useCallback(async () => {
    try {
      const res = await authenticatedFetch(apiBase);
      if (res.ok) {
        const json = await res.json();
        // Handle both { success, data } and raw array responses
        const data = json.data || json;
        setCertificados(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching certificados", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchCertificados(); }, [fetchCertificados]);

  // ── Upload handler ──
  const handleUpload = async () => {
    if (!file || !password) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      if (nombreAlias) formData.append("nombre_alias", nombreAlias);
      if (notas) formData.append("notas", notas);

      // authenticatedFetch adds Authorization header automatically
      // Do NOT set Content-Type — browser sets it with boundary for multipart
      const res = await authenticatedFetch(apiBase, {
        method: "POST",
        body: formData,
        // Explicitly omit Content-Type so browser sets multipart boundary
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setUploadOpen(false);
        resetUploadForm();
        fetchCertificados();
      } else {
        setUploadError(json.error || "Error subiendo certificado");
      }
    } catch (err) {
      console.error("Error uploading certificate", err);
      setUploadError("Error de conexion al subir el certificado");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setFile(null);
    setPassword("");
    setNombreAlias("");
    setNotas("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Verify handler ──
  const handleVerify = async (certId: string) => {
    setVerifying(certId);
    try {
      const res = await authenticatedFetch(`${apiBase}/${certId}/verificar`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchCertificados();
      } else {
        alert(json.error || "Error verificando certificado");
      }
    } catch (err) {
      console.error("Error verifying", err);
    } finally {
      setVerifying(null);
    }
  };

  // ── Delete handler ──
  const handleDelete = async (certId: string) => {
    if (!confirm("Eliminar este certificado? Se marcara como revocado y no se podra usar.")) return;
    try {
      const res = await authenticatedFetch(`${apiBase}/${certId}`, { method: "DELETE" });
      if (res.ok) fetchCertificados();
    } catch (err) {
      console.error("Error deleting", err);
    }
  };

  // ── Log toggle ──
  const toggleLog = async (certId: string) => {
    const isOpen = expandedLogs[certId];
    setExpandedLogs(prev => ({ ...prev, [certId]: !isOpen }));
    if (!isOpen && !logs[certId]) {
      try {
        const res = await authenticatedFetch(`${apiBase}/${certId}/log`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setLogs(prev => ({ ...prev, [certId]: Array.isArray(data) ? data : [] }));
        }
      } catch (err) {
        console.error("Error fetching log", err);
      }
    }
  };

  // ── File input handler ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const name = f.name.toLowerCase();
      if (!name.endsWith(".p12") && !name.endsWith(".pfx")) {
        setUploadError("Solo se aceptan archivos .p12 o .pfx");
        setFile(null);
        return;
      }
      setUploadError(null);
      setFile(f);
      // Auto-fill alias from filename
      if (!nombreAlias) {
        setNombreAlias(f.name.replace(/\.(p12|pfx)$/i, ""));
      }
    }
  };

  // ── Render ──
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Certificados Digitales
        </h3>
        <Button onClick={() => { resetUploadForm(); setUploadOpen(true); }} size="sm">
          <Upload className="w-4 h-4 mr-1" /> Subir Certificado
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Certificados electronicos para presentacion de modelos
        </p>
        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          Sube el archivo .p12/.pfx del cliente con su contrasena. Se almacena encriptado (AES-256-GCM).
          {isAsesorMode ? " Los certificados se comparten bidireccionalmente: si el cliente los sube en su panel, aparecen aqui automaticamente y viceversa." : ""}
        </p>
      </div>

      {certificados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldOff className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No hay certificados digitales registrados.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sube un archivo .p12 o .pfx para poder presentar modelos AEAT, Seguridad Social, etc.
            </p>
            <Button onClick={() => { resetUploadForm(); setUploadOpen(true); }} className="mt-4" size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-1" /> Subir primer certificado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {certificados.map(cert => {
            const estado = getEstadoCalculado(cert);
            const caducidad = diasHastaCaducidad(cert.fecha_caducidad);
            const certName = cert.nombre_alias || cert.nombre || cert.archivo_nombre || "Certificado";

            return (
              <Card key={cert.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{certName}</span>
                        {estadoBadge(estado)}
                        {cert.archivo_nombre && (
                          <Badge variant="outline" className="text-xs font-mono">
                            <Download className="w-3 h-3 mr-1" />
                            {cert.archivo_nombre}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                        {cert.titular_nombre && (
                          <p><strong>Titular:</strong> {cert.titular_nombre} {cert.titular_nif ? `(${cert.titular_nif})` : ""}</p>
                        )}
                        {cert.emisor && <p><strong>Emisor:</strong> {cert.emisor}</p>}
                        {cert.numero_serie && <p><strong>N/S:</strong> <span className="font-mono text-xs">{cert.numero_serie}</span></p>}
                        {cert.fecha_caducidad && (
                          <p>
                            <strong>Caducidad:</strong> {formatDate(cert.fecha_caducidad)}
                            {" "}<span className={caducidad.color}>({caducidad.text})</span>
                          </p>
                        )}
                        {cert.fecha_emision && (
                          <p><strong>Emision:</strong> {formatDate(cert.fecha_emision)}</p>
                        )}
                        {cert.notas && <p className="italic mt-1">{cert.notas}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Renovar en FNMT - visible cuando caduca en <= 60 dias o ya caducado */}
                      {caducidad.dias <= 60 && (
                        <a
                          href={caducidad.dias < -365 ? FNMT_URLS.solicitar : FNMT_URLS.renovar}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            title={caducidad.dias < -365 ? "Solicitar nuevo certificado en FNMT" : "Renovar certificado en FNMT"}
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="ml-1 hidden sm:inline">
                              {caducidad.dias < -365 ? "Solicitar" : "Renovar"}
                            </span>
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(cert.id)}
                        disabled={verifying === cert.id}
                        title="Verificar certificado"
                      >
                        {verifying === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">Verificar</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id)} title="Revocar/Eliminar">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Log accordion */}
                  <button
                    onClick={() => toggleLog(cert.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Historial de uso
                    {expandedLogs[cert.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {expandedLogs[cert.id] && (
                    <div className="mt-2 pl-4 border-l-2 border-muted space-y-1">
                      {!logs[cert.id] ? (
                        <p className="text-xs text-muted-foreground">Cargando...</p>
                      ) : logs[cert.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin registros de uso</p>
                      ) : (
                        logs[cert.id].map(log => (
                          <div key={log.id} className="text-xs flex items-start gap-2">
                            <Clock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{log.accion}</span>
                              {(log.modelo_aeat || log.modelo) && <span className="ml-1 text-muted-foreground">(Modelo {log.modelo_aeat || log.modelo})</span>}
                              {log.resultado && <span className={`ml-1 ${log.resultado === 'ok' ? 'text-green-600' : 'text-red-500'}`}>[{log.resultado}]</span>}
                              {log.detalle && <span className="ml-1">- {log.detalle}</span>}
                              <span className="ml-2 text-muted-foreground">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetUploadForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir Certificado Digital
            </DialogTitle>
            <DialogDescription>
              Sube un archivo .p12 o .pfx con su contrasena. Los datos del titular, emisor y fechas se extraen automaticamente del certificado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div>
              <Label htmlFor="cert-file">Archivo .p12 / .pfx *</Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  id="cert-file"
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
                />
              </div>
              {file && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="cert-password">Contrasena del certificado *</Label>
              <Input
                id="cert-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contrasena del archivo .p12/.pfx"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se almacena encriptada con AES-256-GCM. Necesaria para firmar envios.
              </p>
            </div>

            {/* Alias */}
            <div>
              <Label htmlFor="cert-alias">Nombre / Alias</Label>
              <Input
                id="cert-alias"
                value={nombreAlias}
                onChange={e => setNombreAlias(e.target.value)}
                placeholder="Ej: Certificado FNMT Juan Garcia"
              />
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="cert-notas">Notas</Label>
              <textarea
                id="cert-notas"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Observaciones internas..."
              />
            </div>

            {/* Error */}
            {uploadError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Security note */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <p className="font-medium">Seguridad</p>
              <p className="mt-0.5">El archivo se procesa en memoria (no se guarda en disco). Los datos binarios y la contrasena se almacenan encriptados en la base de datos.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !password}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  Subir certificado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
