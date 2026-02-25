"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Tag } from "lucide-react"
import { FacturasListContent } from "@/components/admin/facturacion/FacturasListContent"
import { ProformasListContent } from "@/components/admin/facturacion/ProformasListContent"

export default function FacturasListadoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const activeTab = searchParams.get("tab") === "proformas" ? "proformas" : "fiscales"

  const handleTabChange = (value: string) => {
    if (value === "proformas") {
      router.replace("/admin/facturacion/listado?tab=proformas")
    } else {
      router.replace("/admin/facturacion/listado")
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="bg-slate-100 p-1">
        <TabsTrigger
          value="fiscales"
          className="data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
        >
          <FileText className="w-4 h-4 mr-2" />
          Fiscales
        </TabsTrigger>
        <TabsTrigger
          value="proformas"
          className="data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
        >
          <Tag className="w-4 h-4 mr-2" />
          Proformas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fiscales" className="mt-4">
        <FacturasListContent />
      </TabsContent>

      <TabsContent value="proformas" className="mt-4">
        <ProformasListContent />
      </TabsContent>
    </Tabs>
  )
}
