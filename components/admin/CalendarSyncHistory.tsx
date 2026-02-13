"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showError } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, ArrowLeftRight, Clock, ChevronRight, ChevronDown } from "lucide-react";

type SyncLog = {
  id: string;
  sync_type: "manual" | "auto" | "webhook";
  sync_direction: "to_google" | "from_google" | "bidirectional";
  status: "success" | "partial" | "error";
  events_created: number;
  events_updated: number;
  events_deleted: number;
  errors_count: number;
  error_details: any;
  created_at: string;
};

export default function CalendarSyncHistory({ refreshTrigger }: { refreshTrigger?: number }) {
  const [history, setHistory] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMainExpanded, setIsMainExpanded] = useState(false);

  async function loadHistory() {
    try {
      setLoading(true);
      const res = await api.get("/admin/calendar-sync/history?limit=10");
      setHistory(res.data);
    } catch (err) {
      console.error("Error cargando historial:", err);
      showError("No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  function getStatusIcon(status: string) {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "partial":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  }

  function getDirectionIcon(direction: string) {
    switch (direction) {
      case "to_google":
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case "from_google":
        return <ArrowLeft className="w-4 h-4 text-purple-600" />;
      case "bidirectional":
        return <ArrowLeftRight className="w-4 h-4 text-indigo-600" />;
      default:
        return null;
    }
  }

  function getDirectionLabel(direction: string) {
    switch (direction) {
      case "to_google":
        return "→ A Google";
      case "from_google":
        return "← Desde Google";
      case "bidirectional":
        return "↔️ Bidireccional";
      default:
        return direction;
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case "manual":
        return "Manual";
      case "auto":
        return "Automático";
      case "webhook":
        return "Webhook";
      default:
        return type;
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsMainExpanded(!isMainExpanded)}
      >
        <h3 className="font-semibold text-lg">Historial de Sincronizaciones</h3>
        <div className="flex items-center gap-2">
          {history.length > 0 && !isMainExpanded && (
            <span className="text-xs text-gray-400">{history.length} registros</span>
          )}
          {isMainExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {isMainExpanded && (
        <div className="p-4 pt-0 border-t">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay sincronizaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {history.map((log) => {
                const isExpanded = expandedId === log.id;
                
                return (
                  <div 
                    key={log.id} 
                    className={`p-3 border rounded-lg transition-all cursor-pointer ${isExpanded ? 'bg-gray-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : log.id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-sm font-medium">
                              {getDirectionIcon(log.sync_direction)}
                              {getDirectionLabel(log.sync_direction)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                              {getTypeLabel(log.sync_type)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString("es-ES", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            <div className="ml-auto">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          {!isExpanded && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 italic">
                              Click para ver {log.errors_count > 0 ? `${log.errors_count} errores` : 'detalles'}
                            </div>
                          )}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="bg-green-50 p-2 rounded text-green-700">
                                  <p className="text-xs opacity-70">Creados</p>
                                  <p className="font-bold">{log.events_created}</p>
                                </div>
                                <div className="bg-blue-50 p-2 rounded text-blue-700">
                                  <p className="text-xs opacity-70">Actualizados</p>
                                  <p className="font-bold">{log.events_updated}</p>
                                </div>
                                <div className="bg-orange-50 p-2 rounded text-orange-700">
                                  <p className="text-xs opacity-70">Eliminados</p>
                                  <p className="font-bold">{log.events_deleted}</p>
                                </div>
                                <div className={`p-2 rounded font-bold ${log.errors_count > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                                  <p className="text-xs opacity-70">Errores</p>
                                  <p>{log.errors_count}</p>
                                </div>
                              </div>
                              {log.error_details && log.errors_count > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-red-600 mb-1 caps">Detalle de errores:</p>
                                  <div className="max-h-60 overflow-y-auto bg-red-50 p-2 rounded border border-red-100">
                                    <pre className="text-xs text-red-800 whitespace-pre-wrap">
                                      {JSON.stringify(log.error_details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
