import { redirect } from "next/navigation"

export default function ProformasRedirect() {
  redirect("/admin/facturacion/listado?tab=proformas")
}
