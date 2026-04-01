"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Settings, Save, Loader2, Plus, X, Search } from "lucide-react";

const SECTOR_LABELS: Record<string, string> = {
    servicios_profesionales: "Servicios Profesionales",
    comercio_minorista: "Comercio Minorista",
    hosteleria: "Hostelería",
    construccion: "Construcción",
    transporte: "Transporte",
    tecnologia: "Tecnología / IT",
    sanitario: "Sanitario",
    formacion: "Formación / Educación",
};

interface Epigrafe {
    codigo: string;
    descripcion: string;
    custom?: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function FiscalAlertConfigDrawer({ open, onClose, onSaved }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sectors, setSectors] = useState<string[]>([]);
    const [epigrafes, setEpigrafes] = useState<Record<string, Epigrafe[]>>({});

    const [sector, setSector] = useState("default");
    const [iaeCode, setIaeCode] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [gastosRatio, setGastosRatio] = useState("");
    const [ivaRatio, setIvaRatio] = useState("");
    const [cashPct, setCashPct] = useState("");
    const [epigrafeBuscar, setEpigrafeBuscar] = useState("");
    const [showAddEpigrafe, setShowAddEpigrafe] = useState(false);
    const [newEpCodigo, setNewEpCodigo] = useState("");
    const [newEpDescripcion, setNewEpDescripcion] = useState("");

