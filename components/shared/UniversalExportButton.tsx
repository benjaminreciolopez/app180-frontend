"use client";

import { useState } from "react";
import { Download, FileText, Table, FileCode } from "lucide-react";
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

    const handleExport = async (format: string) => {
        if (!format) return;
        setLoading(true);
        
        try {
            // Construir Query String
            const params: Record<string, string> = { format };
            Object.entries(queryParams).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    params[key] = String(val);
                }
            });

            // Usamos api.get para incluir el token de autorización automáticamente
            const response = await api.get(`/admin/export/${module}`, {
                params,
                responseType: 'blob' // Importante para archivos binarios (PDF)
            });

            // Crear URL temporal para descarga
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Intentar obtener nombre de archivo del header content-disposition
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
        }
    };

    return (
        <div className={className}>
            <Select onValueChange={handleExport}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-input">
                    <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>{label}</span>
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
