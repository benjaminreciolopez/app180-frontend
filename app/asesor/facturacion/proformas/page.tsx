import { redirect } from "next/navigation"

export default function AsesorProformasRedirect() {
  redirect("/asesor/facturacion/listado?tab=proformas")
}
