"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, FileDown, ExternalLink, Info } from "lucide-react";

interface Casilla {
  codigo: string;
  descripcion: string;
  importe: number;
}

interface Modelo100 {
  ejercicio: number;
  comunidad_autonoma: string;
  regimen: string;
  tipo_efectivo: number;
  resultado_texto: string;
  casillas: Casilla[];
  aviso: string;
}

export default function Modelo100Page() {
  const [year, setYear] = useState((new Date().getFullYear() - 1).toString());
  const [data, setData] = useState<Modelo100 | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/admin/fiscal/renta/modelo-100/${year}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "Error calculando casillas");
        setData(null);
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const copyValue = (importe: number) => {
    navigator.clipboard.writeText(importe.toFixed(2).replace(".", ","));
    toast.success("Importe copiado");
  };

  const copyAll = () => {
    if (!data) return;
    const txt = data.casillas.map((c) => `${c.codigo}\t${c.descripcion}\t${c.importe.toFixed(2).replace(".", ",")}`).join("\n");
    navigator.clipboard.writeText(txt);
    toast.success("Todas las casillas copiadas (TSV)");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Modelo 100 (Renta IRPF)</h1>
          <p className="text-muted-foreground text-sm">Casillas calculadas para copiar a RentaWEB de la AEAT.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <a href="https://sede.agenciatributaria.gob.es/Sede/Renta.html" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> RentaWEB
            </a>
          </Button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen ejercicio {data.ejercicio}</CardTitle>
              <CardDescription>{data.comunidad_autonoma} — Régimen {data.regimen}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Resultado</div>
                <div className="text-lg font-semibold">{data.resultado_texto}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase">Tipo efectivo</div>
                <div className="text-lg font-semibold">{data.tipo_efectivo}%</div>
              </div>
            </CardContent>
          </Card>

          {data.aviso && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2 items-start">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{data.aviso}</span>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Casillas</CardTitle>
                <CardDescription>Pulsa el icono para copiar el importe individual.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={copyAll}>
                <FileDown className="h-4 w-4 mr-1" /> Copiar todo (TSV)
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="w-[70px] text-right">Copiar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.casillas.map((c) => (
                    <TableRow key={c.codigo}>
                      <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                      <TableCell className="text-sm">{c.descripcion}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.importe)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => copyValue(c.importe)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
