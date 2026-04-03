"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

type Titular = {
  id: string;
  empresa_id: string;
  employee_id: string | null;
  nombre: string;
  nif: string | null;
  porcentaje_participacion: number;
  es_administrador: boolean;
  regimen_ss: "autonomo" | "general" | "sin_regimen";
  fecha_alta_ss: string | null;
  fecha_baja_ss: string | null;
  activo: boolean;
  notas: string | null;
  created_at: string;
};

type TitularForm = {
  nombre: string;
  nif: string;
  porcentaje_participacion: number;
  es_administrador: boolean;
  regimen_ss: "autonomo" | "general" | "sin_regimen";
  fecha_alta_ss: string;
  fecha_baja_ss: string;
  notas: string;
};

const EMPTY_FORM: TitularForm = {
  nombre: "",
  nif: "",
  porcentaje_participacion: 100,
  es_administrador: false,
  regimen_ss: "autonomo",
  fecha_alta_ss: "",
  fecha_baja_ss: "",
  notas: "",
};

const REGIMEN_LABELS: Record<string, { label: string; color: string }> = {
  autonomo: { label: "Autonomo", color: "bg-orange-100 text-orange-800 border-orange-200" },
  general: { label: "Regimen General", color: "bg-blue-100 text-blue-800 border-blue-200" },
  sin_regimen: { label: "Sin regimen", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

interface Props {
  empresaId: string;
  /** Base path for API calls: "/admin" or "/asesor/clientes/{empresa_id}" */
  basePath: string;
}

export default function TitularesManager({ empresaId, basePath }: Props) {
  const [titulares, setTitulares] = useState<Titular[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TitularForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${basePath}/titulares`);
      setTitulares((res.data.titulares || []).filter((t: Titular) => t.activo));
    } catch (err: any) {
      showError("Error cargando titulares");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(t: Titular) {
    setEditingId(t.id);
    setForm({
      nombre: t.nombre,
      nif: t.nif || "",
      porcentaje_participacion: t.porcentaje_participacion,
      es_administrador: t.es_administrador,
      regimen_ss: t.regimen_ss,
      fecha_alta_ss: t.fecha_alta_ss?.slice(0, 10) || "",
      fecha_baja_ss: t.fecha_baja_ss?.slice(0, 10) || "",
      notas: t.notas || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      showError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`${basePath}/titulares/${editingId}`, form);
        showSuccess("Titular actualizado");
      } else {
        await api.post(`${basePath}/titulares`, form);
        showSuccess("Titular creado");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Desactivar este titular?")) return;
    try {
      await api.delete(`${basePath}/titulares/${id}`);
      showSuccess("Titular desactivado");
      load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al eliminar");
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users size={18} />
          Titulares / Socios
        </CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus size={14} />
          Anadir titular
        </Button>
      </CardHeader>
      <CardContent>
        {titulares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay titulares registrados. Anade el primer titular o socio.
          </p>
        ) : (
          <div className="space-y-2">
            {titulares.map((t) => {
              const reg = REGIMEN_LABELS[t.regimen_ss] || REGIMEN_LABELS.sin_regimen;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t.nombre}</span>
                      {t.nif && (
                        <span className="text-xs text-muted-foreground">
                          ({t.nif})
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${reg.color}`}>
                        {reg.label}
                      </Badge>
                      {t.es_administrador && (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                          Administrador
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{t.porcentaje_participacion}% participacion</span>
                      {t.fecha_alta_ss && (
                        <span>Alta SS: {new Date(t.fecha_alta_ss).toLocaleDateString("es-ES")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar titular" : "Nuevo titular"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">NIF</label>
              <Input
                value={form.nif}
                onChange={(e) => setForm({ ...form, nif: e.target.value })}
                placeholder="12345678A"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Regimen Seguridad Social</label>
              <Select
                value={form.regimen_ss}
                onValueChange={(v) =>
                  setForm({ ...form, regimen_ss: v as TitularForm["regimen_ss"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autonomo">Autonomo (RETA)</SelectItem>
                  <SelectItem value="general">Regimen General (Nomina)</SelectItem>
                  <SelectItem value="sin_regimen">Sin regimen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">% Participacion</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.porcentaje_participacion}
                  onChange={(e) =>
                    setForm({ ...form, porcentaje_participacion: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.es_administrador}
                    onChange={(e) =>
                      setForm({ ...form, es_administrador: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  Es administrador
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Fecha alta SS</label>
                <Input
                  type="date"
                  value={form.fecha_alta_ss}
                  onChange={(e) => setForm({ ...form, fecha_alta_ss: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha baja SS</label>
                <Input
                  type="date"
                  value={form.fecha_baja_ss}
                  onChange={(e) => setForm({ ...form, fecha_baja_ss: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notas</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear titular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
