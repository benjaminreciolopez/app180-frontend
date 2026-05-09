// Renderiza el formulario admin de crear factura DENTRO del layout del
// cliente del asesor para preservar sessionStorage.asesor_empresa_id y que
// todas las queries (clientes, conceptos, IVA, etc.) operen sobre la empresa
// del cliente vinculado, no sobre el despacho del asesor.
export { default } from "@/app/admin/facturacion/crear/page";
