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
    // Controlamos el valor para poder resetearlo y permitir seleccionar la misma opción varias veces
    const [value, setValue] = useState<string>("");

    const handleExport = async (format: string) => {
        if (!format) return;
        setLoading(true);
        // No seteamos el valor 'value' aquí para evitar que se muestre seleccionado visualmente si no queremos
        // O lo dejamos en blanco para que siempre parezca un botón de acción
        
        try {
            // Construir Query String
            const params: Record<string, string> = { format };
            Object.entries(queryParams).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    params[key] = String(val);
                }
            });

            const response = await api.get(`/admin/export/${module}`, {
                params,
                responseType: 'blob' 
            });

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
            
        } catch (err) {
            console.error(err);
            showError("No se pudo descargar el archivo");
        } finally {
            setLoading(false);
            setValue(""); // Resetear valor siempre
        }
    };

    return (
        <div className={`relative z-10 ${className}`}>
            <Select 
                value={value} 
                onValueChange={(v) => {
                    handleExport(v);
                    // Hack: forzar reset visual inmediato si fuera necesario, 
                    // aunque el reset en finally suele bastar. 
                    // Si se resetea muy rápido el menú se cierra (es lo deseado).
                    setTimeout(() => setValue(""), 0); 
                }} 
                disabled={loading}
            >
                <SelectTrigger className="w-[140px] h-9 bg-white border-input hover:bg-gray-100 transition-colors text-gray-900 cursor-pointer shadow-sm">
                    <div className="flex items-center gap-2">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        ) : (
                            <Download className="h-4 w-4 text-gray-900" />
                        )}
                        <span className="font-medium">{loading ? "Generando..." : label}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pdf" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            <span>PDF Documento</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="csv" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                            <Table className="h-4 w-4 text-green-600" />
                            <span>Excel / CSV</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="html" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-blue-500" />
                            <span>Vista HTML</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};
