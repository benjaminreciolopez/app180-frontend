export type TipoAusencia = "vacaciones" | "baja_medica";
export type EstadoAusencia = "pendiente" | "aprobado" | "rechazado";

export type EventoAdmin = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: TipoAusencia;
  estado: EstadoAusencia;
  start: string;
  end: string;
  comentario_empleado?: string | null;
  comentario_admin?: string | null;
};
