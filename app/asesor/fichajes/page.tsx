"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type TipoFichaje = "entrada" | "salida" | "descanso_inicio" | "descanso_fin";

interface FichajeAPI {
  id: string;
  jornada_id: string | null;
  nombre_empleado: string;
  fecha: string;
  tipo: TipoFichaje;
  sospechoso?: boolean;
  nota?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
}

interface JornadaUI {
  jornada_id: string;
  empleado: string;
  fechaDia: string;
  entrada?: string;
  salida?: string;
  estado: "OK" | "Sospechoso";
}

function ymdLocal(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fechaDiaLocal(iso: string) {
  const d = new Date(iso);
  return ymdLocal(d);
}

const tipoLabels: Record<TipoFichaje, string> = {
  entrada: "Entrada",
  salida: "Salida",
  descanso_inicio: "Inicio descanso",
  descanso_fin: "Fin descanso",
};

export default function AsesorFichajesPage() {
  const [loading, setLoading] = useState(true);
  const [fichajes, setFichajes] = useState<FichajeAPI[]>([]);
  const [filtroFecha, setFiltroFecha] = useState(ymdLocal());
  const [expandedJornada, setExpandedJornada] = useState<string | null>(null);

  async function loadFichajes() {
    try {
      setLoading(true);
      const res = await api.get("/fichajes");
      setFichajes(res.data || []);
    } catch (err: any) {
      showError(err.response?.data?.error || "Error al cargar fichajes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFichajes();
  }, []);

  const fichajesFiltrados = useMemo(() => {
    return fichajes.filter((f) => fechaDiaLocal(f.fecha) === filtroFecha);
  }, [fichajes, filtroFecha]);

  // Agrupar por jornada_id
  const jornadas = useMemo(() => {
    const map = new Map<string, FichajeAPI[]>();
    fichajesFiltrados.forEach((f) => {
      const key = f.jornada_id || f.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    });

    const result: JornadaUI[] = [];
    map.forEach((items, jid) => {
      const entrada = items.find((i) => i.tipo === "entrada");
      const salida = items.find((i) => i.tipo === "salida");
      const sosp = items.some((i) => i.sospechoso);
      result.push({
        jornada_id: jid,
        empleado: items[0].nombre_empleado,
        fechaDia: filtroFecha,
        entrada: entrada?.fecha,
        salida: salida?.fecha,
        estado: sosp ? "Sospechoso" : "OK",
      });
    });
    return result;
  }, [fichajesFiltrados, filtroFecha]);

  if (loading) return <LoadingSpinner fullPage />;

  const totalHoy = fichajesFiltrados.length;
  const sosp = fichajesFiltrados.filter((f) => f.sospechoso).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fichajes</h1>
          <p className="text-sm text-muted-foreground">
            Control horario de los empleados de tu asesoria
          </p>
        </div>
      </div>

      {/* Filtro de fecha */}
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-muted-foreground" />
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltroFecha(ymdLocal())}
        >
          Hoy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros hoy</p>
                <p className="text-2xl font-bold">{totalHoy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jornadas</p>
                <p className="text-2xl font-bold">{jornadas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sospechosos</p>
                <p className="text-2xl font-bold">{sosp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jornadas */}
      {jornadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No hay fichajes para esta fecha
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornadas del dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {jornadas.map((j) => {
                const isExpanded = expandedJornada === j.jornada_id;
                const movimientos = fichajesFiltrados.filter(
                  (f) => (f.jornada_id || f.id) === j.jornada_id
                );

                return (
                  <div key={j.jornada_id} className="py-3 first:pt-0 last:pb-0">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedJornada(isExpanded ? null : j.jornada_id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {j.empleado.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{j.empleado}</p>
                          <p className="text-xs text-muted-foreground">
                            {j.entrada
                              ? new Date(j.entrada).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--:--"}{" "}
                            →{" "}
                            {j.salida
                              ? new Date(j.salida).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--:--"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            j.estado === "OK" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {j.estado}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-11 space-y-1">
                        {movimientos.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="font-mono">
                              {new Date(m.fecha).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {tipoLabels[m.tipo]}
                            </Badge>
                            {m.direccion && (
                              <span className="truncate max-w-[200px]">
                                {m.direccion}
                              </span>
                            )}
                            {m.sospechoso && (
                              <AlertTriangle
                                size={12}
                                className="text-orange-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
