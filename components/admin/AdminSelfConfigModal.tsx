import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import ShareInviteLinkModal from "./ShareInviteLinkModal";
import { User, Clock, Smartphone, Save, X, Send, Building2, ShieldCheck, FileText, Settings, Database, Sparkles, History, Loader2, Globe, Phone, Upload, Trash2, FolderCog, Mail, CheckCircle2, XCircle, Calendar as CalendarIcon, LayoutGrid, Hash, AlertCircle, TrendingUp, GripHorizontal } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { get, set } from 'idb-keyval';
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { ALL_DASHBOARD_WIDGETS } from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";

interface AdminSelfConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
}

export default function AdminSelfConfigModal({
  isOpen,
  onClose,
  adminId,
}: AdminSelfConfigModalProps) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("perfil");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>("");

  // Configuración de Facturación / Empresa
  const [empresaData, setEmpresaData] = useState<any>({
    nif: "", nombre: "", nombre_comercial: "", direccion: "", cp: "", poblacion: "", provincia: "", pais: "España",
    email: "", web: "", telefono: "", registro_mercantil: "", iban: "",
    logo_path: "", certificado_path: "", certificado_upload_date: "", certificado_info: null
  });

  const [facturacionData, setFacturacionData] = useState<any>({
    terminos_legales: "", texto_pie: "", texto_exento: "", texto_rectificativa: "", mensaje_iva: "",
    verifactu_activo: false, verifactu_modo: "TEST",
    numeracion_tipo: "STANDARD", numeracion_formato: "FAC-{YEAR}-", numeracion_locked: false,
    correlativo_inicial: 0,
    facturas_inmutables: true, prohibir_borrado_facturas: true, bloquear_fechas_pasadas: true,
    auditoria_activa: true, nivel_auditoria: "BASICA",
    modo_numeracion: "BASICO", serie: "", siguiente_numero: 1,
    // Migración y OCR
    migracion_last_serie: "",
    migracion_last_emisor_nif: "",
    migracion_last_cliente_nif: "",
    migracion_last_subtotal: 0,
    migracion_last_iva: 0,
    migracion_last_total: 0,
    migracion_last_pdf: "",
    migracion_legal_aceptado: false,
    migracion_fecha_aceptacion: null
  });

  const [ocrConfidence, setOcrConfidence] = useState<any>({
    numeracion: 0, identidad: 0, economicos: 0
  });

  const [generatingAiField, setGeneratingAiField] = useState<string | null>(null);

  // Configuración de Dashboard (Widgets)
  const [dashboardWidgets, setDashboardWidgets] = useState<any[]>([]);
  const [dashboardWidgetsMobile, setDashboardWidgetsMobile] = useState<any[]>([]);
  const [activeWidgetProfile, setActiveWidgetProfile] = useState<"desktop" | "mobile">("desktop");
  const [savingWidgets, setSavingWidgets] = useState(false);

  // Configuración de Sistema (Módulos)
  const [sistemaConfig, setSistemaConfig] = useState<any>({
    modulos: {},
    modulos_mobile: {},
    mobileEnabled: false,
    backup_local_path: ""
  });

  // --- NUEVOS ESTADOS INTEGRADOS ---
  // Backup Local
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);

  // Google Calendar
  const [googleCalendarConfig, setGoogleCalendarConfig] = useState<any>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Email Config
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Estado para invitaciones
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Estados para archivos (Logo/Certificado)
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [certPassword, setCertPassword] = useState("");
  const [pendingCert, setPendingCert] = useState<any>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const migracionInputRef = useRef<HTMLInputElement>(null);

  const dragControls = useDragControls();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, adminId]);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, plantRes, emisorRes, sistemaFactRes, globalConfigRes, calendarRes, emailRes, widgetRes] = await Promise.all([
        api.get("/employees"),
        api.get("/admin/plantillas"),
        api.get("/admin/facturacion/configuracion/emisor"),
        api.get("/admin/facturacion/configuracion/sistema"),
        api.get("/admin/configuracion"),
        api.get("/api/admin/calendar-config"),
        api.get("/admin/email-config"),
        api.get("/admin/configuracion/widgets").catch(() => ({ data: { widgets: [] } }))
      ]);

      const employees = empRes.data || [];
      const me = employees.find((e: any) => String(e.user_id) === String(adminId));

      setAdminData(me);
      setSelectedPlantilla(me?.plantilla_id || "");
      setPlantillas(plantRes.data || []);

      // Datos de Empresa
      setEmpresaData(emisorRes.data.data || {});

      // Configuración Facturación
      setFacturacionData(sistemaFactRes.data.data || {});

      // Configuración Global Sistema
      const { modulos_mobile, ...rest } = globalConfigRes.data;
      setSistemaConfig({
        modulos: rest,
        modulos_mobile: modulos_mobile || {},
        mobileEnabled: !!modulos_mobile,
        backup_local_path: sistemaFactRes.data.data?.backup_local_path || ""
      });

      setGoogleCalendarConfig(calendarRes.data);
      setEmailConfig(emailRes.data);

      const widgets = widgetRes.data?.widgets || [];
      const widgetsMobile = widgetRes.data?.widgets_mobile || [];
      setDashboardWidgets(widgets);
      setDashboardWidgetsMobile(widgetsMobile);

      // Cargar handle de backup de IndexedDB
      get('backup_directory_handle').then(handle => setDirectoryHandle(handle));

    } catch (err) {
      console.error("Error loading admin center config", err);
      toast.error("No se pudieron cargar todos los datos de configuración");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const promises = [];

      // 1. Guardar Jornada (Perfil)
      if (selectedPlantilla !== adminData?.plantilla_id) {
        promises.push(api.post("/admin/plantillas/asignar", {
          empleado_id: adminData.id,
          plantilla_id: selectedPlantilla,
          fecha_inicio: new Date().toISOString().split('T')[0]
        }));
      }

      // 2. Guardar Empresa (Incluyendo nuevos campos)
      promises.push(api.put("/admin/facturacion/configuracion/emisor", empresaData));

      // 3. Guardar Facturación (si el módulo está activo)
      if (sistemaConfig.modulos.facturacion) {
        promises.push(api.put("/admin/facturacion/configuracion/sistema", facturacionData));
      }

      // 4. Guardar Configuración Global Sistema
      promises.push(api.put("/admin/configuracion", {
        modulos: sistemaConfig.modulos,
        modulos_mobile: sistemaConfig.mobileEnabled ? sistemaConfig.modulos_mobile : null
      }));

      // 5. Guardar Widgets Dashboard
      promises.push(api.put("/admin/configuracion/widgets", {
        widgets: dashboardWidgets,
        widgets_mobile: dashboardWidgetsMobile
      }));

      await Promise.all(promises);

      // Refrescar sesión si cambiaron los módulos
      window.dispatchEvent(new Event("session-updated"));

      toast.success("Configuración actualizada correctamente");
      loadData();
    } catch (err) {
      console.error("Error saving global config", err);
      toast.error("Error al guardar algunos cambios");
    } finally {
      setSaving(false);
    }
  };

  // --- HANDLERS: BACKUP LOCAL ---
  const handleConfigureFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast.error("Tu navegador no soporta la selección de carpetas avanzada.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await set('backup_directory_handle', handle);
      setDirectoryHandle(handle);
      toast.success("Carpeta de backups vinculada en este PC.");
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error("Error al vincular carpeta.");
    }
  };

  // --- HANDLERS: GOOGLE CALENDAR ---
  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const res = await api.post("/api/admin/calendar-config/oauth2/start", { provider: "google" });
      const popup = window.open(res.data.authUrl, "Google Calendar OAuth", "width=600,height=700");
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnectingCalendar(false);
          loadData();
          toast.success("Google Calendar conectado");
        }
      }, 500);
    } catch (err) {
      toast.error("Error al conectar Calendario");
      setConnectingCalendar(false);
    }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      await api.post("/api/admin/calendar-sync/bidirectional");
      toast.success("Calendario sincronizado");
    } catch (err) {
      toast.error("Error al sincronizar");
    } finally {
      setSyncingCalendar(false);
    }
  };

  // --- HANDLERS: EMAIL ---
  const handleConnectGmail = async () => {
    setConnectingEmail(true);
    try {
      const res = await api.post('/admin/email-config/oauth2/start', { provider: 'gmail' });
      const popup = window.open(res.data.authUrl, 'Google Email OAuth', 'width=500,height=600');
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnectingEmail(false);
          loadData();
          toast.success("Gmail conectado");
        }
      }, 500);
    } catch (err) {
      toast.error("Error al conectar Gmail");
      setConnectingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      await api.post('/admin/email-config/test');
      toast.success("Email de prueba enviado");
    } catch (err) {
      toast.error("Error al enviar prueba");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleFileUploadTrigger = (type: 'logo' | 'certificado') => {
    if (type === 'logo') logoInputRef.current?.click();
    else certInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'certificado') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máx 5MB)");
      return;
    }

    try {
      setSaving(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        if (type === 'certificado') {
          setPendingCert({ base64: base64String, name: file.name });
          setPassModalOpen(true);
          setSaving(false);
          return;
        }

        try {
          await api.post("/admin/facturacion/configuracion/emisor/logo", { file: base64String, fileName: file.name });
          toast.success("Logo subido correctamente");
          setEmpresaData((prev: any) => ({ ...prev, logo_path: base64String }));
        } catch (err: any) {
          toast.error(err.response?.data?.error || "Error al subir el logo");
        } finally {
          setSaving(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Error al procesar el archivo");
      setSaving(false);
    }
  };

  const handleUploadCertWithPass = async () => {
    if (!certPassword) {
      toast.error("Debes introducir la contraseña del certificado");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/admin/facturacion/configuracion/emisor/certificado", {
        file: pendingCert.base64,
        fileName: pendingCert.name,
        password: certPassword
      });
      toast.success("Certificado subido correctamente");
      setPassModalOpen(false);
      setCertPassword("");
      setEmpresaData((prev: any) => ({
        ...prev,
        certificado_path: pendingCert.name,
        certificado_upload_date: new Date().toISOString(),
        certificado_info: res.data.data
      }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error al subir certificado");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCertificate = async () => {
    try {
      setSaving(true);
      await api.delete("/admin/facturacion/configuracion/emisor/certificado");
      setEmpresaData((prev: any) => ({
        ...prev,
        certificado_path: "",
        certificado_upload_date: "",
        certificado_info: null
      }));
      toast.success("Certificado eliminado correctamente");
    } catch (err: any) {
      toast.error("Error al eliminar el certificado");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await api.post(`/admin/employees/${adminData.id}/invite`);
      setInviteData({
        installUrl: res.data.installUrl,
        expires_at: res.data.expires_at,
        token: res.data.token,
        empleado: {
          nombre: adminData.nombre,
          email: adminData.email,
        },
      });
      setShowShareModal(true);
    } catch (err: any) {
      showError(err?.response?.data?.error || "No se pudo generar la invitación");
    } finally {
      setLoadingInvite(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] transition-opacity flex items-center justify-center p-4">
            <motion.div
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-background w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden relative"
            >
              {/* Header con Drag Handle */}
              <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Centro de Administración</h2>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gestión Global de {adminData?.nombre || "Plataforma"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="cursor-move p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground mr-2"
                    onPointerDown={(e) => dragControls.start(e)}
                    style={{ touchAction: 'none' }}
                  >
                    <GripHorizontal size={20} />
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 border-b border-border bg-muted/20">
                    <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0">
                      {(!sistemaConfig.modulos?.empleados || activeTab === 'perfil') && (
                        <TabsTrigger value="perfil" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2">
                          <User size={16} /> Perfil
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="empresa" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2 text-xs md:text-sm">
                        <Building2 size={16} /> Empresa
                      </TabsTrigger>
                      <TabsTrigger value="sistema" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2 text-xs md:text-sm">
                        <Settings size={16} /> Sistema
                      </TabsTrigger>
                      {sistemaConfig.modulos?.facturacion && (
                        <TabsTrigger value="facturacion" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2 text-xs md:text-sm">
                          <FileText size={16} /> Facturación
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="escritorio" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2 text-xs md:text-sm">
                        <LayoutGrid size={16} /> Escritorio
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                      {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                          <Loader2 className="animate-spin" size={32} />
                          <p className="font-medium">Cargando configuración...</p>
                        </div>
                      ) : (
                        <>
                          {/* --- TABS CONTENT: PERFIL --- */}
                          <TabsContent value="perfil" className="m-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary">
                                  <Clock size={18} />
                                  <h3 className="font-bold uppercase tracking-wider text-xs">Jornada Laboral</h3>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Plantilla de Horario</Label>
                                  <select
                                    className="w-full border rounded-lg px-4 py-3 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    value={selectedPlantilla}
                                    onChange={(e) => setSelectedPlantilla(e.target.value)}
                                  >
                                    <option value="">Sin plantilla (No laborable)</option>
                                    {plantillas.map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary">
                                  <Smartphone size={18} />
                                  <h3 className="font-bold uppercase tracking-wider text-xs">Acceso Móvil (PWA)</h3>
                                </div>
                                <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col justify-between h-[calc(100%-2rem)]">
                                  <p className="text-sm font-medium">
                                    {adminData?.device_hash ? '✓ Dispositivo vinculado' : '⚠ Sin vincular'}
                                  </p>
                                  <button
                                    onClick={handleGenerateInvite}
                                    disabled={loadingInvite}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-background border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 text-xs"
                                  >
                                    {loadingInvite ? 'Generando...' : 'Obtener invitación'}
                                    <Send size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-primary">
                                <Mail size={18} />
                                <h3 className="font-bold uppercase tracking-wider text-xs">Configuración de Email</h3>
                              </div>

                              <div className="bg-muted/10 border p-4 rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${emailConfig?.modo === 'oauth2' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                      <Mail size={20} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold">{emailConfig?.modo === 'oauth2' ? 'Gmail Conectado' : 'Sin vincular'}</p>
                                      <p className="text-[10px] text-muted-foreground">{emailConfig?.oauth2_email || 'Usa tu Gmail para enviar invitaciones'}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {emailConfig?.modo === 'oauth2' ? (
                                      <Button size="sm" variant="outline" onClick={handleSendTestEmail} disabled={sendingTestEmail} className="h-8 text-[10px]">
                                        {sendingTestEmail ? 'Enviando...' : 'Test'}
                                      </Button>
                                    ) : (
                                      <Button size="sm" onClick={handleConnectGmail} disabled={connectingEmail} className="h-8 text-[10px]">
                                        {connectingEmail ? 'Conectando...' : 'Conectar Gmail'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* --- TABS CONTENT: EMPRESA --- */}
                          <TabsContent value="empresa" className="m-0 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-4">
                                <Label className="text-sm font-medium">Logotipo de Empresa</Label>
                                <input
                                  type="file"
                                  ref={logoInputRef}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, 'logo')}
                                />
                                <div
                                  className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer aspect-video bg-muted/20"
                                  onClick={() => handleFileUploadTrigger('logo')}
                                >
                                  {empresaData.logo_path ? (
                                    <img
                                      src={empresaData.logo_path.startsWith('data:') ? empresaData.logo_path : `/api/uploads/${empresaData.logo_path}`}
                                      alt="Logo"
                                      className="max-h-full object-contain"
                                    />
                                  ) : (
                                    <>
                                      <Upload className="w-8 h-8 text-muted-foreground" />
                                      <p className="text-xs text-muted-foreground font-medium">Subir Logo</p>
                                      <p className="text-[10px] text-muted-foreground/60">Recomendado: 400x200px</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <Label className="text-sm font-medium">Certificado Digital (.p12 / .pfx)</Label>
                                <input
                                  type="file"
                                  ref={certInputRef}
                                  className="hidden"
                                  accept=".pfx,.p12"
                                  onChange={(e) => handleFileChange(e, 'certificado')}
                                />
                                <div className="border border-border rounded-xl p-4 bg-muted/30 h-[calc(100%-2rem)] flex flex-col justify-between">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${empresaData.certificado_path ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                                      <ShieldCheck size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">
                                        {empresaData.certificado_path ? "Certificado Activo" : "No configurado"}
                                      </p>
                                      {empresaData.certificado_info ? (
                                        <div className="space-y-1 mt-1">
                                          <p className="text-[10px] text-muted-foreground truncate" title={empresaData.certificado_info.subject}>
                                            {empresaData.certificado_info.subject}
                                          </p>
                                          <p className="text-[10px] font-medium text-green-600">
                                            Vence: {new Date(empresaData.certificado_info.validTo).toLocaleDateString()}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground mt-1">Necesario para firma de facturas</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    {empresaData.certificado_path && (
                                      <Button size="sm" variant="ghost" onClick={handleRemoveCertificate} className="h-8 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 size={12} className="mr-1" /> Eliminar
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => handleFileUploadTrigger('certificado')} className="h-8 text-[10px] bg-background">
                                      {empresaData.certificado_path ? "Sustituir" : "Subir archivo"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>NIF / CIF</Label>
                                <Input value={empresaData.nif} onChange={(e) => setEmpresaData({ ...empresaData, nif: e.target.value })} placeholder="X0000000X" />
                              </div>
                              <div className="space-y-2">
                                <Label>Razón Social</Label>
                                <Input value={empresaData.nombre} onChange={(e) => setEmpresaData({ ...empresaData, nombre: e.target.value })} placeholder="Empresa S.L." />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Nombre Comercial</Label>
                              <Input value={empresaData.nombre_comercial} onChange={(e) => setEmpresaData({ ...empresaData, nombre_comercial: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label><Phone className="inline w-3 h-3 mr-1" /> Teléfono</Label>
                                <Input value={empresaData.telefono} onChange={(e) => setEmpresaData({ ...empresaData, telefono: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label><Globe className="inline w-3 h-3 mr-1" /> Web</Label>
                                <Input value={empresaData.web} onChange={(e) => setEmpresaData({ ...empresaData, web: e.target.value })} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Dirección</Label>
                              <Input value={empresaData.direccion} onChange={(e) => setEmpresaData({ ...empresaData, direccion: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>CP</Label>
                                <Input value={empresaData.cp} onChange={(e) => setEmpresaData({ ...empresaData, cp: e.target.value })} />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label>Población</Label>
                                <Input value={empresaData.poblacion} onChange={(e) => setEmpresaData({ ...empresaData, poblacion: e.target.value })} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Registro Mercantil / Otros Datos</Label>
                              <Textarea value={empresaData.registro_mercantil} onChange={(e) => setEmpresaData({ ...empresaData, registro_mercantil: e.target.value })} rows={2} />
                            </div>
                          </TabsContent>

                          {/* --- TABS CONTENT: SISTEMA --- */}
                          <TabsContent value="sistema" className="m-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Columna Módulos */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-primary">
                                    <Sparkles size={18} />
                                    <h3 className="font-bold uppercase tracking-wider text-xs">Módulos Activos</h3>
                                  </div>

                                  {/* Selector de Perfil para Módulos */}
                                  <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                                    <Button
                                      size="sm"
                                      variant={activeWidgetProfile === 'desktop' ? 'secondary' : 'ghost'}
                                      className="h-6 text-[9px] px-2 font-bold"
                                      onClick={() => setActiveWidgetProfile('desktop')}
                                    >
                                      DESK
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={activeWidgetProfile === 'mobile' ? 'secondary' : 'ghost'}
                                      className="h-6 text-[9px] px-2 font-bold"
                                      onClick={() => {
                                        setActiveWidgetProfile('mobile');
                                        if (!sistemaConfig.mobileEnabled) {
                                          setSistemaConfig({ ...sistemaConfig, mobileEnabled: true });
                                        }
                                      }}
                                    >
                                      MÓVIL
                                    </Button>
                                  </div>
                                </div>

                                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold uppercase">Activar Modo Móvil (PWA)</Label>
                                      <p className="text-[9px] text-muted-foreground leading-tight">Habilita acceso específico para smartphones</p>
                                    </div>
                                    <Switch
                                      checked={sistemaConfig.mobileEnabled}
                                      onCheckedChange={(v) => setSistemaConfig({ ...sistemaConfig, mobileEnabled: v })}
                                      className="scale-75 origin-right"
                                    />
                                  </div>

                                  {Object.entries(activeWidgetProfile === 'desktop' ? sistemaConfig.modulos : (sistemaConfig.modulos_mobile || {}))
                                    .filter(([key]) => !['ai_tokens', 'es_creador'].includes(key))
                                    .map(([key, active]: [string, any]) => (
                                      <div key={key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                                        <Label className="capitalize text-xs font-semibold">{key.replace('_', ' ')}</Label>
                                        <Switch
                                          checked={!!active}
                                          onCheckedChange={(checked) => {
                                            const field = activeWidgetProfile === 'desktop' ? 'modulos' : 'modulos_mobile';
                                            setSistemaConfig({
                                              ...sistemaConfig,
                                              [field]: { ...sistemaConfig[field], [key]: checked }
                                            });
                                          }}
                                          className="scale-75 origin-right"
                                          disabled={activeWidgetProfile === 'mobile' && !sistemaConfig.mobileEnabled}
                                        />
                                      </div>
                                    ))}

                                  {activeWidgetProfile === 'mobile' && !sistemaConfig.mobileEnabled && (
                                    <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-md font-medium text-center italic">
                                      Activa el modo móvil para personalizar estos módulos.
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Columna Backup y Google */}
                              <div className="space-y-6">
                                {/* Backup Section */}
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-amber-600">
                                    <Database size={18} />
                                    <h3 className="font-bold uppercase tracking-wider text-xs">Autorespaldo (PC Local)</h3>
                                  </div>
                                  <div className={cn(
                                    "border rounded-xl p-4 transition-all",
                                    directoryHandle ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
                                  )}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <FolderCog size={16} className={directoryHandle ? "text-green-600" : "text-amber-600"} />
                                        <span className="text-[11px] font-bold uppercase">{directoryHandle ? "Vinculado" : "Desvinculado"}</span>
                                      </div>
                                      <Button size="sm" variant="secondary" onClick={handleConfigureFolder} className="h-7 text-[10px]">
                                        {directoryHandle ? "Cambiar" : "Vincular PC"}
                                      </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                                      {directoryHandle ? "Este PC recibe copias automáticas al iniciar sesión." : "Vincula una carpeta para recibir backups físicos automáticamente."}
                                    </p>
                                  </div>
                                </div>

                                {/* Google Calendar Section */}
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <CalendarIcon size={18} />
                                    <h3 className="font-bold uppercase tracking-wider text-xs">Google Calendar</h3>
                                  </div>
                                  <div className={cn(
                                    "border rounded-xl p-4 transition-all",
                                    googleCalendarConfig?.configured ? "bg-blue-500/5 border-blue-500/20" : "bg-muted border-border"
                                  )}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className={googleCalendarConfig?.configured ? "text-blue-600" : "text-muted-foreground"} />
                                        <span className="text-[11px] font-bold uppercase">{googleCalendarConfig?.configured ? "Conectado" : "Desconectado"}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={googleCalendarConfig?.configured ? handleSyncCalendar : handleConnectCalendar}
                                        disabled={connectingCalendar || syncingCalendar}
                                        className="h-7 text-[10px]"
                                      >
                                        {connectingCalendar || syncingCalendar ? <Loader2 size={12} className="animate-spin" /> : (googleCalendarConfig?.configured ? "Sincronizar" : "Conectar")}
                                      </Button>
                                    </div>
                                    {googleCalendarConfig?.configured && (
                                      <p className="text-[10px] text-blue-600/80 font-medium mt-2 truncate">
                                        📧 {googleCalendarConfig.oauth2_email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* --- TABS CONTENT: FACTURACIÓN --- */}
                          <TabsContent value="facturacion" className="m-0 space-y-6 pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-green-600">
                                  <ShieldCheck size={18} />
                                  <h3 className="font-bold uppercase tracking-wider text-xs">Cumplimiento y Seguridad</h3>
                                </div>
                                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <Label className="text-xs font-bold">Modo Veri*Factu</Label>
                                      <p className="text-[10px] text-muted-foreground leading-tight">Envío automático a la AEAT según Ley Antifraude</p>
                                    </div>
                                    <Switch
                                      checked={facturacionData.verifactu_activo}
                                      onCheckedChange={(c) => setFacturacionData({ ...facturacionData, verifactu_activo: c })}
                                    />
                                  </div>

                                  {facturacionData.verifactu_activo && (
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                      <Button
                                        size="sm"
                                        variant={facturacionData.verifactu_modo === 'TEST' ? 'default' : 'outline'}
                                        className={cn("h-8 text-[10px]", facturacionData.verifactu_modo === 'TEST' && "bg-blue-600 hover:bg-blue-700")}
                                        onClick={() => setFacturacionData({ ...facturacionData, verifactu_modo: 'TEST' })}
                                      >
                                        ENTORNO TEST
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={facturacionData.verifactu_modo === 'PROD' ? 'default' : 'outline'}
                                        className={cn("h-8 text-[10px]", facturacionData.verifactu_modo === 'PROD' && "bg-red-600 hover:bg-red-700")}
                                        onClick={() => setFacturacionData({ ...facturacionData, verifactu_modo: 'PROD' })}
                                      >
                                        PRODUCCIÓN
                                      </Button>
                                      {facturacionData.verifactu_modo === 'PROD' && (
                                        <p className="col-span-2 text-[9px] text-red-600 font-bold flex items-center gap-1">
                                          <AlertCircle size={10} /> ¡Atención! El modo producción envía datos reales a Hacienda.
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <Separator />

                                  <div className="flex items-center justify-between opacity-80">
                                    <div className="space-y-0.5">
                                      <Label className="text-xs font-bold">Facturas Inmutables</Label>
                                      <p className="text-[10px] text-muted-foreground leading-tight">Bloqueo de edición tras validación</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-green-600 uppercase">Activo por Ley</span>
                                      <Switch checked={true} disabled />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between opacity-80">
                                    <div className="space-y-0.5">
                                      <Label className="text-xs font-bold">Prohibir Borrado</Label>
                                      <p className="text-[10px] text-muted-foreground leading-tight">Trazabilidad contable total</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-green-600 uppercase">Activo por Ley</span>
                                      <Switch checked={true} disabled />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Hash size={18} />
                                  <h3 className="font-bold uppercase tracking-wider text-xs">Numeración Inteligente</h3>
                                </div>
                                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Tipo de Serie</Label>
                                    <select
                                      className="w-full h-9 border rounded-md px-3 text-xs bg-background"
                                      value={facturacionData.numeracion_tipo}
                                      onChange={(e) => setFacturacionData({ ...facturacionData, numeracion_tipo: e.target.value })}
                                      disabled={facturacionData.numeracion_locked}
                                    >
                                      <option value="STANDARD">Continua (F-001)</option>
                                      <option value="BY_YEAR">Por Año (F-2026-001)</option>
                                      <option value="PREFIXED">Personalizada (SERIE-001)</option>
                                    </select>
                                  </div>

                                  {facturacionData.numeracion_tipo === 'PREFIXED' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">Formato del Prefijo</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          className="h-8 text-xs"
                                          value={facturacionData.numeracion_formato}
                                          onChange={(e) => setFacturacionData({ ...facturacionData, numeracion_formato: e.target.value })}
                                          placeholder="Ej: FAC-{YEAR}-"
                                          disabled={facturacionData.numeracion_locked}
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {['{YEAR}', '{MONTH}', '{DAY}'].map(tag => (
                                          <Button
                                            key={tag}
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[9px] px-2"
                                            disabled={facturacionData.numeracion_locked}
                                            onClick={() => setFacturacionData({ ...facturacionData, numeracion_formato: facturacionData.numeracion_formato + tag })}
                                          >
                                            + {tag.replace('{', '').replace('}', '')}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-bold text-blue-600 uppercase">Previsualización</span>
                                      <span className="text-[9px] text-muted-foreground italic">Próxima factura</span>
                                    </div>
                                    <p className="font-mono text-xs font-bold text-blue-700">
                                      {facturacionData.numeracion_tipo === 'STANDARD' ? `${facturacionData.serie || 'F'}-` : ''}
                                      {facturacionData.numeracion_tipo === 'BY_YEAR' ? `${facturacionData.serie || 'F'}-${new Date().getFullYear()}-` : ''}
                                      {facturacionData.numeracion_tipo === 'PREFIXED' ?
                                        (facturacionData.numeracion_formato || '')
                                          .replace('{YEAR}', new Date().getFullYear().toString())
                                          .replace('{MONTH}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
                                          .replace('{DAY}', new Date().getDate().toString().padStart(2, '0'))
                                        : ''
                                      }
                                      {(facturacionData.siguiente_numero || 1).toString().padStart(4, '0')}
                                    </p>
                                  </div>

                                  {facturacionData.numeracion_locked && (
                                    <p className="text-[9px] text-amber-600 font-medium flex items-center gap-1">
                                      <AlertCircle size={10} /> Numeración bloqueada por facturas emitidas.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* --- Asistente de Migración Fiscal (OCR) --- */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-amber-600">
                                <Sparkles size={18} />
                                <h3 className="font-bold uppercase tracking-wider text-xs">Asistente de Migración Fiscal</h3>
                              </div>
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-4">
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {facturacionData.numeracion_locked
                                    ? "La migración está bloqueada porque ya existen facturas emitidas este año. Para cambiar la numeración, contacta con soporte."
                                    : "Sube tu última factura emitida para configurar automáticamente la numeración y series mediante IA."}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold">Evidencia de Cierre (PDF/Imagen)</Label>
                                    <input
                                      type="file"
                                      ref={migracionInputRef}
                                      className="hidden"
                                      accept="application/pdf,image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64 = reader.result?.toString().split(',')[1];
                                          if (!base64) return;

                                          setGeneratingAiField('migracion');
                                          toast.promise(
                                            api.post("/admin/facturacion/configuracion/emisor/ocr-migracion", { file: base64 }),
                                            {
                                              loading: 'Analizando factura con OCR inteligente...',
                                              success: (res: any) => {
                                                const ext = res.data.data;
                                                setFacturacionData((prev: any) => ({
                                                  ...prev,
                                                  correlativo_inicial: ext.numeracion.ultimo_numero,
                                                  migracion_last_serie: ext.numeracion.serie,
                                                  migracion_last_subtotal: ext.economicos.subtotal,
                                                  migracion_last_total: ext.economicos.total,
                                                  migracion_last_pdf: file.name
                                                }));
                                                setOcrConfidence({
                                                  numeracion: ext.numeracion.confidence,
                                                  identidad: ext.identidad.confidence,
                                                  economicos: ext.economicos.confidence
                                                });
                                                setGeneratingAiField(null);
                                                return `Factura analizada. Fiabilidad: ${(ext.numeracion.confidence * 100).toFixed(0)}%`;
                                              },
                                              error: (err) => {
                                                setGeneratingAiField(null);
                                                return 'No se pudo extraer información. Por favor, rellena manualmente.';
                                              }
                                            }
                                          );
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    <Button
                                      variant="outline"
                                      className="w-full flex justify-between h-9 px-3 font-normal text-xs"
                                      onClick={() => migracionInputRef.current?.click()}
                                      disabled={generatingAiField === 'migracion' || facturacionData.numeracion_locked}
                                    >
                                      <span className="truncate">
                                        {facturacionData.numeracion_locked ? "🔒 Bloqueado por facturación activa" : (facturacionData.migracion_last_pdf ? "✓ Factura subida" : "Seleccionar archivo...")}
                                      </span>
                                      {generatingAiField === 'migracion' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="text-muted-foreground" />}
                                    </Button>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background/50">
                                      <Switch
                                        checked={facturacionData.migracion_legal_aceptado}
                                        onCheckedChange={v => setFacturacionData({ ...facturacionData, migracion_legal_aceptado: v, migracion_fecha_aceptacion: v ? new Date().toISOString() : null })}
                                      />
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold leading-none uppercase">Responsabilidad Legal</Label>
                                        <p className="text-[9px] text-muted-foreground leading-tight">
                                          Confirmo que el número inicial coincide con mi contabilidad previa. Eximo a la plataforma de cualquier responsabilidad por saltos en la serie.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] uppercase font-bold">ID Serie Actual</Label>
                                      {!facturacionData.migracion_last_pdf && !facturacionData.numeracion_locked && (
                                        <span className="text-[8px] text-amber-600 font-bold uppercase">Sube factura para editar</span>
                                      )}
                                    </div>
                                    <Input
                                      className="h-8 text-xs font-mono bg-background"
                                      value={facturacionData.serie}
                                      onChange={(e) => setFacturacionData({ ...facturacionData, serie: e.target.value })}
                                      disabled={facturacionData.numeracion_locked || (!facturacionData.migracion_last_pdf && !facturacionData.serie)}
                                      placeholder={facturacionData.numeracion_locked ? "" : "Esperando OCR..."}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] uppercase font-bold">Próximo Número</Label>
                                      {!facturacionData.migracion_last_pdf && !facturacionData.numeracion_locked && (
                                        <span className="text-[8px] text-amber-600 font-bold uppercase">Requiere evidencia</span>
                                      )}
                                    </div>
                                    <Input
                                      type="number"
                                      className="h-8 text-xs font-mono bg-background"
                                      value={facturacionData.siguiente_numero}
                                      onChange={(e) => setFacturacionData({ ...facturacionData, siguiente_numero: parseInt(e.target.value) || 0 })}
                                      disabled={facturacionData.numeracion_locked || !facturacionData.migracion_last_pdf}
                                      placeholder={facturacionData.numeracion_locked ? "" : "Subir PDF"}
                                    />
                                  </div>
                                </div>

                                {ocrConfidence.numeracion > 0 && (
                                  <div className="flex gap-4 p-2 bg-muted/30 rounded-lg justify-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[8px] uppercase text-muted-foreground">Numeración</span>
                                      <span className={cn("text-[10px] font-bold", ocrConfidence.numeracion > 0.8 ? "text-green-600" : "text-amber-500")}>{(ocrConfidence.numeracion * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[8px] uppercase text-muted-foreground">Económicos</span>
                                      <span className={cn("text-[10px] font-bold", ocrConfidence.economicos > 0.8 ? "text-green-600" : "text-amber-500")}>{(ocrConfidence.economicos * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4 pt-4">
                              <div className="flex items-center gap-2 text-primary">
                                <FileText size={18} />
                                <h3 className="font-bold uppercase tracking-wider text-xs">Ajustes Adicionales y Textos Legales</h3>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold">IBAN (Aparece en Factura)</Label>
                                  <Input
                                    className="h-8 text-xs font-mono"
                                    value={empresaData.iban}
                                    onChange={(e) => setEmpresaData({ ...empresaData, iban: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Pie de Factura (General)</Label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-[9px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      onClick={async () => {
                                        try {
                                          const res = await api.post("/admin/facturacion/configuracion/generar-texto", { type: 'pie' });
                                          setFacturacionData({ ...facturacionData, texto_pie: res.data.text });
                                          toast.success("Texto legal generado");
                                        } catch (e) { toast.error("Error al generar texto"); }
                                      }}
                                    >
                                      <Sparkles size={10} /> AUTO-GENERAR
                                    </Button>
                                  </div>
                                  <Textarea
                                    className="text-xs min-h-[60px]"
                                    value={facturacionData.texto_pie}
                                    onChange={(e) => setFacturacionData({ ...facturacionData, texto_pie: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Texto Exención IVA (si aplica)</Label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-[9px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      onClick={async () => {
                                        try {
                                          const res = await api.post("/admin/facturacion/configuracion/generar-texto", { type: 'exento' });
                                          setFacturacionData({ ...facturacionData, texto_exento: res.data.text });
                                          toast.success("Texto exención generado");
                                        } catch (e) { toast.error("Error al generar texto"); }
                                      }}
                                    >
                                      <Sparkles size={10} /> AUTO-GENERAR
                                    </Button>
                                  </div>
                                  <Textarea
                                    className="text-xs min-h-[60px]"
                                    value={facturacionData.texto_exento}
                                    onChange={(e) => setFacturacionData({ ...facturacionData, texto_exento: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* --- TABS CONTENT: ESCRITORIO --- */}
                          <TabsContent value="escritorio" className="m-0 space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-primary">
                                  <LayoutGrid size={18} />
                                  <h3 className="font-bold uppercase tracking-wider text-xs">Configuración del Dashboard</h3>
                                </div>

                                {/* Selector de Perfil Dual */}
                                <div className="flex bg-muted rounded-lg p-1 gap-1">
                                  <Button
                                    size="sm"
                                    variant={activeWidgetProfile === 'desktop' ? 'secondary' : 'ghost'}
                                    className="h-7 text-[10px] px-3 font-bold"
                                    onClick={() => setActiveWidgetProfile('desktop')}
                                  >
                                    <Settings size={12} className="mr-1.5" /> ESCRITORIO
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={activeWidgetProfile === 'mobile' ? 'secondary' : 'ghost'}
                                    className="h-7 text-[10px] px-3 font-bold"
                                    onClick={() => setActiveWidgetProfile('mobile')}
                                  >
                                    <Smartphone size={12} className="mr-1.5" /> PWA MÓVIL
                                  </Button>
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground leading-tight italic">
                                {activeWidgetProfile === 'desktop'
                                  ? "Personaliza los widgets para la versión de escritorio de alta densidad."
                                  : "Optimiza la vista para dispositivos móviles y modo PWA."}
                              </p>

                              <div className="bg-muted/20 border border-border rounded-xl p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                                {ALL_DASHBOARD_WIDGETS.map((wd) => {
                                  const configList = activeWidgetProfile === 'desktop' ? dashboardWidgets : dashboardWidgetsMobile;
                                  const savedWidget = configList.find((sw: any) => sw.id === wd.id);
                                  const isVisible = savedWidget ? savedWidget.visible : false;
                                  const Icon = wd.icon;

                                  return (
                                    <div key={wd.id} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors group border border-transparent hover:border-border">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background border rounded-md text-muted-foreground group-hover:text-primary transition-colors">
                                          <Icon size={14} />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold leading-none">{wd.label}</span>
                                          <p className="text-[9px] text-muted-foreground leading-tight mt-1">{wd.description}</p>
                                        </div>
                                      </div>
                                      <Switch
                                        checked={isVisible}
                                        onCheckedChange={(checked) => {
                                          const updateFn = activeWidgetProfile === 'desktop' ? setDashboardWidgets : setDashboardWidgetsMobile;
                                          updateFn(prev => {
                                            const existing = prev.find((item: any) => item.id === wd.id);
                                            if (existing) {
                                              return prev.map((item: any) =>
                                                item.id === wd.id ? { ...item, visible: checked } : item
                                              );
                                            } else {
                                              return [...prev, { id: wd.id, visible: checked, order: prev.length }];
                                            }
                                          });
                                        }}
                                        className="scale-75 origin-right"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TabsContent>
                        </>
                      )}
                    </div>
                  </div>
                </Tabs>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 font-bold text-muted-foreground hover:bg-muted rounded-xl transition"
                  disabled={saving}
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : <><Save size={18} /> Guardar cambios</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {
        showShareModal && inviteData && adminData && (
          <ShareInviteLinkModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            inviteData={inviteData}
            empleadoId={adminData.id}
            tipo="nuevo"
          />
        )
      }

      <Dialog open={passModalOpen} onOpenChange={setPassModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); handleUploadCertWithPass(); }}>
            <DialogHeader>
              <DialogTitle>Contraseña del Certificado</DialogTitle>
              <DialogDescription>
                Introduce la contraseña para poder instalar el certificado digital.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pass">Contraseña</Label>
                <Input
                  id="pass"
                  type="password"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  className="bg-muted"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPassModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Procesando...' : "Validar y Subir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
