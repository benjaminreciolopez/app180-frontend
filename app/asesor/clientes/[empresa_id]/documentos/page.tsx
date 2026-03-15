"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  FileText,
  Download,
  Trash2,
  Upload,
  FolderOpen,
  RefreshCw,
} from "lucide-react";

interface DocAsesoria {
  id: string;
  nombre: string;
  descripcion: string;
  mime_type: string;
  size_bytes: number;
  subido_por_tipo: "admin" | "asesor";
  subido_por_nombre: string;
  folder: string;
  created_at: string;
}

const FOLDERS = [
  { value: "todos", label: "Todos" },
  { value: "facturas", label: "Facturas" },
  { value: "contratos", label: "Contratos" },
  { value: "fiscal", label: "Fiscal" },
  { value: "general", label: "General" },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AsesorDocumentosClientePage() {
  const params = useParams();
  const empresaId = params.empresa_id as string;

  const [docs, setDocs] = useState<DocAsesoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("todos");
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const q = folder !== "todos" ? `?folder=${folder}` : "";
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/documentos${q}`);
      const json = await res.json();
      if (json.success) setDocs(json.data || []);
    } catch (err) {
      console.error("Error cargando documentos:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, folder]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", uploadFolder);
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/documentos/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) loadDocs();
    } catch (err) {
      console.error("Error subiendo documento:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(docId: string, nombre: string) {
    try {
      const res = await authenticatedFetch(`/asesor/clientes/${empresaId}/documentos/${docId}/download`);
      const json = await res.json();
      if (json.success && json.data?.url) {
        const a = document.createElement("a");
        a.href = json.data.url;
        a.download = nombre;
        a.target = "_blank";
        a.click();
      }
    } catch (err) {
      console.error("Error descargando:", err);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Eliminar este documento?")) return;
    try {
      await authenticatedFetch(`/asesor/clientes/${empresaId}/documentos/${docId}`, {
        method: "DELETE",
      });
      loadDocs();
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Documentos compartidos con este cliente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-5" />
            Documentos compartidos
          </CardTitle>
          <CardDescription>
            Sube y gestiona documentos para compartir con tu cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLDERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.filter((f) => f.value !== "todos").map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
              >
                {uploading ? (
                  <RefreshCw className="size-4 animate-spin mr-1" />
                ) : (
                  <Upload className="size-4 mr-1" />
                )}
                Subir
              </Button>
            </div>
          </div>

          {/* Documents list */}
          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="size-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hay documentos en esta carpeta</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nombre}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          doc.subido_por_tipo === "asesor"
                            ? "border-primary/30 text-primary"
                            : "border-green-300 text-green-600"
                        }`}
                      >
                        {doc.subido_por_tipo === "asesor" ? "Asesor" : "Cliente"}
                      </Badge>
                      <span>{doc.folder}</span>
                      <span>{formatSize(doc.size_bytes)}</span>
                      <span className="hidden sm:inline">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.nombre)}
                      title="Descargar"
                    >
                      <Download className="size-4" />
                    </Button>
                    {doc.subido_por_tipo === "asesor" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
