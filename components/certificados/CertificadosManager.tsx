"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldX, ShieldOff,
  Plus, Pencil, Trash2, Clock, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────
type Certificado = {
  id: string;
  empresa_id: string;
  nombre: string;
  tipo: string;
  titular_nombre: string;
  titular_nif: string;
  emisor: string | null;
  numero_serie: string | null;
  fecha_emision: string | null;
  fecha_caducidad: string;
  archivo_nombre: string | null;
  password_hint: string | null;
  instalado_en: string[] | null;
  estado: string;
  estado_calculado: string;
  dias_hasta_caducidad: number;
  notas: string | null;
  created_at: string;
};

type LogEntry = {
  id: string;
  accion: string;
  detalle: string | null;
  modelo_aeat: string | null;
  usuario_nombre: string | null;
  created_at: string;
};

type FormData = {
  nombre: string;
  tipo: string;
  titular_nombre: string;
  titular_nif: string;
  emisor: string;
  numero_serie: string;
  fecha_emision: string;
  fecha_caducidad: string;
  archivo_nombre: string;
  password_hint: string;
  instalado_en: string[];
  notas: string;
};

const EMPTY_FORM: FormData = {
  nombre: "", tipo: "persona_fisica", titular_nombre: "", titular_nif: "",
  emisor: "", numero_serie: "", fecha_emision: "", fecha_caducidad: "",
  archivo_nombre: "", password_hint: "", instalado_en: [], notas: "",
};

const INSTALACION_OPTIONS = [
  { value: "aeat_sede", label: "Sede Electrónica AEAT" },
  { value: "seguridad_social", label: "Seguridad Social" },
  { value: "local", label: "Equipo local" },
  { value: "navegador", label: "Navegador" },
  { value: "otro", label: "Otro" },
];

const TIPO_OPTIONS = [
  { value: "persona_fisica", label: "Persona Física" },
  { value: "persona_juridica", label: "Persona Jurídica" },
  { value: "representante", label: "Representante" },
];

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

