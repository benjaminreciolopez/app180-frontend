// Renderiza el formulario admin de crear proforma DENTRO del layout del
// cliente del asesor. Esto preserva sessionStorage.asesor_empresa_id (que
// el layout cliente setea sincrónicamente), por lo que api inyecta
// X-Empresa-Id automáticamente y todas las queries del form (clientes,
// conceptos, IVA, etc.) operan en el contexto de la empresa cliente —
// NO del despacho del asesor.
//
// Antes existía un redirect a /asesor/facturacion/proformas/crear que
// salía del layout cliente y borraba el sessionStorage, listando los
// clientes del despacho por error.
export { default } from "@/app/admin/facturacion/proformas/crear/page";
