"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Plug, ShieldCheck, AlertCircle, CheckCircle, XCircle, Trash2, Loader2,
  ChevronLeft, ChevronRight, ExternalLink, KeyRound, FileText
} from "lucide-react";

type Servicio = "dehu" | "ss_red" | "siltra" | "aeat_apoderamiento" | "otros";

interface Credencial {
  id: string;
  servicio: Servicio;
  tipo_acceso: string;
  identificador: string | null;
  activo: boolean;
  validado_at: string | null;
  validado_resultado: any;
  notas: string | null;
  tiene_secreto: boolean;
}

interface CatalogoItem {
  servicio: Servicio;
  configurado: boolean;
}

interface CertificadoCliente {
  disponible: boolean;
  info?: any;
  subido_el?: string | null;
}

const SERVICIOS_INFO: Record<Servicio, {
  nombre: string;
  descripcion: string;
  icono: React.ElementType;
  color: string;
  ayuda_url?: string;
  tipos_acceso: string[];
}> = {
  dehu: {
    nombre: "DEHú — Notificaciones electrónicas",
    descripcion: "Recibe notificaciones de AEAT (requerimientos, devoluciones, sanciones) sin entrar manualmente a la sede.",
    icono: AlertCircle,
    color: "amber",
    ayuda_url: "https://dehu.redsara.es/ayuda",
    tipos_acceso: ["certificado_existente", "certificado", "apoderamiento"],
  },
  ss_red: {
    nombre: "SS RED Sistema (Seguridad Social)",
    descripcion: "Acceso a Sistema RED para alta/baja de empleados, consultas de afiliación.",
    icono: ShieldCheck,
    color: "blue",
    ayuda_url: "https://www.seg-social.es/wps/portal/wss/internet/Trabajadores",
    tipos_acceso: ["certificado_existente", "certificado", "usuario_password"],
  },
  siltra: {
    nombre: "SILTRA (Cotizaciones SS)",
    descripcion: "Generación y envío de ficheros de cotización mensual (CRA) a la Tesorería.",
    icono: FileText,
    color: "violet",
    ayuda_url: "https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil/44539/45195",
    tipos_acceso: ["certificado_existente", "certificado", "usuario_password"],
  },
  aeat_apoderamiento: {
    nombre: "AEAT — Apoderamiento",
    descripcion: "Apoderamiento del cliente a la asesoría para presentar modelos en su nombre.",
    icono: KeyRound,
    color: "emerald",
    ayuda_url: "https://sede.agenciatributaria.gob.es/Sede/colaboradores-sociales-apoderados.html",
    tipos_acceso: ["apoderamiento", "certificado_existente", "certificado"],
  },
  otros: {
    nombre: "Otros servicios",
    descripcion: "Otras integraciones puntuales (banca electrónica, plataformas externas…).",
    icono: Plug,
    color: "slate",
    tipos_acceso: ["usuario_password", "token_api", "certificado"],
  },
};

