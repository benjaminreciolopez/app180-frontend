"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, 
  RotateCcw, 
  Eye, 
  ArrowLeftRight, 
  User, 
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError } from "@/lib/toast";

type Importacion = {
  id: string;
  created_at: string;
  origen: "ocr" | "manual" | "mixto";
  stats: any;
  reverted_at?: string | null;
  creado_por_nombre?: string | null;
};

export default function ImportacionesPage() {
  const [rows, setRows] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/calendario/importaciones");
      setRows(res.data.importaciones || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function undo(id: string) {
    if (
      !confirm(
        "¿Deshacer esta importación? Se desactivarán los días que estén actualmente aplicados por esta importación.",
      )
    )
      return;
    
    setActionLoading(id);
    try {
      await api.post(`/admin/calendario/importaciones/${id}/deshacer`);
      await load();
      showSuccess("Importación deshecha correctamente.");
    } catch (e: any) {
      showError(e?.response?.data?.error || e?.message || "Error al deshacer importación");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <History className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Configuración</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Historial de Importaciones</h1>
          <p className="text-slate-500 max-w-2xl">
            Cada confirmación crea una importación auditable. Puedes comparar versiones y 
            revertir cambios si detectas inconsistencias.
          </p>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => window.history.back()} className="rounded-xl border-slate-200">
             <ArrowLeft className="w-4 h-4 mr-2" />
             Volver
           </Button>
           <Link href="/admin/configuracion/calendario/importar">
             <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
               Nueva Importación
             </Button>
           </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Registros de Auditoría</CardTitle>
                  <CardDescription>Visualiza y gestiona las importaciones realizadas</CardDescription>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="rounded-xl text-slate-500 hover:bg-slate-100">
                <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[180px] font-bold text-slate-700">Fecha y Hora</TableHead>
                    <TableHead className="w-[200px] font-bold text-slate-700">Usuario</TableHead>
                    <TableHead className="w-[120px] font-bold text-slate-700">Origen</TableHead>
                    <TableHead className="font-bold text-slate-700">Estadísticas</TableHead>
                    <TableHead className="w-[120px] text-center font-bold text-slate-700">Estado</TableHead>
                    <TableHead className="w-[200px] text-right font-bold text-slate-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((r) => {
                      const s = r.stats || {};
                      const isReverting = actionLoading === r.id;
                      
                      return (
                        <motion.tr 
                          key={r.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`group hover:bg-slate-50/50 transition-colors ${r.reverted_at ? "bg-slate-50/30 font-light" : ""}`}
                        >
                          <TableCell className="py-4 font-medium text-slate-900">
                            {new Date(r.created_at).toLocaleString("es-ES", {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {r.creado_por_nombre?.charAt(0) || <User className="w-3 h-3" />}
                              </div>
                              <span className="text-slate-600">{r.creado_por_nombre || "Sistema"}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                             <Badge variant="outline" className={`rounded-xl px-3 border-none ${r.origen === 'ocr' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                               {r.origen.toUpperCase()}
                             </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1.5"><Badge variant="outline" className="h-1.5 w-1.5 p-0 rounded-full bg-slate-400 border-none" /> Total: <b>{s.total ?? 0}</b></span>
                              <span className="flex items-center gap-1.5"><Badge variant="outline" className="h-1.5 w-1.5 p-0 rounded-full bg-green-500 border-none" /> Activos: <b>{s.activos ?? 0}</b></span>
                              <span className="flex items-center gap-1.5"><Badge variant="outline" className="h-1.5 w-1.5 p-0 rounded-full bg-blue-500 border-none" /> Festivos: <b>{s.festivos ?? 0}</b></span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {r.reverted_at ? (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 rounded-lg px-2">
                                REVERTIDA
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 rounded-lg px-2">
                                ACTIVA
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Link href={`/admin/configuracion/calendario/importaciones/${r.id}`}>
                                  <Button variant="ghost" size="sm" className="h-9 px-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver
                                  </Button>
                                </Link>
                                
                                {!r.reverted_at && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => undo(r.id)}
                                    disabled={!!actionLoading}
                                    className="h-9 px-3 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                  >
                                    {isReverting ? <LoadingSpinner showText={false} /> : <RotateCcw className="w-4 h-4 mr-2" />}
                                    Deshacer
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20 text-center text-slate-400">
                        {loading ? (
                           <div className="flex flex-col items-center gap-4">
                             <LoadingSpinner showText={false} />
                             <p>Cargando historial...</p>
                           </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <History className="w-10 h-10 opacity-10" />
                            <p>No hay importaciones registradas todavía.</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Usa el comparador para ver diferencias entre periodos importados</span>
              </div>
              
              <Link href="/admin/configuracion/calendario/importaciones/compare">
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white shadow-sm">
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Comparar Importaciones
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
