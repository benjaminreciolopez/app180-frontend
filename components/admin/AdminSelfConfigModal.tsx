import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import ShareInviteLinkModal from "./ShareInviteLinkModal";
import AdminTemplateEditorModal from "./AdminTemplateEditorModal";
import { User, Clock, Smartphone, Save, X, Send, Settings, Plus } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>("");

  // Estado para invitaciones
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  
  const [showEditorModal, setShowEditorModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, adminId]);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, plantRes] = await Promise.all([
        api.get("/employees"),
        api.get("/admin/plantillas")
      ]);

      const employees = empRes.data || [];
      const me = employees.find((e: any) => String(e.user_id) === String(adminId));
      
      setAdminData(me);
      setSelectedPlantilla(me?.plantilla_id || "");
      setPlantillas(plantRes.data || []);
    } catch (err) {
      console.error("Error loading admin self config", err);
      showError("No se pudieron cargar tus datos");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Actualizar plantilla usando el endpoint de asignación
      if (selectedPlantilla !== adminData?.plantilla_id) {
        await api.post("/admin/plantillas/asignar", {
          empleado_id: adminData.id,
          plantilla_id: selectedPlantilla,
          fecha_inicio: new Date().toISOString().split('T')[0]
        });
      }
      
      showSuccess("Configuración actualizada correctamente");
      loadData();
    } catch (err) {
      console.error("Error saving admin self config", err);
      showError("Error al guardar los cambios");
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
        <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Configuración de {adminData?.nombre || "Administrador"}</h2>
                <p className="text-xs text-muted-foreground">Gestiona tu propia jornada e instalaciones</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground">Cargando tus datos...</div>
            ) : !adminData ? (
              <div className="py-20 text-center text-muted-foreground">No se encontró tu registro de empleado asociado a este usuario.</div>
            ) : (
              <>
                {/* Jornada */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock size={18} />
                    <h3 className="font-bold uppercase tracking-wider text-sm">Tu Jornada Laboral</h3>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Plantilla de Horario asignada</label>
                    <div className="flex gap-2">
                        <select
                        className="flex-1 border rounded-lg px-4 py-3 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={selectedPlantilla}
                        onChange={(e) => setSelectedPlantilla(e.target.value)}
                        >
                        <option value="">Sin plantilla (No laborable)</option>
                        {plantillas.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                        </select>
                        <button
                            onClick={() => setShowEditorModal(true)}
                            className="px-4 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition flex items-center gap-2 font-bold"
                            title="Configurar horario detallado"
                        >
                            {selectedPlantilla ? <Settings size={18} /> : <Plus size={18} />}
                            <span className="hidden sm:inline">{selectedPlantilla ? 'Editar' : 'Nuevo'}</span>
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Esta plantilla define cuándo "estás trabajando" en el calendario y reportes.
                    </p>
                  </div>
                </section>

                <div className="h-px bg-border" />

                {/* Instalación Móvil */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Smartphone size={18} />
                    <h3 className="font-bold uppercase tracking-wider text-sm">Contendo en tu móvil</h3>
                  </div>
                  <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-3 w-3 rounded-full ${adminData?.device_hash ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-semibold">
                          {adminData?.device_hash ? 'Instalación activa vinculada' : 'Sin instalación detectada'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {adminData?.device_hash 
                            ? 'Ya tienes un dispositivo vinculado. Puedes reenviarte la invitación si vas a usar uno nuevo.' 
                            : 'Invítate a ti mismo para instalar el acceso directo en tu pantalla de inicio móvil.'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleGenerateInvite}
                      disabled={loadingInvite}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-neutral-800 border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      {loadingInvite ? 'Generando...' : (adminData?.device_hash ? 'Reenviar Invitación PWA' : 'Generar Invitación PWA')}
                      <Send size={16} />
                    </button>
                  </div>
                </section>
              </>
            )}
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

      {showEditorModal && (
        <AdminTemplateEditorModal 
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          plantillaId={selectedPlantilla}
          onSaved={(newId) => {
            loadData(); // Recargar lista de plantillas
            if (newId) setSelectedPlantilla(newId);
          }}
        />
      )}
    </>
  );
}
