"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Boxes } from "lucide-react";

const GRUPOS = [
  { value: "edificios", label: "Edificios", coefDefecto: 3 },
  { value: "instalaciones", label: "Instalaciones", coefDefecto: 10 },
  { value: "maquinaria", label: "Maquinaria", coefDefecto: 12 },
  { value: "mobiliario", label: "Mobiliario", coefDefecto: 10 },
  { value: "equipos_informaticos", label: "Equipos informáticos", coefDefecto: 26 },
  { value: "vehiculos", label: "Vehículos", coefDefecto: 16 },
  { value: "utiles_herramientas", label: "Útiles y herramientas", coefDefecto: 30 },
  { value: "otros", label: "Otros", coefDefecto: 10 },
];

interface Inmovilizado {
  id: string;
  descripcion: string;
  fecha_alta: string;
  fecha_baja?: string | null;
  valor_adquisicion: number;
  valor_residual: number;
  grupo: string;
  coef_amortizacion_pct: number;
  metodo: string;
  notas?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AsesorClienteInmovilizadoPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [items, setItems] = useState<Inmovilizado[]>([]);
  const [amortizacion, setAmortizacion] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Inmovilizado> | null>(null);
  const [saving, setSaving] = useState(false);

  const baseUrl = `/asesor/clientes/${empresaId}/inmovilizado`;

  useEffect(() => {
    loadData();
  }, [year, empresaId]);

  async function loadData() {
    setLoading(true);
    try {
      const [resList, resAmort] = await Promise.all([
        authenticatedFetch(baseUrl),
        authenticatedFetch(`${baseUrl}/amortizacion/${year}`),
      ]);
      const list = await resList.json();
      const amort = await resAmort.json();
      if (list.success) setItems(list.items || []);
      if (amort.success) setAmortizacion(amort);
    } catch {
      toast.error("Error cargando inmovilizado");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing({
      descripcion: "",
      fecha_alta: today(),
      valor_adquisicion: 0,
      valor_residual: 0,
      grupo: "mobiliario",
      coef_amortizacion_pct: GRUPOS.find((g) => g.value === "mobiliario")?.coefDefecto,
      metodo: "lineal",
      notas: "",
    });
    setDialogOpen(true);
  }

  function openEdit(item: Inmovilizado) {
    setEditing({ ...item });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.descripcion?.trim()) {
      toast.error("Descripción obligatoria");
      return;
    }
    if (!editing.fecha_alta) {
      toast.error("Fecha de alta obligatoria");
      return;
    }
    if (!editing.valor_adquisicion || editing.valor_adquisicion <= 0) {
      toast.error("Valor de adquisición obligatorio");
      return;
    }
    setSaving(true);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate ? `${baseUrl}/${editing.id}` : baseUrl;
      const method = isUpdate ? "PUT" : "POST";
      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Error");
      toast.success(isUpdate ? "Bien actualizado" : "Bien dado de alta");
      setDialogOpen(false);
      setEditing(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error guardando inmovilizado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bien del inmovilizado?")) return;
    try {
      const res = await authenticatedFetch(`${baseUrl}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Error");
      toast.success("Bien eliminado");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error eliminando bien");
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6" />
            Inmovilizado
          </h1>
          <p className="text-sm text-muted-foreground">
            Bienes amortizables del cliente. La amortización se calcula linealmente sobre el valor neto y entra como gasto deducible en modelo 130 e IRPF anual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((d) => {
                const y = (new Date().getFullYear() - d).toString();
                return <SelectItem key={y} value={y}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo bien
          </Button>
        </div>
      </div>

      {amortizacion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amortización del ejercicio {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Valor adquisición</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(amortizacion.totales?.valor_adquisicion_total || 0)}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-700">Amortización del año</p>
                <p className="text-lg font-bold mt-1 text-amber-900">{formatCurrency(amortizacion.totales?.amortizacion_ejercicio_total || 0)}</p>
              </div>
              <div className="rounded-lg border bg-red-50 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-red-700">Acumulada</p>
                <p className="text-lg font-bold mt-1 text-red-900">{formatCurrency(amortizacion.totales?.amortizacion_acumulada_total || 0)}</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700">Valor neto</p>
                <p className="text-lg font-bold mt-1 text-emerald-900">{formatCurrency(amortizacion.totales?.valor_neto_total || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bienes registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No hay bienes registrados. Pulsa "Nuevo bien" para añadir el primero.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Coef. %</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const grupo = GRUPOS.find((g) => g.value === item.grupo);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.descripcion}
                          {item.fecha_baja && (
                            <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              Baja: {item.fecha_baja}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{grupo?.label || item.grupo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.fecha_alta}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_adquisicion)}</TableCell>
                        <TableCell className="text-right">{Number(item.coef_amortizacion_pct).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} title="Eliminar" className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar bien" : "Nuevo bien"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Descripción *</Label>
                <Input
                  value={editing.descripcion || ""}
                  onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                  placeholder="Ej: Furgoneta Renault Master 2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fecha alta *</Label>
                  <Input
                    type="date"
                    value={editing.fecha_alta || ""}
                    onChange={(e) => setEditing({ ...editing, fecha_alta: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha baja (si aplica)</Label>
                  <Input
                    type="date"
                    value={editing.fecha_baja || ""}
                    onChange={(e) => setEditing({ ...editing, fecha_baja: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor adquisición *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.valor_adquisicion || ""}
                    onChange={(e) => setEditing({ ...editing, valor_adquisicion: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor residual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.valor_residual || ""}
                    onChange={(e) => setEditing({ ...editing, valor_residual: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Grupo</Label>
                  <Select
                    value={editing.grupo}
                    onValueChange={(v) => {
                      const def = GRUPOS.find((g) => g.value === v)?.coefDefecto || 10;
                      setEditing({ ...editing, grupo: v, coef_amortizacion_pct: def });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRUPOS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label} ({g.coefDefecto}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">% Amortización anual</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editing.coef_amortizacion_pct || ""}
                    onChange={(e) => setEditing({ ...editing, coef_amortizacion_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Input
                  value={editing.notas || ""}
                  onChange={(e) => setEditing({ ...editing, notas: e.target.value })}
                  placeholder="opcional"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : editing?.id ? "Guardar cambios" : "Crear bien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
