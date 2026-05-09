// Lista de "clientes finales" (deudores) de la empresa cliente vinculada.
// Reutiliza la página admin con CRUD completo (crear/editar/desactivar).
// Como vivimos bajo el layout de /asesor/clientes/[empresa_id]/...,
// sessionStorage.asesor_empresa_id está activo y todas las queries operan
// sobre los clients_180 del cliente vinculado, no del despacho.
export { default } from "@/app/admin/clientes/page";
