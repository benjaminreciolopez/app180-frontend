import { useState, useEffect, useRef, useMemo } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import ShareInviteLinkModal from "./ShareInviteLinkModal";
import { User, Clock, Smartphone, Save, X, Send, Building2, ShieldCheck, FileText, Settings, Database, Sparkles, History, Loader2, Globe, Phone, Hash, Upload, Trash2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    terminos_legales: "", texto_pie: "", texto_exento: "", texto_rectificativa: "",
    verifactu_activo: false, verifactu_modo: "TEST",
    numeracion_tipo: "STANDARD", numeracion_formato: "FAC-{YEAR}-", numeracion_locked: false,
    correlativo_inicial: 0
  });

  // Configuración de Sistema (Módulos)
  const [sistemaConfig, setSistemaConfig] = useState<any>({
    modulos: {},
    modulos_mobile: {},
    mobileEnabled: false
  });

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, adminId]);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, plantRes, emisorRes, sistemaFactRes, globalConfigRes] = await Promise.all([
        api.get("/employees"),
        api.get("/admin/plantillas"),
        api.get("/admin/facturacion/configuracion/emisor"),
        api.get("/admin/facturacion/configuracion/sistema"),
        api.get("/admin/configuracion")
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
        mobileEnabled: !!modulos_mobile
      });

      // Lógica de pestaña inicial: si hay empleados, saltar perfil si se desea
      // O simplemente dejar 'perfil' como default pero ocultar el trigger
      if (rest.empleados && activeTab === "perfil") {
        setActiveTab("empresa");
      }

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

      // 2. Guardar Empresa
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="relative group w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                {adminData?.avatar_url ? (
                  <img
                    src={adminData.avatar_url}
                    alt={adminData.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">Centro de Configuración</h2>
                <p className="text-xs text-muted-foreground">Empresa, Sistema y Perfil de {adminData?.nombre || "Administrador"}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition">
              <X size={20} />
            </button>
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
                  <TabsTrigger value="empresa" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2">
                    <Building2 size={16} /> Empresa
                  </TabsTrigger>
                  <TabsTrigger value="sistema" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2">
                    <Settings size={16} /> Sistema
                  </TabsTrigger>
                  {sistemaConfig.modulos?.facturacion && (
                    <TabsTrigger value="facturacion" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-full px-2 gap-2">
                      <FileText size={16} /> Facturación
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <Loader2 className="animate-spin" size={32} />
                      <p>Cargando configuración global...</p>
                    </div>
                  ) : (
                    <>
                      {/* --- TABS CONTENT: PERFIL --- */}
                      <TabsContent value="perfil" className="m-0 space-y-6">
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
                            <p className="text-xs text-muted-foreground italic">Define tu presencia en el calendario y reportes.</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Smartphone size={18} />
                            <h3 className="font-bold uppercase tracking-wider text-xs">Acceso Móvil (PWA)</h3>
                          </div>
                          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                            <p className="text-sm">
                              {adminData?.device_hash ? '✓ Dispositivo vinculado' : '⚠ Sin vincular'}
                            </p>
                            <button
                              onClick={handleGenerateInvite}
                              disabled={loadingInvite}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-background border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
                            >
                              {loadingInvite ? 'Generando...' : 'Obtener invitación'}
                              <Send size={14} />
                            </button>
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
                        <Card className="border-primary/20 bg-primary/5">
                          <CardHeader className="py-4">
                            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gestión de Módulos</CardTitle>
                            <CardDescription>Activa o desactiva las funcionalidades globales de tu negocio.</CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4 py-2">
                            {Object.entries(sistemaConfig.modulos).map(([key, active]: [string, any]) => (
                              <div key={key} className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label className="capitalize">{key.replace('_', ' ')}</Label>
                                </div>
                                <Switch
                                  checked={!!active}
                                  onCheckedChange={(checked) => setSistemaConfig({
                                    ...sistemaConfig,
                                    modulos: { ...sistemaConfig.modulos, [key]: checked }
                                  })}
                                />
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <div className="space-y-4 pt-2">
                          <div className="flex items-center gap-2 text-amber-600">
                            <Database size={18} />
                            <h3 className="font-bold uppercase tracking-wider text-xs">Backups y Seguridad</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center gap-2 p-3 border rounded-xl hover:bg-muted transition text-sm font-medium">
                              <History size={16} /> Ver historial
                            </button>
                            <button className="flex items-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition text-sm font-bold">
                              <Save size={16} /> Crear Backup
                            </button>
                          </div>
                        </div>
                      </TabsContent>

                      {/* --- TABS CONTENT: FACTURACIÓN --- */}
                      <TabsContent value="facturacion" className="m-0 space-y-6">
                        <div className="bg-muted/30 border p-4 rounded-xl space-y-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="text-green-600" size={18} />
                            <h4 className="font-bold text-sm">Ley Antifraude (Veri*Factu)</h4>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>Modo Verifactu Activo</Label>
                            <Switch
                              checked={facturacionData.verifactu_activo}
                              onCheckedChange={(c) => setFacturacionData({ ...facturacionData, verifactu_activo: c })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Iban para Pagos</Label>
                          <Input value={empresaData.iban} onChange={(e) => setEmpresaData({ ...empresaData, iban: e.target.value })} placeholder="ES00 0000..." />
                        </div>

                        <div className="space-y-2">
                          <Label>Pie de Página / Textos Legales</Label>
                          <Textarea
                            value={facturacionData.texto_pie}
                            onChange={(e) => setFacturacionData({ ...facturacionData, texto_pie: e.target.value })}
                            placeholder="Ej: Inscrita en el R.M de Madrid..."
                            rows={3}
                          />
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
        </div>
      </div>

      {showShareModal && inviteData && adminData && (
        <ShareInviteLinkModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          inviteData={inviteData}
          empleadoId={adminData.id}
          tipo="nuevo"
        />
      )}

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
