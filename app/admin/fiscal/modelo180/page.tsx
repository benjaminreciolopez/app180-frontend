"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, FileText, Download } from "lucide-react";
import ModeloAnualDetail from "@/components/fiscal/ModeloAnualDetail";

const MODELO = "180";
const TITULO = "Modelo 180 - Arrendamientos Resumen Anual";

export default function Modelo180Page() {
    const searchParams = useSearchParams();
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await authenticatedFetch(`/api/admin/fiscal/modelo${MODELO}?year=${year}`);
                if (!res.ok) {
                    const json = await res.json();
                    throw new Error(json.error || "Error cargando datos");
                }
                const json = await res.json();
                setData(json.data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [year]);

    async function handleDownload() {
        try {
            const res = await authenticatedFetch(`/api/admin/fiscal/download-boe-anual?year=${year}&modelo=${MODELO}`);
            if (!res.ok) {
                const json = await res.json();
                alert(json.error || "Error al descargar");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${year}.${MODELO}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert("Error de conexion al descargar");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{TITULO}</h1>
                    <p className="text-sm text-muted-foreground">Ejercicio {year}</p>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <Card>
                    <CardContent className="py-8 text-center text-red-600">{error}</CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" /> {TITULO}
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-1" /> Fichero AEAT
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ModeloAnualDetail modelo={MODELO} datos={data} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
