"use client";

import { useState } from "react";
import { Download, FileText, Table, FileCode, Loader2 } from "lucide-react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "../ui/select";
import { showSuccess, showError } from "@/lib/toast";
import { api } from "@/services/api";

interface UniversalExportButtonProps {
    module: string;
    queryParams: Record<string, any>;
    label?: string;
    className?: string;
}

export const UniversalExportButton = ({ 
    module, 
    queryParams, 
    label = "Exportar",
    className = "" 
}: UniversalExportButtonProps) => {
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState<string>("");

    const handleExport = async (format: string) => {
        if (!format) {
            console.warn("⚠️ No se seleccionó formato");
            return;
        }
        setLoading(true);
        console.log(`🚀 Iniciando exportación: ${module} (${format})`, queryParams);

        try {
            const params: Record<string, string> = { format };
            Object.entries(queryParams).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    params[key] = String(val);
                }
            });

            console.log('📤 Parámetros de exportación:', params);
            const response = await api.get(`/admin/export/${module}`, {
                params,
                responseType: 'blob'
            });

            console.log("✅ Respuesta recibida", response.status, response.headers);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            let filename = `export-${module}.${format}`;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    filename = fileNameMatch[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            showSuccess(`Exportación ${format.toUpperCase()} completada`);
            
        } catch (err: any) {
            console.error("❌ Error en exportación:", err);
            // Si el backend es Render y está despertando o fallando, aquí lo veremos
            const errorMsg = err.response?.status === 404 
                ? "Función de exportación no encontrada en el servidor. Verifica que el backend esté actualizado."
                : "No se pudo descargar el archivo. Comprueba la consola.";
            showError(errorMsg);
        } finally {
            setLoading(false);
            setValue("");
        }
    };

    return (
        <div className={`relative z-20 ${className}`}>
            <Select
                value={value}
                onValueChange={(v) => {
                    setValue(v);
                    handleExport(v);
                    // Reset después de un momento para permitir re-selección
                    setTimeout(() => setValue(""), 1000);
                }}
                disabled={loading}
            >
                <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-900 cursor-pointer shadow-sm ring-offset-white focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                    <div className="flex items-center gap-2 flex-1">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                        ) : (
                            <Download className="h-4 w-4 text-slate-600" />
                        )}
                        <span className="font-semibold text-sm">
                            {loading ? "Generando..." : label}
                        </span>
                    </div>
                </SelectTrigger>
                <SelectContent className="z-[100] bg-white">
                    <SelectItem value="pdf" className="cursor-pointer py-2 hover:bg-red-50">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            <span>Documento PDF</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="csv" className="cursor-pointer py-2 hover:bg-green-50">
                        <div className="flex items-center gap-2">
                            <Table className="h-4 w-4 text-green-600" />
                            <span>Excel / CSV</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="html" className="cursor-pointer py-2 hover:bg-blue-50">
                        <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-blue-500" />
                            <span>Vista Web (HTML)</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};
