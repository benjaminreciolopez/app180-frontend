"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

const CLIENTES_KEY = ["admin", "clientes"] as const;

export type Cliente = {
  id: string;
  nombre: string;
  codigo?: string | null;
  activo: boolean;
  modo_defecto: string;
  requiere_geo: boolean;
  geo_policy: string | null;
  lat?: number | null;
  lng?: number | null;
  radio_m?: number | null;
  notas?: string | null;
  razon_social?: string | null;
  nif_cif?: string | null;
  tipo_fiscal?: string | null;
  pais?: string | null;
  provincia?: string | null;
  municipio?: string | null;
  codigo_postal?: string | null;
  direccion_fiscal?: string | null;
  email_factura?: string | null;
  telefono_factura?: string | null;
  persona_contacto?: string | null;
  iva_defecto?: string | null;
  exento_iva?: boolean | null;
  forma_pago?: string | null;
  iban?: string | null;
  nif?: string | null;
  direccion?: string | null;
  poblacion?: string | null;
  cp?: string | null;
  telefono?: string | null;
  email?: string | null;
  contacto_nombre?: string | null;
  contacto_email?: string | null;
};

/** Fetch all clientes */
export function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: CLIENTES_KEY,
    queryFn: async () => {
      const { data } = await api.get("/admin/clientes");
      return data;
    },
  });
}

/** Get next auto-generated code */
export function useNextClienteCode() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get("/admin/clientes/next-code");
      return data as { codigo: string };
    },
  });
}

/** Create or update a cliente */
export function useSaveCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cliente: Partial<Cliente> & { id?: string }) => {
      const payload = {
        ...cliente,
        razon_social: cliente.razon_social || null,
        nif_cif: cliente.nif_cif || null,
        forma_pago: cliente.forma_pago || null,
        iban: cliente.iban || null,
        iva_defecto: cliente.iva_defecto || null,
      };
      if (cliente.id) {
        const { data } = await api.put(`/admin/clientes/${cliente.id}`, payload);
        return data;
      }
      const { data } = await api.post("/admin/clientes", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTES_KEY });
    },
  });
}

/** Deactivate a cliente */
export function useDeactivateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/clientes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTES_KEY });
    },
  });
}
