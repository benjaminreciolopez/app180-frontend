"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquareWarning, Check, X, ArrowLeft, Loader2 } from "lucide-react";

interface Correccion {
  id: string;
  fichaje_id: string | null;
  empleado_id: string;
  empleado_nombre: string;
  solicitado_por: string;
  tipo_correccion: string;
  datos_originales: any;
  datos_propuestos: any;
  motivo: string;
  estado: string;
  resuelto_por: string | null;
  resuelto_at: string | null;
  notas_resolucion: string | null;
  fichaje_fecha: string | null;
  fichaje_tipo: string | null;
  created_at: string;
}

export default function CorreccionesPage() {
  const [loading, setLoading] = useState(true);
  const [correcciones, setCorrecciones] = useState<Correccion[]>([]);
  const [filtro, setFiltro] = useState<string>("pendiente");
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [notas, setNotas] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/fichajes/admin/correcciones?estado=${filtro}`);
      setCorrecciones(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCorrecciones([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filtro]);

  async function resolver(id: string, accion: "aprobar" | "rechazar") {
    setResolviendo(id + accion);
    try {
      await api.put(`/fichajes/admin/correcciones/${id}`, {
        accion,
        notas_resolucion: notas || undefined,
      });
      showSuccess(accion === "aprobar" ? "Corrección aprobada, nuevo fichaje creado" : "Corrección rechazada");
      setNotas("");
      await load();
    } catch {
      showError("Error al resolver corrección");
    } finally {
      setResolviendo(null);
    }
  }

  const tipoLabel: Record<string, string> = {
    adicion: "Añadir fichaje",
    modificacion: "Modificar fichaje",
    eliminacion: "Anular fichaje",
  };

  const estadoBadge: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-800",
    aprobada: "bg-green-100 text-green-800",
    rechazada: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <a href="/admin/fichajes" className="p-2 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <h1 className="text-2xl font-bold">Correcciones de Fichajes</h1>
      </div>

      <div className="flex gap-2">
        {["pendiente", "aprobada", "rechazada", "todas"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-2 rounded text-sm font-medium ${
              filtro === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}s
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded" />)}
        </div>
      ) : correcciones.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="Sin correcciones"
          description={`No hay correcciones ${filtro === "todas" ? "" : filtro + "s"} para mostrar.`}
        />
      ) : (
        <div className="space-y-3">
          {correcciones.map((c) => (
            <div key={c.id} className="bg-white border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{c.empleado_nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[c.estado] || "bg-gray-100"}`}>
                      {c.estado}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {tipoLabel[c.tipo_correccion] || c.tipo_correccion}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{c.motivo}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Solicitado el {new Date(c.created_at).toLocaleString("es-ES")}
                    {c.fichaje_fecha && ` · Fichaje original: ${new Date(c.fichaje_fecha).toLocaleString("es-ES")} (${c.fichaje_tipo})`}
                  </p>
                </div>
              </div>

              {/* Datos propuestos */}
              {c.datos_propuestos && (
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Datos propuestos:</p>
                  <div className="flex gap-4 flex-wrap">
                    {c.datos_propuestos.tipo && <span>Tipo: <b>{c.datos_propuestos.tipo}</b></span>}
                    {c.datos_propuestos.fecha && <span>Fecha: <b>{new Date(c.datos_propuestos.fecha).toLocaleString("es-ES")}</b></span>}
                  </div>
                </div>
              )}

              {/* Resolución (si ya fue resuelta) */}
              {c.estado !== "pendiente" && c.notas_resolucion && (
                <div className={`rounded p-3 text-sm ${c.estado === "aprobada" ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Resolución:</p>
                  <p>{c.notas_resolucion}</p>
                  {c.resuelto_at && <p className="text-xs text-gray-400 mt-1">Resuelto el {new Date(c.resuelto_at).toLocaleString("es-ES")}</p>}
                </div>
              )}

              {/* Botones de acción (solo pendientes) */}
              {c.estado === "pendiente" && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <input
                    type="text"
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    placeholder="Notas de resolución (opcional)"
                    value={resolviendo?.startsWith(c.id) ? notas : ""}
                    onChange={(e) => setNotas(e.target.value)}
                    onFocus={() => setNotas("")}
                  />
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    onClick={() => resolver(c.id, "aprobar")}
                    disabled={!!resolviendo}
                  >
                    {resolviendo === c.id + "aprobar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Aprobar
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    onClick={() => resolver(c.id, "rechazar")}
                    disabled={!!resolviendo}
                  >
                    {resolviendo === c.id + "rechazar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
