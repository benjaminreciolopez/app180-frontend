"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useFacturacionBasePath } from "@/hooks/useFacturacionBasePath"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Tag, FlaskConical } from "lucide-react"
import { FacturasListContent } from "@/components/admin/facturacion/FacturasListContent"
import { ProformasListContent } from "@/components/admin/facturacion/ProformasListContent"
import { TestFacturasListContent } from "@/components/admin/facturacion/TestFacturasListContent"

export default function FacturasListadoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const basePath = useFacturacionBasePath()
  const tabParam = searchParams.get("tab")
  const activeTab = tabParam === "proformas" ? "proformas" : tabParam === "test" ? "test" : "fiscales"

  const handleTabChange = (value: string) => {
    if (value === "proformas") {
      router.replace(`${basePath}/listado?tab=proformas`)
    } else if (value === "test") {
      router.replace(`${basePath}/listado?tab=test`)
    } else {
      router.replace(`${basePath}/listado`)
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
        <TabsTrigger
          value="test"
          className="data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer"
        >
          <FlaskConical className="w-4 h-4 mr-2" />
          Test VeriFActu
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fiscales" className="mt-4">
        <FacturasListContent />
      </TabsContent>

      <TabsContent value="proformas" className="mt-4">
        <ProformasListContent />
      </TabsContent>

      <TabsContent value="test" className="mt-4">
        <TestFacturasListContent />
      </TabsContent>
    </Tabs>
  )
}