function diasColor(dias: number): string {
  if (dias < 0) return "text-red-600 font-bold";
  if (dias <= 30) return "text-red-500 font-semibold";
  if (dias <= 60) return "text-amber-500 font-semibold";
  return "text-green-600";
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Component ───────────────────────────────────────────────
export function CertificadosManager({ empresaId }: { empresaId: string }) {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});

  const fetchCertificados = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`/asesor/certificados/clientes/${empresaId}/certificados`);
      if (res.ok) {
        const data = await res.json();
        setCertificados(data);
      }
    } catch (err) {
      console.error("Error fetching certificados", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchCertificados(); }, [fetchCertificados]);

  // ── Log toggle ──
  const toggleLog = async (certId: string) => {
    const isOpen = expandedLogs[certId];
    setExpandedLogs(prev => ({ ...prev, [certId]: !isOpen }));
    if (!isOpen && !logs[certId]) {
      try {
        const res = await authenticatedFetch(
          `/asesor/certificados/clientes/${empresaId}/certificados/${certId}/log`
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(prev => ({ ...prev, [certId]: data }));
        }
      } catch (err) {
        console.error("Error fetching log", err);
      }
    }
  };

  // ── Form handlers ──
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (cert: Certificado) => {
    setEditingId(cert.id);
    setForm({
      nombre: cert.nombre,
      tipo: cert.tipo,
      titular_nombre: cert.titular_nombre,
      titular_nif: cert.titular_nif,
      emisor: cert.emisor || "",
      numero_serie: cert.numero_serie || "",
      fecha_emision: cert.fecha_emision ? cert.fecha_emision.split("T")[0] : "",
      fecha_caducidad: cert.fecha_caducidad.split("T")[0],
      archivo_nombre: cert.archivo_nombre || "",
      password_hint: cert.password_hint || "",
      instalado_en: cert.instalado_en || [],
      notas: cert.notas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId
        ? `/asesor/certificados/clientes/${empresaId}/certificados/${editingId}`
        : `/asesor/certificados/clientes/${empresaId}/certificados`;
      const method = editingId ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          instalado_en: form.instalado_en.length > 0 ? form.instalado_en : null,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        fetchCertificados();
      } else {
        const err = await res.json();
        alert(err.error || "Error guardando certificado");
      }
    } catch (err) {
      console.error("Error saving", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (certId: string) => {
    if (!confirm("Revocar este certificado? (No se eliminará, se marcará como revocado)")) return;
    try {
      const res = await authenticatedFetch(
        `/asesor/certificados/clientes/${empresaId}/certificados/${certId}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchCertificados();
    } catch (err) {
      console.error("Error deleting", err);
    }
  };

  const toggleInstalado = (value: string) => {
    setForm(prev => ({
      ...prev,
      instalado_en: prev.instalado_en.includes(value)
        ? prev.instalado_en.filter(v => v !== value)
        : [...prev.instalado_en, value],
    }));
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
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nuevo Certificado
        </Button>
      </div>

      {certificados.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay certificados registrados para esta empresa.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {certificados.map(cert => (
            <Card key={cert.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{cert.nombre}</span>
                      {estadoBadge(cert.estado_calculado || cert.estado)}
                      <Badge variant="outline" className="text-xs">
                        {TIPO_OPTIONS.find(t => t.value === cert.tipo)?.label || cert.tipo}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p><strong>Titular:</strong> {cert.titular_nombre} ({cert.titular_nif})</p>
                      {cert.emisor && <p><strong>Emisor:</strong> {cert.emisor}</p>}
                      {cert.numero_serie && <p><strong>N/S:</strong> {cert.numero_serie}</p>}
                      <p>
                        <strong>Caducidad:</strong> {formatDate(cert.fecha_caducidad)}
                        {" "}<span className={diasColor(cert.dias_hasta_caducidad)}>
                          ({cert.dias_hasta_caducidad > 0
                            ? `${cert.dias_hasta_caducidad} dias`
                            : `Caducado hace ${Math.abs(cert.dias_hasta_caducidad)} dias`})
                        </span>
                      </p>
                      {cert.instalado_en && cert.instalado_en.length > 0 && (
                        <p>
                          <strong>Instalado en:</strong>{" "}
                          {cert.instalado_en.map(v =>
                            INSTALACION_OPTIONS.find(o => o.value === v)?.label || v
                          ).join(", ")}
                        </p>
                      )}
                      {cert.password_hint && (
                        <p><strong>Pista password:</strong> {cert.password_hint}</p>
                      )}
                      {cert.notas && <p className="italic">{cert.notas}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cert)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id)} title="Revocar">
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
                            {log.modelo_aeat && <span className="ml-1 text-muted-foreground">(Modelo {log.modelo_aeat})</span>}
                            {log.detalle && <span className="ml-1">- {log.detalle}</span>}
                            <span className="ml-2 text-muted-foreground">
                              {formatDate(log.created_at)}
                              {log.usuario_nombre && ` por ${log.usuario_nombre}`}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Certificado" : "Nuevo Certificado"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifica los datos del certificado digital."
                : "Registra un nuevo certificado digital (.p12/.pfx) del cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <Label htmlFor="cert-nombre">Nombre / Alias *</Label>
              <Input id="cert-nombre" value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Certificado FNMT Juan" />
            </div>

            {/* Tipo */}
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titular */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cert-titular">Titular *</Label>
                <Input id="cert-titular" value={form.titular_nombre}
                  onChange={e => setForm(p => ({ ...p, titular_nombre: e.target.value }))}
                  placeholder="Nombre completo" />
              </div>
              <div>
                <Label htmlFor="cert-nif">NIF *</Label>
                <Input id="cert-nif" value={form.titular_nif}
                  onChange={e => setForm(p => ({ ...p, titular_nif: e.target.value }))}
                  placeholder="12345678A" />
              </div>
            </div>

            {/* Emisor y N/S */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cert-emisor">Emisor</Label>
                <Input id="cert-emisor" value={form.emisor}
                  onChange={e => setForm(p => ({ ...p, emisor: e.target.value }))}
                  placeholder="FNMT, ACCV..." />
              </div>
              <div>
                <Label htmlFor="cert-ns">N. Serie</Label>
                <Input id="cert-ns" value={form.numero_serie}
                  onChange={e => setForm(p => ({ ...p, numero_serie: e.target.value }))} />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cert-fe">Fecha Emisión</Label>
                <Input id="cert-fe" type="date" value={form.fecha_emision}
                  onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="cert-fc">Fecha Caducidad *</Label>
                <Input id="cert-fc" type="date" value={form.fecha_caducidad}
                  onChange={e => setForm(p => ({ ...p, fecha_caducidad: e.target.value }))} />
              </div>
            </div>

            {/* Archivo y password hint */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cert-file">Nombre archivo original</Label>
                <Input id="cert-file" value={form.archivo_nombre}
                  onChange={e => setForm(p => ({ ...p, archivo_nombre: e.target.value }))}
                  placeholder="certificado.p12" />
              </div>
              <div>
                <Label htmlFor="cert-hint">Pista password</Label>
                <Input id="cert-hint" value={form.password_hint}
                  onChange={e => setForm(p => ({ ...p, password_hint: e.target.value }))}
                  placeholder="Solo pista, nunca el password real" />
              </div>
            </div>

            {/* Instalado en */}
            <div>
              <Label>Instalado en</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {INSTALACION_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input type="checkbox"
                      checked={form.instalado_en.includes(opt.value)}
                      onChange={() => toggleInstalado(opt.value)}
                      className="rounded border-gray-300" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="cert-notas">Notas</Label>
              <textarea id="cert-notas" value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Observaciones internas..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nombre || !form.titular_nombre || !form.titular_nif || !form.fecha_caducidad}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear certificado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
