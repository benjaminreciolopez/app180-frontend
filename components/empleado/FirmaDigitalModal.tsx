"use client"

import { useState } from "react"
import { api } from "@/services/api"
import { showError } from "@/lib/toast"
import { ShieldCheck, Loader2, X, AlertTriangle } from "lucide-react"

type Props = {
  nominaId: string
  mes: string
  anio: number
  onClose: () => void
  onFirmada: () => void
}

export default function FirmaDigitalModal({ nominaId, mes, anio, onClose, onFirmada }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [checked, setChecked] = useState(false)

  async function handleFirmar() {
    setConfirming(true)
    try {
      const res = await api.post(`/empleado/nominas/${nominaId}/firmar`)
      if (res.data?.success) {
        onFirmada()
      }
    } catch {
      showError("Error al firmar la nomina")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-lg">Firma Digital</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
          <p className="text-sm text-blue-800">
            Vas a firmar digitalmente tu nomina de{" "}
            <span className="font-bold">{mes} {anio}</span>.
          </p>
        </div>

        {/* Advertencia */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Esta accion genera un hash de verificacion unico e irrevocable como constancia de que has revisado y aceptado tu nomina.
          </p>
        </div>

        {/* Checkbox confirmacion */}
        <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-green-600"
          />
          <span className="text-sm text-gray-700">
            He revisado mi nomina y confirmo que los datos son correctos
          </span>
        </label>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleFirmar}
            disabled={!checked || confirming}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {confirming ? "Firmando..." : "Firmar"}
          </button>
        </div>
      </div>
    </div>
  )
}
