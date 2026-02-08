"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  ArrowLeft, 
  Calendar, 
  User, 
  Info, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

export default function ImportacionDetalle() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [head, setHead] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/admin/calendario/importaciones/${id}`);
      setHead(res.data.importacion);
      setItems(res.data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading && !head) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingSpinner showText={false} />
        <p className="text-slate-500 font-medium">Cargando detalle de importación...</p>
      </div>
    );
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
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Historial</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Detalle de Importación</h1>
          <p className="text-slate-500 max-w-2xl">
            Vista inmutable de los datos procesados y confirmados para esta sesión.
          </p>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => router.back()} className="rounded-xl border-slate-200 bg-white shadow-sm">
             <ArrowLeft className="w-4 h-4 mr-2" />
             Volver
           </Button>
        </div>
      </motion.div>

      {head && (
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white mb-6">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Resumen de Sesión</CardTitle>
                  <CardDescription>ID: <span className="font-mono text-[10px] bg-slate-100 rounded px-1">{head.id}</span></CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Usuario</p>
                    <p className="text-sm font-semibold text-slate-700">{head.creado_por_nombre || "Sistema"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Fecha</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {new Date(head.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Origen</p>
                    <Badge variant="outline" className="mt-0.5 rounded-lg border-none bg-blue-50 text-blue-700">
                      {head.origen.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Estado</p>
                    {head.reverted_at ? (
                      <Badge variant="outline" className="mt-0.5 rounded-lg border-none bg-red-50 text-red-600">
                        REVERTIDA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-0.5 rounded-lg border-none bg-green-50 text-green-700">
                        ACTIVA
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {head.reverted_at && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm">
                   <AlertCircle className="w-5 h-5" />
                   <span>Esta importación fue deshecha el <b>{new Date(head.reverted_at).toLocaleString("es-ES")}</b>.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                 <FileText className="w-5 h-5" />
               </div>
               <div>
                 <CardTitle className="text-lg font-bold text-slate-900">Registros Importados</CardTitle>
                 <CardDescription>{items.length} filas asociadas a esta sesión</CardDescription>
               </div>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[150px] font-bold text-slate-700">Fecha</TableHead>
                    <TableHead className="w-[180px] font-bold text-slate-700">Categoría</TableHead>
                    <TableHead className="w-[150px] font-bold text-slate-700">Ámbito</TableHead>
                    <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-700">Laborable</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-700">Activo</TableHead>
                    <TableHead className="w-[100px] text-center font-bold text-slate-700">Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 items-center">
                      <TableCell className="font-medium text-slate-900">{it.fecha}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg bg-slate-100 text-slate-600 border-none">
                          {it.tipo.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-500 capitalize">{it.label || "—"}</span>
                      </TableCell>
                      <TableCell>
                         <span className="text-slate-600 inline-block max-w-[300px] truncate" title={it.descripcion}>
                           {it.descripcion || "—"}
                         </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`rounded-full h-2 w-2 p-0 border-none ${it.es_laborable ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="ml-2 text-xs">{it.es_laborable ? "Sí" : "No"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="outline" className={`rounded-full h-2 w-2 p-0 border-none ${it.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                         <span className="ml-2 text-xs">{it.activo ? "Activo" : "Inactivo"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{it.origen}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                           <FileText className="w-10 h-10 opacity-10" />
                           <p>No se encontraron registros para esta importación.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
               <Info className="w-3.5 h-3.5" />
               <span>Snapshot inmutable de auditoría</span>
             </div>
             
             <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl text-slate-500">
               Cerrar Detalle
             </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
