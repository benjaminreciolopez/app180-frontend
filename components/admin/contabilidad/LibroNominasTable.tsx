"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { authenticatedFetch } from "@/utils/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Loader2 } from "lucide-react";
import CrearNominaModal from "./CrearNominaModal";
import { useRef } from "react";

interface Nomina {
    id: string;
    anio: number;
    mes: number;
    bruto: string;
    seguridad_social_empresa: string;
    irpf_retencion: string;
    liquido: string;
    nombre: string;
    apellidos: string;
}

export default function LibroNominasTable({ year }: { year: string }) {
    const [data, setData] = useState<Nomina[]>([]);
    const [loading, setLoading] = useState(true);

    const [uploading, setUploading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [ocrData, setOcrData] = useState<any>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/libro-nominas?year=${year}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) setData(json.data);
            }
        } catch (error) {
            console.error("Error loading nominas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [year]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await authenticatedFetch("/api/nominas/ocr", {
                method: "POST",
                headers: {}, // Dejar vacío para que browser ponga multipart boundary
                body: formData
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setOcrData(json.data);
                    setUploadedFile(file); // Guardar archivo para pasarlo al modal
                    setModalOpen(true);
                } else {
                    alert("Error OCR: " + json.error);
                }
            } else {
                alert("Error al subir archivo");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleManualCreate = () => {
        setOcrData(null);
        setUploadedFile(null);
        setModalOpen(true);
    };

    if (loading) return <LoadingSpinner />;

    // TODO: Implementar modal de creación de nómina
    const handleCrearNomina = () => {
        // Deprecated by handleManualCreate
    };

    const totalBruto = data.reduce((acc, curr) => acc + parseFloat(curr.bruto), 0);
    const totalSS = data.reduce((acc, curr) => acc + parseFloat(curr.seguridad_social_empresa), 0);
    const totalCoste = totalBruto + totalSS;

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />

                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {uploading ? "Analizando..." : "Importar PDF (IA)"}
                </Button>

                <Button onClick={handleManualCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Manual
                </Button>
            </div>

            <CrearNominaModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
                prefilledData={ocrData}
                pdfFile={uploadedFile}
            />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead>Empleado</TableHead>
                            <TableHead className="text-right">Bruto</TableHead>
                            <TableHead className="text-right">S.S. Empresa</TableHead>
                            <TableHead className="text-right">IRPF</TableHead>
                            <TableHead className="text-right">Coste Total</TableHead>
                            <TableHead className="text-right">A Pagar (Líquido)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No hay nóminas registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{row.mes}/{row.anio}</TableCell>
                                    <TableCell>{row.nombre} {row.apellidos}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(parseFloat(row.bruto))}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(parseFloat(row.seguridad_social_empresa))}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(parseFloat(row.irpf_retencion))}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(parseFloat(row.bruto) + parseFloat(row.seguridad_social_empresa))}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(parseFloat(row.liquido))}</TableCell>
                                </TableRow>
                            ))
                        )}
                        {/* Totales */}
                        {data.length > 0 && (
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={2} className="text-right">TOTALES</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalBruto)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalSS)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">{formatCurrency(totalCoste)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
