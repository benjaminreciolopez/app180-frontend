// src/components/empleado/calendarioTypes.ts
export type CalendarioTipo =
  | "vacaciones"
  | "baja_medica"
  | "festivo"
  | "no_laborable"
  | "laborable"
  | "fichaje";

export type CalendarioEvento = {
  id: string;
  tipo: CalendarioTipo | string; // backend puede mandar otros
  subtipo?: string | null;

  title: string;
  start: string; // ISO o YYYY-MM-DD
  end?: string | null; // para allDay inclusivo, backend ya suele sumar +1 día
  allDay?: boolean;

  estado?: "pendiente" | "aprobado" | "rechazado" | string;
  empleado_id?: string | null;
  cliente_id?: string | null;

  // extras opcionales
  cliente_nombre?: string | null;
};
