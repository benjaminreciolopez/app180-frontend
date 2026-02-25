"use client";

export type CampoConfig = {
  key: string;
  label: string;
  tipo: "texto" | "numero" | "select" | "checkbox" | "hora" | "fecha";
  obligatorio?: boolean;
  opciones?: string[];
  orden?: number;
};

export function DynamicFieldRenderer({
  campo,
  value,
  onChange,
  disabled,
}: {
  campo: CampoConfig;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}) {
  const base = "border p-2 rounded w-full text-sm";

  switch (campo.tipo) {
    case "texto":
      return (
        <div>
          <label className="text-xs text-gray-600">
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="text"
            className={base}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    case "numero":
      return (
        <div>
          <label className="text-xs text-gray-600">
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="number"
            className={base}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            disabled={disabled}
          />
        </div>
      );

    case "select":
      return (
        <div>
          <label className="text-xs text-gray-600">
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <select
            className={base}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">-- Seleccionar --</option>
            {(campo.opciones || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "checkbox":
      return (
        <div>
          <label className="flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4"
            />
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
      );

    case "hora":
      return (
        <div>
          <label className="text-xs text-gray-600">
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="time"
            className={base}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    case "fecha":
      return (
        <div>
          <label className="text-xs text-gray-600">
            {campo.label}
            {campo.obligatorio && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input
            type="date"
            className={base}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Renders a group of dynamic fields with validation support
 */
export function DynamicFieldsGroup({
  campos,
  values,
  onChange,
  disabled,
}: {
  campos: CampoConfig[];
  values: Record<string, any>;
  onChange: (vals: Record<string, any>) => void;
  disabled?: boolean;
}) {
  const sorted = [...campos].sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sorted.map((campo) => (
        <DynamicFieldRenderer
          key={campo.key}
          campo={campo}
          value={values[campo.key]}
          onChange={(val) => onChange({ ...values, [campo.key]: val })}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

/**
 * Read-only display of dynamic fields
 */
export function DynamicFieldsDisplay({
  campos,
  values,
}: {
  campos: CampoConfig[];
  values: Record<string, any>;
}) {
  if (!campos?.length || !values) return null;

  const sorted = [...campos].sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
      {sorted.map((campo) => {
        const v = values[campo.key];
        if (v === undefined || v === null || v === "") return null;

        let display: string;
        if (campo.tipo === "checkbox") {
          display = v ? "Si" : "No";
        } else {
          display = String(v);
        }

        return (
          <div key={campo.key}>
            <span className="text-xs text-gray-500">{campo.label}</span>
            <div className="font-medium">{display}</div>
          </div>
        );
      })}
    </div>
  );
}
