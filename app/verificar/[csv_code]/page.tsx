"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, ShieldCheck, ShieldX, Clock, Building2, FileText, Hash, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

interface VerificacionResult {
  verificado: boolean;
  valido: boolean;
  csv_code: string;
  tipo_documento: string;
  created_at: string;
  expires_at: string;
  num_registros: number;
  empresa: {
    nombre: string;
    nif_parcial: string;
  };
  parametros: {
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  hash_contenido_parcial: string;
  num_verificaciones: number;
}

export default function VerificarCSVPage() {
  const params = useParams();
  const csvCode = params.csv_code as string;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificacionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!csvCode) return;

    const verificar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/verificar/${csvCode}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Código no encontrado");
          return;
        }

        setResult(data);
      } catch {
        setError("Error de conexión con el servidor");
      } finally {
        setLoading(false);
      }
    };

    verificar();
  }, [csvCode]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CONTENDO</h1>
          <p className="text-sm text-gray-500 mt-1">Verificación de Documento</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-500">Verificando código...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <ShieldX className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-red-700">Verificación Fallida</h2>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-mono break-all">{csvCode}</p>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Compruebe que el código es correcto y que el documento no ha expirado.
              </p>
            </div>
          ) : result ? (
            <div>
              {/* Status Banner */}
              <div className="bg-green-50 border-b border-green-100 p-6 text-center">
                <ShieldCheck className="w-16 h-16 text-green-600 mx-auto" />
                <h2 className="mt-3 text-xl font-semibold text-green-800">Documento Verificado</h2>
                <p className="mt-1 text-sm text-green-600">
                  Este documento es auténtico e íntegro
                </p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {/* CSV Code */}
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Código CSV</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 break-all">
                      {result.csv_code}
                    </p>
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Empresa</p>
                    <p className="text-sm font-medium text-gray-900">{result.empresa.nombre}</p>
                    <p className="text-xs text-gray-400">NIF: {result.empresa.nif_parcial}</p>
                  </div>
                </div>

                {/* Document Type */}
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Tipo de documento</p>
                    <p className="text-sm font-medium text-gray-900">
                      Registro de Fichajes
                    </p>
                    <p className="text-xs text-gray-400">
                      {result.num_registros} registros
                      {result.parametros.fecha_inicio && ` | Desde: ${result.parametros.fecha_inicio}`}
                      {result.parametros.fecha_fin && ` — Hasta: ${result.parametros.fecha_fin}`}
                    </p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Fecha de generación</p>
                    <p className="text-sm text-gray-900">
                      {new Date(result.created_at).toLocaleString("es-ES")}
                    </p>
                    <p className="text-xs text-gray-400">
                      Válido hasta: {new Date(result.expires_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                </div>

                {/* Hash */}
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Hash de integridad (SHA-256)</p>
                    <p className="font-mono text-xs text-gray-600">
                      {result.hash_contenido_parcial}
                    </p>
                  </div>
                </div>

                {/* Verification count */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">
                    Este documento ha sido verificado {result.num_verificaciones} {result.num_verificaciones === 1 ? "vez" : "veces"}
                  </p>
                </div>
              </div>

              {/* Legal Footer */}
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Documento generado conforme al Real Decreto-ley 8/2019, de 8 de marzo (art. 34.9 ET).
                  Los registros de fichaje están protegidos mediante hash SHA-256 encadenado,
                  garantizando su inalterabilidad. Conservación mínima: 4 años.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          CONTENDO &mdash; Sistema de Gestión Empresarial
        </p>
      </div>
    </div>
  );
}
