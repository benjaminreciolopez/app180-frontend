"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, FileText } from "lucide-react";

interface Props {
  empresaId: string;
  contratoId: string;
  onClose: () => void;
}

interface FiniquitoResult {
  contrato: {
    id: string;
    nombre_empleado: string;
    tipo_contrato: string;
    fecha_inicio: string;
    salario_bruto_anual: number;
    salario_bruto_mensual: number;
    num_pagas: number;
  };
  fecha_extincion: string;
  motivo_extincion: string;
  antiguedad_anios: number;
  desglose: {
    salario_pendiente_mes: { dias: number; importe: number };
    vacaciones_pendientes: {
      dias_devengados: number;
      dias_disfrutados: number;
      dias_pendientes: number;
      importe: number;
    };
    pagas_extra_proporcionales: {
      paga_junio: number;
      paga_diciembre: number;
      importe: number;
    };
    indemnizacion: {
      dias_por_anio: number;
      descripcion: string;
      importe: number;
    };
  };
  total_finiquito: number;
}

const motivosExtincion = [
  { value: "despido_improcedente", label: "Despido Improcedente (33 dias/anio)" },
  { value: "despido_improcedente_anterior_2012", label: "Despido Improcedente pre-2012 (45 dias/anio)" },
  { value: "despido_objetivo", label: "Despido Objetivo (20 dias/anio)" },
  { value: "causas_objetivas", label: "Causas Objetivas (20 dias/anio)" },
  { value: "fin_contrato_temporal", label: "Fin Contrato Temporal (12 dias/anio)" },
  { value: "despido_disciplinario_procedente", label: "Despido Disciplinario Procedente (0)" },
  { value: "baja_voluntaria", label: "Baja Voluntaria (0)" },
  { value: "mutuo_acuerdo", label: "Mutuo Acuerdo (0)" },
  { value: "despido_colectivo", label: "ERE / Despido Colectivo (20 dias/anio)" },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export default function FiniquitoCalculator({ empresaId, contratoId, onClose }: Props) {
  const [motivo, setMotivo] = useState("baja_voluntaria");
  const [fechaExtincion, setFechaExtincion] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [diasVacDisfrutados, setDiasVacDisfrutados] = useState("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FiniquitoResult | null>(null);
  const [error, setError] = useState("");

  async function calcular() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await authenticatedFetch(
        `/asesor/clientes/${empresaId}/contratos/${contratoId}/finiquito`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo_extincion: motivo,
            fecha_extincion: fechaExtincion,
            dias_vacaciones_disfrutados: parseInt(diasVacDisfrutados) || 0,
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setResult(json.data);
      } else {
        const json = await res.json();
        setError(json.error || "Error calculando finiquito");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Motivo de Extincion</Label>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {motivosExtincion.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Fecha de Extincion</Label>
          <Input
            type="date"
            value={fechaExtincion}
            onChange={(e) => setFechaExtincion(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Dias Vacaciones Disfrutados</Label>
          <Input
            type="number"
            min={0}
            value={diasVacDisfrutados}
            onChange={(e) => setDiasVacDisfrutados(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={calcular} disabled={loading} className="w-full">
        <Calculator className="h-4 w-4 mr-2" />
        {loading ? "Calculando..." : "Calcular Finiquito"}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Contract info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Datos del Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Empleado:</strong> {result.contrato.nombre_empleado}</p>
              <p><strong>Tipo:</strong> {result.contrato.tipo_contrato}</p>
              <p><strong>Inicio:</strong> {new Date(result.contrato.fecha_inicio).toLocaleDateString("es-ES")}</p>
              <p><strong>Salario Bruto Anual:</strong> {formatCurrency(result.contrato.salario_bruto_anual)}</p>
              <p><strong>Antiguedad:</strong> {result.antiguedad_anios} anios</p>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Desglose del Finiquito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Salario pendiente */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Salario Pendiente del Mes</p>
                  <p className="text-xs text-muted-foreground">
                    {result.desglose.salario_pendiente_mes.dias} dias trabajados
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(result.desglose.salario_pendiente_mes.importe)}
                </p>
              </div>

              <Separator />

              {/* Vacaciones */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Vacaciones No Disfrutadas</p>
                  <p className="text-xs text-muted-foreground">
                    {result.desglose.vacaciones_pendientes.dias_devengados} devengados
                    {" - "}
                    {result.desglose.vacaciones_pendientes.dias_disfrutados} disfrutados
                    {" = "}
                    {result.desglose.vacaciones_pendientes.dias_pendientes} pendientes
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(result.desglose.vacaciones_pendientes.importe)}
                </p>
              </div>

              <Separator />

              {/* Pagas extra */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Pagas Extra Proporcionales</p>
                  <p className="text-xs text-muted-foreground">
                    Junio: {formatCurrency(result.desglose.pagas_extra_proporcionales.paga_junio)}
                    {" | "}
                    Diciembre: {formatCurrency(result.desglose.pagas_extra_proporcionales.paga_diciembre)}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(result.desglose.pagas_extra_proporcionales.importe)}
                </p>
              </div>

              <Separator />

              {/* Indemnizacion */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Indemnizacion</p>
                  <p className="text-xs text-muted-foreground">
                    {result.desglose.indemnizacion.descripcion}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(result.desglose.indemnizacion.importe)}
                </p>
              </div>

              <Separator />

              {/* TOTAL */}
              <div className="flex justify-between items-center pt-2">
                <p className="text-lg font-bold">TOTAL FINIQUITO</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(result.total_finiquito)}
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            * Calculo orientativo. Los importes definitivos pueden variar segun convenio colectivo,
            retenciones IRPF aplicables y otros conceptos no incluidos.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
