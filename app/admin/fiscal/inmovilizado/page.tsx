"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";

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

export default function InmovilizadoPage() {
  const [items, setItems] = useState<Inmovilizado[]>([]);
  const [amortizacion, setAmortizacion] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Inmovilizado> | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resList, resAmort] = await Promise.all([
        authenticatedFetch("/api/admin/inmovilizado/"),
        authenticatedFetch(`/api/admin/inmovilizado/amortizacion/${year}`),
      ]);
      const list = await resList.json();
      const amort = await resAmort.json();
      if (list.success) setItems(list.items);
      if (amort.success) setAmortizacion(amort);
    } catch {
      toast.error("Error cargando inmovilizado");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
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
  };

  const openEdit = (item: Inmovilizado) => {
    setEditing({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.descripcion || !editing.fecha_alta || !editing.valor_adquisicion || !editing.grupo) {
      toast.error("Faltan campos requeridos");
      return;
    }
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate ? `/api/admin/inmovilizado/${editing.id}` : "/api/admin/inmovilizado/";
      const method = isUpdate ? "PUT" : "POST";
      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isUpdate ? "Bien actualizado" : "Bien creado");
        setDialogOpen(false);
        loadData();
      } else {
        toast.error(json.error || "Error guardando");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este bien? Se conserva el histórico (soft delete).")) return;
    try {
      const res = await authenticatedFetch(`/api/admin/inmovilizado/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Eliminado");
        loadData();
      } else {
        toast.error(json.error || "Error eliminando");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const setGrupo = (grupo: string) => {
    const g = GRUPOS.find((x) => x.value === grupo);
    setEditing({ ...editing, grupo, coef_amortizacion_pct: g?.coefDefecto });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inmovilizado</h1>
          <p className="text-muted-foreground text-sm">Bienes afectos a la actividad y amortización lineal (Art. 28 RIRPF, ED simplificada).</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuevo bien</Button>
        </div>
      </div>

      {amortizacion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Amortización del ejercicio {year}
            </CardTitle>
            <CardDescription>Total dotación lineal acumulada — gasto deducible en modelos 130 e IRPF anual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(amortizacion.total || 0)}</div>
            {amortizacion.detalle && amortizacion.detalle.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                {amortizacion.detalle.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{d.descripcion}</span>
                    <span>{formatCurrency(d.amortizacion)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bienes registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay bienes registrados. Crea el primero con el botón de arriba.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Coef.</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead>Baja</TableHead>
                  <TableHead className="text-right">Adquisición</TableHead>
                  <TableHead className="text-right">Residual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.descripcion}</TableCell>
                    <TableCell>{GRUPOS.find((g) => g.value === it.grupo)?.label || it.grupo}</TableCell>
                    <TableCell className="text-right">{it.coef_amortizacion_pct}%</TableCell>
                    <TableCell>{it.fecha_alta}</TableCell>
                    <TableCell>{it.fecha_baja || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.valor_adquisicion)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.valor_residual)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(it.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar bien" : "Nuevo bien"}</DialogTitle>
            <DialogDescription>El coeficiente predeterminado proviene de la tabla simplificada (Art. 28 RIRPF).</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción *</Label>
                <Input value={editing.descripcion || ""} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha alta *</Label>
                <Input type="date" value={editing.fecha_alta || ""} onChange={(e) => setEditing({ ...editing, fecha_alta: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha baja (si aplica)</Label>
                <Input type="date" value={editing.fecha_baja || ""} onChange={(e) => setEditing({ ...editing, fecha_baja: e.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>Grupo *</Label>
                <Select value={editing.grupo || "mobiliario"} onValueChange={setGrupo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRUPOS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label} ({g.coefDefecto}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coef. amortización %</Label>
                <Input type="number" min="0" max="100" step="0.01"
                  value={editing.coef_amortizacion_pct || 0}
                  onChange={(e) => setEditing({ ...editing, coef_amortizacion_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor adquisición *</Label>
                <Input type="number" min="0" step="0.01" value={editing.valor_adquisicion || 0}
                  onChange={(e) => setEditing({ ...editing, valor_adquisicion: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor residual</Label>
                <Input type="number" min="0" step="0.01" value={editing.valor_residual || 0}
                  onChange={(e) => setEditing({ ...editing, valor_residual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notas</Label>
                <Input value={editing.notas || ""} onChange={(e) => setEditing({ ...editing, notas: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
