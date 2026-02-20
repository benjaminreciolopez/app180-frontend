"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ShieldCheck, History, Clock, User, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function VerifactuEventosPanel() {
    const [eventos, setEventos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadEventos = async () => {
        try {
            const res = await authenticatedFetch('/api/admin/verifactu/eventos');
            if (res.ok) {
                const json = await res.json();
                if (json.success) setEventos(json.data);
            }
        } catch (error) {
            console.error("Error loading verifactu events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEventos();
    }, []);

    const getBadgeColor = (tipo: string) => {
        switch (tipo) {
            case 'INICIO_SESION': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'BACKUP_GENERADO': return 'bg-green-100 text-green-800 border-green-200';
            case 'RESTAURACION_SISTEMA': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'CAMBIO_CONFIG': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <Card className="mt-8 border-t-4 border-t-slate-800 shadow-lg">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        <CardTitle className="text-xl">Registro de Eventos Veri*Factu</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                        Trazabilidad Encadenada
                    </Badge>
                </div>
                <CardDescription>
                    Huella técnica de operaciones del sistema según Reglamento 1007/2023 (AEAT).
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {loading ? (
                    <LoadingSpinner />
                ) : eventos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground italic flex flex-col items-center gap-2">
                        <History className="h-8 w-8 opacity-20" />
                        Aún no hay eventos registrados en este periodo.
                    </div>
                ) : (
                    <div className="relative space-y-4">
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />

                        {eventos.map((evento, idx) => (
                            <div key={evento.id} className="relative pl-12 pb-2 group">
                                <div className={`absolute left-0 top-1 h-10 w-10 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center z-10 transition-colors ${idx === 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                                    {idx === 0 ? <Clock className="h-5 w-5" /> : <History className="h-4 w-4" />}
                                </div>

                                <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm group-hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <Badge className={`${getBadgeColor(evento.tipo_evento)} border`}>
                                            {evento.tipo_evento}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(evento.fecha_evento), "PPP 'a las' p", { locale: es })}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium mb-1">{evento.descripcion}</p>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 border-t pt-2">
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {evento.user_nombre || 'Sistema'}
                                        </span>
                                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 overflow-hidden max-w-[200px]" title={evento.hash_actual}>
                                            <ShieldCheck className="h-3 w-3" />
                                            Hash: {evento.hash_actual?.substring(0, 12)}...
                                        </span>
                                        {evento.hash_anterior && (
                                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 truncate max-w-[200px]" title={evento.hash_anterior}>
                                                <History className="h-3 w-3" />
                                                Prev: {evento.hash_anterior.substring(0, 8)}...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex gap-2 items-start border border-blue-100 dark:border-blue-800/50">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                        Este registro es inalterable y está protegido mediante encadenamiento criptográfico.
                        Cualquier intento de modificación invalidará la cadena de hashes, alertando sobre la ruptura de integridad del sistema.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
