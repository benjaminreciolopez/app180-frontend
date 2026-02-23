"use client"

import { useState } from "react"
import { AuditoriaTab } from "@/components/admin/AuditoriaTab"
import { ShieldCheck, FileText, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/services/api"
import { toast } from "sonner"

export default function AuditoriaVerifactuPage() {
  const [loadingDeclaracion, setLoadingDeclaracion] = useState(false)

  const handleVerDeclaracion = async () => {
    setLoadingDeclaracion(true)
    try {
      const res = await api.get("/admin/facturacion/configuracion/verifactu/declaracion-responsable", {
        responseType: "blob"
      })
      const blob = new Blob([res.data], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch {
      toast.error("Error al cargar la declaración responsable")
    } finally {
      setLoadingDeclaracion(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Auditoría Fiscal
          </h1>
          <p className="text-slate-500">Registro inalterable de operaciones y eventos técnicos (Ley Antifraude).</p>
        </div>
      </div>

      {/* Declaración Responsable del Productor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Declaración Responsable del Productor</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Certificación de cumplimiento normativo del software CONTENDO conforme al RD 1007/2023 y Orden HAC/1177/2024.
              Accesible conforme a la obligación legal del art. 29.2.j) LGT.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          onClick={handleVerDeclaracion}
          disabled={loadingDeclaracion}
        >
          {loadingDeclaracion ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Ver Declaración
        </Button>
      </div>

      <AuditoriaTab />
    </div>
  )
}
