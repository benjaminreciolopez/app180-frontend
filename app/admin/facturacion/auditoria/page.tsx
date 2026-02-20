"use client"

import { AuditoriaTab } from "@/components/admin/AuditoriaTab"
import { ShieldCheck } from "lucide-react"

export default function AuditoriaVerifactuPage() {
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

      <AuditoriaTab />
    </div>
  )
}
