// Reutiliza la página admin de gastos recurrentes en el contexto del cliente
// del asesor. El layout del cliente setea sessionStorage.asesor_empresa_id, y
// authenticatedFetch / api inyectan el header X-Empresa-Id, por lo que el
// componente admin accede automáticamente a los datos del cliente correcto.
export { default } from "@/app/admin/gastos/recurrentes/page";
