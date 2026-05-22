import type { FieldErrors, FieldValues } from "react-hook-form";
import { showError } from "@/lib/toast";

// Etiquetas legibles para nombres técnicos de campos. Lo que no esté aquí
// se formatea automáticamente (snake_case → "Snake case").
const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  apellidos: "Apellidos",
  email: "Email",
  telefono: "Teléfono",
  dni: "DNI",
  nif: "NIF/CIF",
  cif: "NIF/CIF",
  razon_social: "Razón social",
  direccion: "Dirección",
  codigo_postal: "Código postal",
  ciudad: "Ciudad",
  provincia: "Provincia",
  pais: "País",
  proveedor: "Proveedor",
  cliente_id: "Cliente",
  descripcion: "Descripción",
  concepto: "Concepto",
  fecha: "Fecha",
  fecha_inicio: "Fecha de inicio",
  fecha_fin: "Fecha de fin",
  fecha_emision: "Fecha de emisión",
  fecha_vencimiento: "Fecha de vencimiento",
  base_imponible: "Base imponible",
  iva_porcentaje: "% IVA",
  iva_importe: "Cuota IVA",
  retencion_porcentaje: "% retención",
  retencion_importe: "Importe retención",
  total: "Total",
  importe: "Importe",
  categoria: "Categoría",
  metodo_pago: "Método de pago",
  cuenta_contable: "Cuenta contable",
  dia_ejecucion: "Día de ejecución",
  numero: "Número",
  serie: "Serie",
  password: "Contraseña",
  password_confirm: "Confirmación de contraseña",
};

function humanize(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function collect(errors: FieldErrors, path: string[] = [], out: string[] = []) {
  for (const key of Object.keys(errors)) {
    const node: any = (errors as any)[key];
    if (!node) continue;
    if (typeof node.message === "string" && node.message) {
      out.push(humanize(path.length === 0 ? key : path[0]));
    } else if (typeof node === "object") {
      collect(node, [...path, key], out);
    }
  }
  return out;
}

// Construye el mensaje del toast a partir de los errores de react-hook-form.
export function formatFormErrors<T extends FieldValues>(errors: FieldErrors<T>): string {
  const fields = Array.from(new Set(collect(errors as FieldErrors)));
  if (fields.length === 0) return "Revisa los campos del formulario";
  if (fields.length === 1) return `Falta o es incorrecto: ${fields[0]}`;
  return `Revisa estos campos: ${fields.join(", ")}`;
}

// Handler listo para pasar como segundo argumento de handleSubmit.
export function onFormError<T extends FieldValues>(errors: FieldErrors<T>) {
  showError(formatFormErrors(errors));
}
