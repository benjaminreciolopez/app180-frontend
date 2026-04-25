"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { getUser } from "@/services/auth";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import CalendarConfigPanel from "@/components/admin/CalendarConfigPanel";
import CalendarSyncHistory from "@/components/admin/CalendarSyncHistory";
import KnowledgePanel from "@/components/admin/KnowledgePanel";
import BackupPanel from "@/components/admin/BackupPanel";
import TitularesManager from "@/components/shared/TitularesManager";
import TiposBloquePanel from "./TiposBloquePanel";
import { QrCode, Shield, ArrowRight } from "lucide-react";

type Modulos = {
  fichajes?: boolean;
  worklogs?: boolean;
  empleados?: boolean;
  facturacion?: boolean;
  pagos?: boolean;
  fiscal?: boolean;
  contable?: boolean;
};

type PermisoEntry = { read?: boolean; write?: boolean; upload?: boolean };
type AsesoriaVinculo = {
  id: string;
  asesoria_id: string;
  estado: "activo" | "pendiente" | string;
  asesoria_nombre?: string;
  permisos?: Record<string, PermisoEntry>;
} | null;

const DELEGACION_MAP: Partial<Record<keyof Modulos, Array<keyof Record<string, PermisoEntry>>>> = {
  fiscal: ["fiscal"],
  facturacion: ["facturas", "gastos"],
  empleados: ["nominas"],
  contable: ["contabilidad"],
};

const DEFAULTS: Modulos = {
  fichajes: true,
  worklogs: true,
  empleados: true,
  facturacion: false,
  pagos: false,
  fiscal: false,
  contable: false,
};

