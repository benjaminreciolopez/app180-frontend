"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Check, ChevronRight } from "lucide-react";

interface Nomina {
  id: string;
  empleado_id: string;
  anio: number;
  mes: number;
  bruto: string | number;
  seguridad_social_empleado: string | number;
  irpf_retencion: string | number;
  liquido: string | number;
  estado: string;
  nombre_empleado?: string;
  nombre_empresa?: string;
}

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const num = (v: string | number) => parseFloat(String(v)) || 0;

export default function ClienteNominasPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [empleados, setEmpleados] = useState<{ id: string; nombre: string }[]>([]);

  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [empleadoId, setEmpleadoId] = useState("todos");

  useEffect(() => {
    loadNominas();
    loadEmpleados();
  }, [anio, mes, empresaId]);

  async function loadEmpleados() {
    try {
      const res = await api.get(`/asesor/nominas/empleados?empresa_id=${empresaId}`);
      setEmpleados(res.data?.data || []);
    } catch {
      setEmpleados([]);
    }
  }

  async function loadNominas() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        anio: String(anio),
        mes: String(mes),
        empresa_id: empresaId,
      });
      const res = await api.get(`/asesor/nominas?${params}`);
      setNominas(res.data?.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar nóminas");
    } finally {
      setLoading(false);
    }
  }

  async function handleAprobar(id: string) {
    try {
      await api.post(`/asesor/nominas/${id}/aprobar`);
      showSuccess("Nómina aprobada");
      loadNominas();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al aprobar");
    }
  }

  const filtered = useMemo(() => {
    if (empleadoId === "todos") return nominas;
    return nominas.filter((n) => n.empleado_id === empleadoId);
  }, [nominas, empleadoId]);

  const totalBruto = filtered.reduce((s, n) => s + num(n.bruto), 0);
  const totalNeto = filtered.reduce((s, n) => s + num(n.liquido), 0);

  if (loading && nominas.length === 0) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Nóminas del cliente</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} nóminas — {formatCurrency(totalBruto)} bruto / {formatCurrency(totalNeto)} neto
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push("/asesor/nominas/generar")}
        >
          <Plus className="size-4 mr-1" /> Generar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={empleadoId}
          onChange={(e) => setEmpleadoId(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="todos">Todos los empleados</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>

        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {meses.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay nóminas para este periodo</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="divide-y">
              {filtered.map((n) => (
                <div key={n.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{n.nombre_empleado || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {meses[n.mes - 1]} {n.anio}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(num(n.liquido))}</p>
                      <p className="text-[10px] text-muted-foreground">Bruto: {formatCurrency(num(n.bruto))}</p>
                    </div>
                    <Badge variant={n.estado === "aprobada" ? "default" : "secondary"} className="text-xs capitalize">
                      {n.estado || "borrador"}
                    </Badge>
                    <div className="flex gap-1">
                      {n.estado !== "aprobada" && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleAprobar(n.id)}>
                          <Check className="size-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push(`/asesor/nominas/${n.id}`)}>
                        <ChevronRight className="size-3" />
                      </Button>
                    </div>
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