    useEffect(() => {
        if (!open) return;
        loadConfig();
    }, [open]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch("/api/admin/fiscal/alert-config");
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    const d = json.data;
                    setSectors(json.sectors || []);
                    setEpigrafes(json.epigrafes || {});
                    setSector(d.sector || "default");
                    setIaeCode(d.iae_code || "");
                    setEnabled(d.enabled !== false);
                    setGastosRatio(d.thresholds.gastos_ingresos_ratio_max ? String(Math.round(d.thresholds.gastos_ingresos_ratio_max * 100)) : "");
                    setIvaRatio(d.thresholds.iva_deducible_devengado_ratio_max ? String(d.thresholds.iva_deducible_devengado_ratio_max) : "");
                    setCashPct(d.thresholds.cash_payment_pct_max ? String(Math.round(d.thresholds.cash_payment_pct_max * 100)) : "");
                }
            }
        } catch (err) {
            console.error("Error loading alert config:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const thresholds: Record<string, number> = {};
            if (gastosRatio) thresholds.gastos_ingresos_ratio_max = parseFloat(gastosRatio) / 100;
            if (ivaRatio) thresholds.iva_deducible_devengado_ratio_max = parseFloat(ivaRatio);
            if (cashPct) thresholds.cash_payment_pct_max = parseFloat(cashPct) / 100;

            const res = await authenticatedFetch("/api/admin/fiscal/alert-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sector,
                    iae_code: iaeCode || null,
                    enabled,
                    thresholds: Object.keys(thresholds).length > 0 ? thresholds : undefined,
                }),
            });

            if (res.ok) {
                onSaved?.();
                onClose();
            }
        } catch (err) {
            console.error("Error saving alert config:", err);
        } finally {
            setSaving(false);
        }
    };

    const sectorEpigrafes = epigrafes[sector] || [];
    const filteredEpigrafes = epigrafeBuscar
        ? sectorEpigrafes.filter(e =>
            e.codigo.toLowerCase().includes(epigrafeBuscar.toLowerCase()) ||
            e.descripcion.toLowerCase().includes(epigrafeBuscar.toLowerCase())
        )
        : sectorEpigrafes;

    const handleAddEpigrafe = async () => {
        if (!newEpCodigo.trim() || !newEpDescripcion.trim()) return;
        try {
            const res = await authenticatedFetch("/api/admin/fiscal/epigrafes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sector, codigo: newEpCodigo.trim(), descripcion: newEpDescripcion.trim() }),
            });
            if (res.ok) {
                setNewEpCodigo("");
                setNewEpDescripcion("");
                setShowAddEpigrafe(false);
                loadConfig();
            }
        } catch (err) {
            console.error("Error adding epigrafe:", err);
        }
    };

    const handleDeleteEpigrafe = async (codigo: string) => {
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/epigrafes/${encodeURIComponent(codigo)}?sector=${sector}`, {
                method: "DELETE",
            });
            if (res.ok) loadConfig();
        } catch (err) {
            console.error("Error deleting epigrafe:", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" /> Configuración de Alertas Fiscales
                    </DialogTitle>
                    <DialogDescription>
                        Configura tu sector y umbrales de alerta. Los valores por defecto se basan en medias sectoriales de la AEAT.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-5 py-2">
                        {/* Enabled toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Alertas activadas</Label>
                                <p className="text-xs text-muted-foreground">Recibir notificaciones semanales</p>
                            </div>
                            <Switch checked={enabled} onCheckedChange={setEnabled} />
                        </div>

                        {/* Sector */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">Sector de actividad</Label>
                            <Select value={sector} onValueChange={(v) => { setSector(v); setIaeCode(""); setEpigrafeBuscar(""); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sector" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sectors.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {SECTOR_LABELS[s] || s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Los umbrales se ajustarán automáticamente según el sector seleccionado.
                            </p>
                        </div>

                        {/* Epígrafe IAE */}
                        {sector && sector !== "default" && (
                            <div className="space-y-2">
                                <Label className="text-sm">Epígrafe IAE</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={epigrafeBuscar}
                                        onChange={e => setEpigrafeBuscar(e.target.value)}
                                        placeholder="Buscar epígrafe por código o descripción..."
                                        className="pl-8 text-xs"
                                    />
                                </div>
                                <div className="border rounded-lg max-h-36 overflow-y-auto">
                                    {filteredEpigrafes.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-3">No se encontraron epígrafes</p>
                                    ) : (
                                        filteredEpigrafes.map(ep => (
                                            <div
                                                key={ep.codigo}
                                                className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 border-b last:border-0 ${
                                                    iaeCode === ep.codigo ? "bg-blue-50 text-blue-700 font-medium" : ""
                                                }`}
                                                onClick={() => setIaeCode(ep.codigo)}
                                            >
                                                <span>
                                                    <span className="font-mono font-semibold">{ep.codigo}</span>
                                                    {" — "}
                                                    {ep.descripcion}
                                                </span>
                                                {ep.custom && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteEpigrafe(ep.codigo); }}
                                                        className="text-red-400 hover:text-red-600 ml-2 shrink-0"
                                                        title="Eliminar epígrafe personalizado"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                                {iaeCode && (
                                    <p className="text-xs text-blue-600 font-medium">
                                        Seleccionado: {iaeCode} — {sectorEpigrafes.find(e => e.codigo === iaeCode)?.descripcion || iaeCode}
                                    </p>
                                )}

                                {/* Añadir epígrafe personalizado */}
                                {!showAddEpigrafe ? (
                                    <button
                                        onClick={() => setShowAddEpigrafe(true)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Añadir epígrafe al sector
                                    </button>
                                ) : (
                                    <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
                                        <p className="text-xs font-semibold text-slate-600">Nuevo epígrafe para {SECTOR_LABELS[sector]}</p>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newEpCodigo}
                                                onChange={e => setNewEpCodigo(e.target.value)}
                                                placeholder="Código"
                                                className="w-24 text-xs"
                                                maxLength={20}
                                            />
                                            <Input
                                                value={newEpDescripcion}
                                                onChange={e => setNewEpDescripcion(e.target.value)}
                                                placeholder="Descripción"
                                                className="flex-1 text-xs"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="h-7 text-xs" onClick={handleAddEpigrafe} disabled={!newEpCodigo.trim() || !newEpDescripcion.trim()}>
                                                <Plus className="h-3 w-3 mr-1" /> Añadir
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddEpigrafe(false); setNewEpCodigo(""); setNewEpDescripcion(""); }}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Custom thresholds */}
                        <div className="border-t pt-4 space-y-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Umbrales personalizados
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Gastos/Ingresos máx. (%)</Label>
                                    <Input
                                        type="number"
                                        value={gastosRatio}
                                        onChange={e => setGastosRatio(e.target.value)}
                                        placeholder="Ej: 70"
                                        min={10} max={100}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">IVA Deduc./Deveng. máx. (x)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={ivaRatio}
                                        onChange={e => setIvaRatio(e.target.value)}
                                        placeholder="Ej: 1.3"
                                        min={0.1} max={5}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">Pagos en efectivo máx. (%)</Label>
                                    <Input
                                        type="number"
                                        value={cashPct}
                                        onChange={e => setCashPct(e.target.value)}
                                        placeholder="Ej: 25"
                                        min={0} max={100}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Deja en blanco para usar los valores por defecto del sector.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
