"use client";

import { useEffect, useState, FormEvent } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  Users,
  Crown,
  Loader2,
  CheckCircle2,
  LayoutDashboard,
  Eye,
  EyeOff,
} from "lucide-react";
import { ALL_ASESOR_DASHBOARD_WIDGETS } from "@/lib/asesor-dashboard-widgets";
import { Switch } from "@/components/ui/switch";

type Asesoria = {
  id: string;
  nombre: string;
  cif: string | null;
  email_contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  plan: string;
  max_clientes: number;
  clientes_activos: number;
  created_at: string;
  miembros: {
    id: string;
    nombre: string;
    email: string;
    rol_interno: string;
    activo: boolean;
    created_at: string;
  }[];
};

export default function AsesorConfiguracionPage() {
  const [asesoria, setAsesoria] = useState<Asesoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [nombre, setNombre] = useState("");
  const [cif, setCif] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  // Widget config - desktop & mobile
  type WidgetItem = { id: string; visible: boolean; order: number };
  const [widgetConfig, setWidgetConfig] = useState<WidgetItem[]>([]);
  const [widgetConfigMobile, setWidgetConfigMobile] = useState<WidgetItem[]>([]);
  const [activeWidgetTab, setActiveWidgetTab] = useState<"desktop" | "mobile">("desktop");
  const [savingWidgets, setSavingWidgets] = useState(false);

  const currentWidgetConfig = activeWidgetTab === "desktop" ? widgetConfig : widgetConfigMobile;
  const setCurrentWidgetConfig = activeWidgetTab === "desktop" ? setWidgetConfig : setWidgetConfigMobile;

  useEffect(() => {
    loadConfig();
    loadWidgets();
  }, []);

  function mergeWidgets(saved: WidgetItem[]): WidgetItem[] {
    const savedIds = new Set(saved.map((w) => w.id));
    const newWidgets = ALL_ASESOR_DASHBOARD_WIDGETS
      .filter((wd) => !savedIds.has(wd.id))
      .map((wd, i) => ({ id: wd.id, visible: true, order: saved.length + i }));
    return [...saved, ...newWidgets];
  }

  async function loadWidgets() {
    try {
      const res = await authenticatedFetch("/asesor/configuracion/widgets");
      if (res.ok) {
        const json = await res.json();
        const savedDesktop: WidgetItem[] = json.widgets || [];
        const savedMobile: WidgetItem[] = json.widgets_mobile || [];
        setWidgetConfig(mergeWidgets(savedDesktop));
        setWidgetConfigMobile(savedMobile.length > 0 ? mergeWidgets(savedMobile) : mergeWidgets(savedDesktop));
      } else {
        const defaults = ALL_ASESOR_DASHBOARD_WIDGETS.map((wd, i) => ({ id: wd.id, visible: true, order: i }));
        setWidgetConfig(defaults);
        setWidgetConfigMobile([...defaults]);
      }
    } catch {
      const defaults = ALL_ASESOR_DASHBOARD_WIDGETS.map((wd, i) => ({ id: wd.id, visible: true, order: i }));
      setWidgetConfig(defaults);
      setWidgetConfigMobile([...defaults]);
    }
  }

  async function toggleWidget(widgetId: string) {
    const source = activeWidgetTab === "desktop" ? widgetConfig : widgetConfigMobile;
    const updated = source.map((w) =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    if (activeWidgetTab === "desktop") {
      setWidgetConfig(updated);
    } else {
      setWidgetConfigMobile(updated);
    }

    // Auto-save
    setSavingWidgets(true);
    try {
      const body = activeWidgetTab === "desktop"
        ? { widgets: updated }
        : { widgets_mobile: updated };
      await authenticatedFetch("/asesor/configuracion/widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // revert on error
      if (activeWidgetTab === "desktop") {
        setWidgetConfig(source);
      } else {
        setWidgetConfigMobile(source);
      }
    } finally {
      setSavingWidgets(false);
    }
  }

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/asesor/configuracion");
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        setAsesoria(d);
        setNombre(d.nombre || "");
        setCif(d.cif || "");
        setEmailContacto(d.email_contacto || "");
        setTelefono(d.telefono || "");
        setDireccion(d.direccion || "");
      }
    } catch {
      setError("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await authenticatedFetch("/asesor/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          cif: cif.trim() || null,
          email_contacto: emailContacto.trim() || null,
          telefono: telefono.trim() || null,
          direccion: direccion.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error guardando");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Datos de tu asesoria y equipo
        </p>
      </div>

      {/* Plan info */}
      {asesoria && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown size={16} className="text-yellow-500" />
              Plan actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={asesoria.plan === "pro" ? "default" : "secondary"} className="uppercase text-xs">
                  {asesoria.plan || "free"}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {asesoria.clientes_activos} / {asesoria.max_clientes} clientes activos
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Registrado el{" "}
                {new Date(asesoria.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 size={16} />
            Datos de la asesoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cif">CIF</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="cif"
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                  className="pl-9 uppercase"
                  maxLength={9}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email de contacto</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={emailContacto}
                  onChange={(e) => setEmailContacto(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefono">Telefono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="direccion">Direccion</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving || !nombre.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Guardar cambios
                  </>
                )}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 size={14} />
                  Guardado
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dashboard widgets config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LayoutDashboard size={16} />
            Secciones del Dashboard
            {savingWidgets && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop / Mobile tabs */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveWidgetTab("desktop")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeWidgetTab === "desktop"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Escritorio
            </button>
            <button
              onClick={() => setActiveWidgetTab("mobile")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeWidgetTab === "mobile"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Movil PWA
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Activa o desactiva las secciones que quieres ver en tu dashboard ({activeWidgetTab === "desktop" ? "escritorio" : "movil"}).
          </p>
          <div className="space-y-3">
            {ALL_ASESOR_DASHBOARD_WIDGETS.map((wd) => {
              const config = currentWidgetConfig.find((w) => w.id === wd.id);
              const isVisible = config ? config.visible : true;
              const Icon = wd.icon;
              return (
                <div
                  key={wd.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isVisible ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon size={16} className={isVisible ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${!isVisible ? "text-muted-foreground" : ""}`}>
                        {wd.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{wd.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => toggleWidget(wd.id)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team members */}
      {asesoria && asesoria.miembros.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users size={16} />
              Equipo ({asesoria.miembros.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {asesoria.miembros.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {m.nombre?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.nombre}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {m.rol_interno === "admin_asesoria" ? "Admin" : "Asesor"}
                    </Badge>
                    {!m.activo && (
                      <Badge variant="destructive" className="text-[10px]">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
