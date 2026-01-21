// src/components/empleado/calendarioTypes.ts
export type CalendarioTipo =
  | "vacaciones"
  | "baja_medica"
  | "festivo_local"
  | "festivo_nacional"
  | "convenio"
  | "cierre_empresa"
  | "laborable_extra"
  | "domingo"
  | "no_laborable"
  | "jornada"
  | "real_trabajo"
  | "real_descanso"
  | "plan_trabajo"
  | "plan_descanso"
  | string;
export type EstadoAusencia = "pendiente" | "aprobado" | "rechazado";

export type CalendarioEvento = {
  id: string;
  tipo: CalendarioTipo | string;
  subtipo?: string | null;

  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;

  estado?: EstadoAusencia;
  empleado_id?: string | null;
  cliente_id?: string | null;

  cliente_nombre?: string | null;

  // =========================
  // NUEVO (Planificación)
  // =========================
  jornada_id?: string | null;
  plantilla_id?: string | null;

  bloque_tipo?: "trabajo" | "descanso" | "otro";
  origen?: "plan" | "real" | "ausencia" | "empresa";
  meta?: {
    display?: "background";
  };
  minutos?: number | null;

  // =========================
  // NUEVO (estado visual)
  // =========================
  actual?: boolean;
  pasado?: boolean;
  futuro?: boolean;

  // =========================
  // NUEVO (incidencias)
  // =========================
  incidencia?: boolean;
  avisos?: string[];
};