// Pasos del wizard según servicio
const WIZARDS: Record<Servicio, Array<{ titulo: string; contenido: React.ReactNode }>> = {
  dehu: [
    {
      titulo: "1. Activar buzón DEHú",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>El cliente debe acceder a <a href="https://dehu.redsara.es" target="_blank" className="text-blue-600 underline">dehu.redsara.es</a> y suscribirse al buzón con su certificado digital.</p>
          <p className="text-muted-foreground">Sin esto, AEAT no manda notificaciones electrónicas.</p>
        </div>
      ),
    },
    {
      titulo: "2. Apoderar a la asesoría (opcional)",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Si quieres acceder en nombre del cliente, debe apoderarte en la sede de AEAT con código <code className="bg-muted px-1 rounded">RECNOTOM</code>.</p>
          <p className="text-muted-foreground">Alternativa: usar tu propio certificado de colaborador social.</p>
        </div>
      ),
    },
    {
      titulo: "3. Subir certificado o referencia",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Sube el certificado digital (.p12) que vas a usar y la contraseña.</p>
          <p>Si usas apoderamiento sin certificado propio, deja el certificado vacío y rellena el código de apoderamiento.</p>
        </div>
      ),
    },
  ],
  ss_red: [
    {
      titulo: "1. Autorización del cliente",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>El cliente firma autorización RED01 ante TGSS para que la asesoría gestione su Seguridad Social.</p>
        </div>
      ),
    },
    {
      titulo: "2. Solicitar usuario SILCON",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>La asesoría solicita el certificado SILCON o usa usuario/contraseña del Sistema RED.</p>
          <p className="text-muted-foreground">Sin estos datos no se puede tramitar afiliación ni cotizaciones.</p>
        </div>
      ),
    },
    {
      titulo: "3. Configurar acceso",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Sube el certificado SILCON o introduce usuario/contraseña.</p>
          <p>Estas credenciales se cifran y solo CONTENDO las usa para enviar ficheros, nunca se muestran.</p>
        </div>
      ),
    },
  ],
  siltra: [
    {
      titulo: "1. Cuenta de cotización",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Necesitas el código de cuenta de cotización (CCC) del cliente.</p>
        </div>
      ),
    },
    {
      titulo: "2. Datos para SILTRA",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>SILTRA necesita las mismas credenciales que el Sistema RED (certificado SILCON o usuario/password).</p>
        </div>
      ),
    },
  ],
  aeat_apoderamiento: [
    {
      titulo: "1. Solicitar apoderamiento",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>El cliente entra en sede AEAT → Apoderamientos → otorgar a tu NIF.</p>
        </div>
      ),
    },
    {
      titulo: "2. Configurar referencia",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Introduce el NIF del cliente y opcionalmente el certificado de la asesoría.</p>
        </div>
      ),
    },
  ],
  otros: [
    {
      titulo: "Configuración manual",
      contenido: (
        <div className="space-y-2 text-sm">
          <p>Introduce los datos según las instrucciones del servicio externo.</p>
        </div>
      ),
    },
  ],
};

export default function AsesorClienteIntegracionesPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Credencial[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [certCliente, setCertCliente] = useState<CertificadoCliente>({ disponible: false });

  const [editServicio, setEditServicio] = useState<Servicio | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState<{
    tipo_acceso: string;
    identificador: string;
    password: string;
    certificado_b64: string;
    apoderamiento_codigo: string;
    notas: string;
    keep_secrets: boolean;
  }>({
    tipo_acceso: "certificado",
    identificador: "",
    password: "",
    certificado_b64: "",
    apoderamiento_codigo: "",
    notas: "",
    keep_secrets: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Servicio | null>(null);

  const baseUrl = `/asesor/clientes/${empresaId}/credenciales`;

  useEffect(() => {
    load();
  }, [empresaId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(baseUrl);
      setItems(res.data?.items || []);
      setCatalogo(res.data?.catalogo || []);
      setCertCliente(res.data?.certificado_cliente || { disponible: false });
    } catch (err: any) {
      showError(err.response?.data?.error || "Error cargando credenciales");
    } finally {
      setLoading(false);
    }
  }

  function abrirEditor(servicio: Servicio) {
    setEditServicio(servicio);
    setWizardStep(0);
    const existing = items.find((i) => i.servicio === servicio);
    setForm({
      tipo_acceso: existing?.tipo_acceso || SERVICIOS_INFO[servicio].tipos_acceso[0],
      identificador: existing?.identificador || "",
      password: "",
      certificado_b64: "",
      apoderamiento_codigo: "",
      notas: existing?.notas || "",
      keep_secrets: !!existing?.tiene_secreto,
    });
  }

  function cerrarEditor() {
    setEditServicio(null);
    setWizardStep(0);
  }

  async function handleSave() {
    if (!editServicio) return;
    setSaving(true);
    try {
      const datos_secretos: any = {};
      if (form.password) datos_secretos.password = form.password;
      if (form.certificado_b64) datos_secretos.certificado_b64 = form.certificado_b64;
      if (form.apoderamiento_codigo) datos_secretos.apoderamiento_codigo = form.apoderamiento_codigo;

      const body: any = {
        tipo_acceso: form.tipo_acceso,
        identificador: form.identificador || null,
        notas: form.notas || null,
      };
      // Solo enviar datos_secretos si el usuario ha rellenado algo nuevo
      if (Object.keys(datos_secretos).length > 0) {
        body.datos_secretos = datos_secretos;
      }

      await api.put(`${baseUrl}/${editServicio}`, body);
      showSuccess("Credenciales guardadas");
      cerrarEditor();
      await load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error guardando credenciales");
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(servicio: Servicio) {
    if (!confirm(`¿Eliminar las credenciales de ${SERVICIOS_INFO[servicio].nombre}?`)) return;
    try {
      await api.delete(`${baseUrl}/${servicio}`);
      showSuccess("Credenciales eliminadas");
      await load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error eliminando credenciales");
    }
  }

  async function handleTest(servicio: Servicio) {
    setTesting(servicio);
    try {
      const res = await api.post(`${baseUrl}/${servicio}/test`);
      if (res.data?.ok) {
        showSuccess("Conexión correcta");
      } else {
        showError(res.data?.mensaje || "La prueba no pasó");
      }
      await load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error testando conexión");
    } finally {
      setTesting(null);
    }
  }

  async function handleArchivoCertificado(file: File) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    setForm((f) => ({ ...f, certificado_b64: b64 }));
  }

  if (loading) return <LoadingSpinner fullPage />;

  const wizardSteps = editServicio ? WIZARDS[editServicio] : [];
  const editing = editServicio ? items.find((i) => i.servicio === editServicio) : null;
  const info = editServicio ? SERVICIOS_INFO[editServicio] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Plug className="w-6 h-6" />
          Integraciones externas
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura las credenciales del cliente para AEAT, Seguridad Social, DEHú… Se almacenan cifradas y solo se descifran cuando CONTENDO las usa.
        </p>
      </div>

      {certCliente.disponible && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-900">
                El cliente tiene certificado digital subido
              </p>
              <p className="text-xs text-emerald-700">
                Puedes <strong>reutilizarlo</strong> para DEHú, SS RED y SILTRA sin volver a subirlo.
                {certCliente.subido_el && ` Subido el ${new Date(certCliente.subido_el).toLocaleDateString("es-ES")}.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.keys(SERVICIOS_INFO) as Servicio[]).map((servicio) => {
          const info = SERVICIOS_INFO[servicio];
          const cred = items.find((i) => i.servicio === servicio);
          const Icon = info.icono;
          const colorMap: Record<string, string> = {
            amber: "bg-amber-50 text-amber-700 border-amber-200",
            blue: "bg-blue-50 text-blue-700 border-blue-200",
            violet: "bg-violet-50 text-violet-700 border-violet-200",
            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
            slate: "bg-slate-50 text-slate-700 border-slate-200",
          };
          return (
            <Card key={servicio}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg ${colorMap[info.color]} flex items-center justify-center border`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">{info.nombre}</span>
                  {cred ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Configurado</Badge>
                  ) : (
                    <Badge variant="outline">Sin configurar</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{info.descripcion}</p>
                {cred?.identificador && (
                  <p className="text-xs mb-1"><span className="text-muted-foreground">Ref:</span> {cred.identificador}</p>
                )}
                {cred?.validado_at && (
                  <p className="text-xs mb-1 flex items-center gap-1">
                    {cred.validado_resultado?.ok ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-amber-600" />
                    )}
                    <span className="text-muted-foreground">
                      Última prueba: {new Date(cred.validado_at).toLocaleString("es-ES")}
                    </span>
                  </p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => abrirEditor(servicio)}>
                    {cred ? "Editar" : "Configurar"}
                  </Button>
                  {cred && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleTest(servicio)} disabled={testing === servicio}>
                        {testing === servicio ? <Loader2 className="w-3 h-3 animate-spin" /> : "Probar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEliminar(servicio)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {info.ayuda_url && (
                    <a href={info.ayuda_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 self-center ml-auto">
                      Ayuda <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal wizard */}
      <Dialog open={!!editServicio} onOpenChange={(o) => !o && cerrarEditor()}>
        <DialogContent className="max-w-lg">
          {info && (
            <>
              <DialogHeader>
                <DialogTitle>{info.nombre}</DialogTitle>
                <DialogDescription>{info.descripcion}</DialogDescription>
              </DialogHeader>

              {/* Pasos del wizard */}
              {wizardStep < wizardSteps.length ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs">
                    {wizardSteps.map((_, i) => (
                      <div key={i} className={`flex-1 h-1 rounded ${i <= wizardStep ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="font-semibold text-sm mb-2">{wizardSteps[wizardStep].titulo}</h3>
                    {wizardSteps[wizardStep].contenido}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => s - 1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                    </Button>
                    <Button onClick={() => setWizardStep((s) => s + 1)}>
                      {wizardStep === wizardSteps.length - 1 ? "Configurar credenciales" : "Siguiente"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tipo de acceso</label>
                    <select
                      value={form.tipo_acceso}
                      onChange={(e) => setForm({ ...form, tipo_acceso: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {info.tipos_acceso
                        .filter((t) => t !== "certificado_existente" || certCliente.disponible)
                        .map((t) => (
                          <option key={t} value={t}>
                            {t === "certificado" ? "Subir certificado nuevo (.p12)" :
                             t === "certificado_existente" ? "🟢 Usar certificado del cliente (recomendado)" :
                             t === "usuario_password" ? "Usuario y contraseña" :
                             t === "apoderamiento" ? "Apoderamiento" :
                             t === "token_api" ? "Token API" : t}
                          </option>
                        ))}
                    </select>
                    {form.tipo_acceso === "certificado_existente" && (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        ✓ CONTENDO usará el certificado ya subido del cliente. No tienes que volver a configurarlo.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {form.tipo_acceso === "usuario_password" ? "Usuario" :
                       form.tipo_acceso === "apoderamiento" ? "NIF apoderado" :
                       "Identificador / referencia"}
                    </label>
                    <Input value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })} />
                  </div>

                  {(form.tipo_acceso === "usuario_password" || form.tipo_acceso === "token_api") && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {form.tipo_acceso === "token_api" ? "Token" : "Contraseña"}
                      </label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={form.keep_secrets ? "(dejar en blanco para mantener la actual)" : ""}
                      />
                    </div>
                  )}

                  {form.tipo_acceso === "certificado" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Certificado digital (.p12)</label>
                      <Input
                        type="file"
                        accept=".p12,.pfx"
                        onChange={(e) => e.target.files?.[0] && handleArchivoCertificado(e.target.files[0])}
                      />
                      <Input
                        type="password"
                        className="mt-2"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Contraseña del certificado"
                      />
                      {form.keep_secrets && !form.certificado_b64 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Hay un certificado guardado. Sube uno nuevo para reemplazarlo o deja vacío para conservarlo.
                        </p>
                      )}
                    </div>
                  )}

                  {form.tipo_acceso === "apoderamiento" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Código de apoderamiento</label>
                      <Input
                        value={form.apoderamiento_codigo}
                        onChange={(e) => setForm({ ...form, apoderamiento_codigo: e.target.value })}
                        placeholder="Ej: RECNOTOM"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Notas</label>
                    <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="opcional" />
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <Button variant="outline" onClick={() => setWizardStep((s) => Math.max(0, s - 1))}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Volver al asistente
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={cerrarEditor} disabled={saving}>Cancelar</Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
