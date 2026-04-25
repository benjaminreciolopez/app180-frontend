"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UsersRound, AlertTriangle } from "lucide-react";

interface Titular {
  id: string;
  empresa_id: string;
  employee_id: string | null;
  employee_nombre?: string | null;
  nombre: string;
  nif: string | null;
  porcentaje_participacion: number;
  es_administrador: boolean;
  regimen_ss: "autonomo" | "general" | "sin_regimen";
  fecha_alta_ss: string | null;
  fecha_baja_ss: string | null;
  activo: boolean;
  notas: string | null;
}

const REGIMENES = [
  { value: "autonomo", label: "Autónomo (RETA)", color: "bg-blue-100 text-blue-700" },
  { value: "general", label: "Régimen General", color: "bg-green-100 text-green-700" },
  { value: "sin_regimen", label: "Sin régimen SS", color: "bg-gray-100 text-gray-700" },
];

const empty: Partial<Titular> = {
  nombre: "",
  nif: "",
  porcentaje_participacion: 100,
  es_administrador: false,
  regimen_ss: "autonomo",
  fecha_alta_ss: "",
  fecha_baja_ss: "",
  notas: "",
};

export default function AsesorTitularesPage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;
  const [items, setItems] = useState<Titular[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Titular> | null>(null);

  const baseUrl = `/api/asesor/clientes/${empresaId}/titulares`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(baseUrl);
      const json = await res.json();
      setItems((json.titulares || []).filter((t: Titular) => t.activo !== false));
    } catch {
      toast.error("Error cargando titulares");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing({ ...empty });
    setDialogOpen(true);
  };

  const openEdit = (t: Titular) => {
    setEditing({ ...t, fecha_alta_ss: t.fecha_alta_ss || "", fecha_baja_ss: t.fecha_baja_ss || "", notas: t.notas || "", nif: t.nif || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate ? `${baseUrl}/${editing.id}` : baseUrl;
      const method = isUpdate ? "PUT" : "POST";
      const body = {
        ...editing,
        fecha_alta_ss: editing.fecha_alta_ss || null,
        fecha_baja_ss: editing.fecha_baja_ss || null,
        nif: editing.nif || null,
        notas: editing.notas || null,
      };
      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.titular) {
        toast.success(isUpdate ? "Titular actualizado" : "Titular creado");
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
    if (!confirm("¿Eliminar este titular del cliente? (soft delete)")) return;
    try {
      const res = await authenticatedFetch(`${baseUrl}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        toast.success("Titular eliminado");
        loadData();
      } else {
        toast.error(json.error || "Error eliminando");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const totalParticipacion = items.reduce((sum, t) => sum + (Number(t.porcentaje_participacion) || 0), 0);
  const sumaInvalida = Math.abs(totalParticipacion - 100) > 0.01 && items.length > 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UsersRound className="h-5 w-5" /> Titulares y socios del cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestiona múltiples titulares con regímenes SS distintos. Cada titular puede tener su propio perfil RETA.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuevo titular</Button>
      </div>

      {sumaInvalida && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>La suma de participaciones es {totalParticipacion}%. Debería sumar 100%.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Titulares activos ({items.length})</CardTitle>
          <CardDescription>Marca cada persona con su régimen SS para calcular RETA por individuo.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay titulares registrados para este cliente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Régimen SS</TableHead>
                  <TableHead className="text-right">% Particip.</TableHead>
                  <TableHead className="text-center">Admin.</TableHead>
                  <TableHead>Alta SS</TableHead>
                  <TableHead>Baja SS</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => {
                  const reg = REGIMENES.find((r) => r.value === t.regimen_ss);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{t.nif || "—"}</TableCell>
                      <TableCell>
                        <Badge className={reg?.color || ""}>{reg?.label || t.regimen_ss}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(t.porcentaje_participacion).toFixed(2)}%</TableCell>
                      <TableCell className="text-center">{t.es_administrador ? "Sí" : "—"}</TableCell>
                      <TableCell className="text-xs">{t.fecha_alta_ss || "—"}</TableCell>
                      <TableCell className="text-xs">{t.fecha_baja_ss || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar titular" : "Nuevo titular"}</DialogTitle>
            <DialogDescription>El régimen SS determina si el titular cotiza por RETA o régimen general.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre completo *</Label>
                <Input value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>NIF / DNI</Label>
                <Input value={editing.nif || ""} onChange={(e) => setEditing({ ...editing, nif: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Régimen Seguridad Social *</Label>
                <Select value={editing.regimen_ss || "autonomo"} onValueChange={(v) => setEditing({ ...editing, regimen_ss: v as Titular["regimen_ss"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIMENES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>% Participación</Label>
                <Input type="number" min="0" max="100" step="0.01"
                  value={editing.porcentaje_participacion ?? 100}
                  onChange={(e) => setEditing({ ...editing, porcentaje_participacion: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Administrador</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={!!editing.es_administrador} onCheckedChange={(v) => setEditing({ ...editing, es_administrador: v })} />
                  <span className="text-sm text-muted-foreground">{editing.es_administrador ? "Sí" : "No"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha alta SS</Label>
                <Input type="date" value={editing.fecha_alta_ss || ""} onChange={(e) => setEditing({ ...editing, fecha_alta_ss: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha baja SS</Label>
                <Input type="date" value={editing.fecha_baja_ss || ""} onChange={(e) => setEditing({ ...editing, fecha_baja_ss: e.target.value })} />
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