export default function AdminConfiguracionPage() {
  const router = useRouter();
  const user = getUser();
  const isFabricante = user?.es_fabricante === true;
  const [modulos, setModulos] = useState<Modulos | null>(null);
  const [modulosMobile, setModulosMobile] = useState<Modulos | null>(null);
  const [mobileEnabled, setMobileEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [tipoContribuyente, setTipoContribuyente] = useState<"autonomo" | "sociedad" | "">("");
  const [savingTipo, setSavingTipo] = useState(false);
  const [asesoriaVinculo, setAsesoriaVinculo] = useState<AsesoriaVinculo>(null);

  function isDelegado(key: keyof Modulos): boolean {
    if (!asesoriaVinculo || asesoriaVinculo.estado !== "activo" || !asesoriaVinculo.permisos) return false;
    const areas = DELEGACION_MAP[key];
    if (!areas) return false;
    return areas.some((area) => asesoriaVinculo.permisos?.[area]?.write === true);
  }

  async function load() {
    try {
      const r = await api.get("/admin/configuracion");

      const { modulos_mobile, tipo_contribuyente: tc, ...rest } = r.data;

      setTipoContribuyente(tc || "");
      setModulos({
        ...DEFAULTS,
        ...rest,
      });

      if (modulos_mobile) {
        setMobileEnabled(true);
        setModulosMobile({ ...DEFAULTS, ...modulos_mobile });
      } else {
        setMobileEnabled(false);
        setModulosMobile({ ...DEFAULTS, ...rest });
      }
    } catch (e) {
      console.error("Error cargando config", e);
      showError("No se pudo cargar la configuración");
    }
  }

  async function loadVinculo() {
    try {
      const r = await api.get("/admin/asesoria/vinculo");
      setAsesoriaVinculo(r.data?.data || null);
    } catch {
      setAsesoriaVinculo(null);
    }
  }

  useEffect(() => {
    load();
    loadVinculo();
  }, []);

  async function save() {
    if (!modulos) return;

    setSaving(true);

    try {
      await api.put("/admin/configuracion", {
        modulos,
        modulos_mobile: mobileEnabled ? modulosMobile : null,
      });

      const me = await api.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(me.data));

      // Notificar layout
      window.dispatchEvent(new Event("session-updated"));

      showSuccess("Configuración guardada");
    } finally {
      setSaving(false);
    }
  }

  function toggle(k: keyof Modulos) {
    if (activeTab === "mobile") {
      setModulosMobile((prev) => ({
        ...prev!,
        [k]: prev?.[k] === false ? true : false,
      }));
    } else {
      setModulos((prev) => ({
        ...prev!,
        [k]: prev?.[k] === false ? true : false,
      }));
    }
  }

  async function saveTipoContribuyente(newTipo: "autonomo" | "sociedad") {
    setSavingTipo(true);
    try {
      await api.put("/admin/empresa/tipo-contribuyente", {
        tipo_contribuyente: newTipo,
      });
      setTipoContribuyente(newTipo);
      showSuccess("Tipo de contribuyente actualizado");
    } catch {
      showError("Error al actualizar tipo de contribuyente");
    } finally {
      setSavingTipo(false);
    }
  }

  if (!modulos) return <LoadingSpinner fullPage />;

  const currentModulos = activeTab === "mobile" ? modulosMobile : modulos;

  return (
    <div className="app-main max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configuración del sistema</h1>

      {/* Módulos */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Módulos</h2>

        {/* Tabs Desktop / Móvil */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab("desktop")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "desktop"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Escritorio
          </button>
          <button
            onClick={() => setActiveTab("mobile")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "mobile"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Móvil (PWA)
          </button>
        </div>

        {activeTab === "mobile" && (
          <div className="card mb-4 bg-blue-50 border-blue-200">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Activar configuración móvil independiente</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Si está desactivado, el móvil usa los mismos módulos que el escritorio.
                </p>
              </div>
              <input
                type="checkbox"
                checked={mobileEnabled}
                onChange={() => setMobileEnabled(!mobileEnabled)}
                className="w-5 h-5"
              />
            </label>
          </div>
        )}

        {asesoriaVinculo?.estado === "activo" && (
          <div className="card mb-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Mi Asesoría</strong>
              {asesoriaVinculo.asesoria_nombre ? ` (${asesoriaVinculo.asesoria_nombre})` : ""} gestiona algunas áreas por ti.
              Los módulos delegados aparecen bloqueados — para liberarlos, retira el permiso de escritura desde tu asesoría o desde "Mi Asesoría".
            </p>
          </div>
        )}

        <div className={`card space-y-3 ${activeTab === "mobile" && !mobileEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <Toggle
            label="Fichajes"
            value={currentModulos?.fichajes}
            onChange={() => toggle("fichajes")}
          />

          <Toggle
            label="Trabajos / Partes"
            value={currentModulos?.worklogs}
            onChange={() => toggle("worklogs")}
          />

          <Toggle
            label="Empleados (incluye Ausencias)"
            value={currentModulos?.empleados}
            onChange={() => toggle("empleados")}
            delegado={isDelegado("empleados")}
          />

          <Toggle
            label="Facturación"
            value={currentModulos?.facturacion}
            onChange={() => toggle("facturacion")}
            delegado={isDelegado("facturacion")}
          />

          <Toggle
            label="Cobros y Pagos"
            value={currentModulos?.pagos}
            onChange={() => toggle("pagos")}
          />

          <Toggle
            label="Contabilidad"
            value={currentModulos?.contable}
            onChange={() => toggle("contable")}
            delegado={isDelegado("contable")}
          />

          <Toggle
            label="Fiscal"
            value={currentModulos?.fiscal}
            onChange={() => toggle("fiscal")}
            delegado={isDelegado("fiscal")}
          />
        </div>

        <Button onClick={save} disabled={saving} className="mt-4 py-6 font-bold shadow-md">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      {/* Tipo de Contribuyente */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Tipo de contribuyente</h2>
        <div className="card space-y-3">
          <p className="text-sm text-gray-600">
            Define si tu empresa opera como autonomo o sociedad. Esto afecta a los modelos fiscales aplicables y los plazos de VeriFactu.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveTipoContribuyente("autonomo")}
              disabled={savingTipo}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                tipoContribuyente === "autonomo"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              Autonomo
            </button>
            <button
              onClick={() => saveTipoContribuyente("sociedad")}
              disabled={savingTipo}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                tipoContribuyente === "sociedad"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              Sociedad
            </button>
          </div>
          {!tipoContribuyente && (
            <p className="text-xs text-amber-600 font-medium">
              No has definido el tipo de contribuyente. Selecciona uno para configurar correctamente los modelos fiscales.
            </p>
          )}
        </div>
      </div>

      {/* Titulares / Socios */}
      {user?.empresa_id && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Titulares / Socios</h2>
          <TitularesManager
            empresaId={user.empresa_id}
            basePath="/admin"
          />
        </div>
      )}

      {/* Tipos de Bloque */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Tipos de Bloque (Jornadas)</h2>
        <TiposBloquePanel />
      </div>

      {/* Conocimiento IA */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Entrenamiento de CONTENDO (IA)</h2>
        <KnowledgePanel />
      </div>

      {/* Google Calendar */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Sincronización con Google Calendar</h2>
        <CalendarConfigPanel onSyncComplete={() => setCalendarRefreshKey(prev => prev + 1)} />
      </div>

      {/* Historial */}
      <div>
        <CalendarSyncHistory refreshTrigger={calendarRefreshKey} />
      </div>

      {/* Backup Silencioso */}
      <div>
        <BackupPanel />
      </div>

      {/* Fabricante QR VIP - solo visible para el creador */}
      {isFabricante && (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Fabricante - QR VIP
          </h2>
          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Activar usuarios VIP</p>
                <p className="text-xs text-gray-500">
                  Escanea codigos QR para conceder acceso VIP. Disponible desde la app movil (PWA).
                </p>
              </div>
              <button
                onClick={() => router.push("/admin/fabricante")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                Abrir
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================
   Toggle reutilizable
======================== */

function Toggle({
  label,
  value,
  onChange,
  delegado = false,
}: {
  label: string;
  value?: boolean;
  onChange: () => void;
  delegado?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between ${delegado ? "opacity-70" : ""}`}>
      <span className="flex items-center gap-2">
        {label}
        {delegado && (
          <span
            className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded"
            title="Tu asesoría gestiona esta área"
          >
            Asesoría
          </span>
        )}
      </span>

      <input
        type="checkbox"
        checked={value !== false}
        onChange={onChange}
        disabled={delegado}
        className="w-5 h-5 disabled:cursor-not-allowed"
      />
    </label>
  );
}
