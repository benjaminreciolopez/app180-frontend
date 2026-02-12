"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Save, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import ClientFiscalFields from "./ClientFiscalFields";

export default function ClientFiscalForm({ 
    data, 
    onSave,
    readOnly = false
}: { 
    data: any, 
    onSave?: (newData: any) => Promise<void>,
    readOnly?: boolean
}) {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state with data prop
  useEffect(() => {
    if (data) {
        setFormData({ 
            razon_social: "",
            nif_cif: "",
            pais: "España",
            provincia: "",
            poblacion: "",
            cp: "",
            direccion: "",
            email: "",
            telefono: "",
            contacto_nombre: "",
            contacto_email: "",
            iva_defecto: "21",
            exento_iva: false,
            forma_pago: "",
            iban: "",
            ...data 
        });
    }
  }, [data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
        setSaving(true);
        await onSave(formData);
        setIsEditing(false);
        toast.success("Datos guardados");
    } catch(e) {
        toast.error("Error al guardar");
    } finally {
        setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...data });
    setIsEditing(false);
  };

    // Determine the effective readOnly state for the UI
    // If global readOnly is true, then it's always readOnly.
    // If global is false, we depend on local isEditing state.
    const isUIReadOnly = readOnly ? true : !isEditing;

    return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="flex justify-between items-center bg-gray-50 border-b px-4 py-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            {isUIReadOnly && <Lock size={14} className="text-gray-400"/>}
            Datos Fiscales y de Contacto
        </h3>
        <div>
            {!readOnly && (!isEditing ? (
                 <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 size={14} className="mr-2"/> Modificar
                 </Button>
            ) : (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                        <X size={14} /> 
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando..." : <><Save size={14} className="mr-2"/> Guardar</>}
                    </Button>
                </div>
            ))}
        </div>
      </div>

      <div className="p-6">
        <ClientFiscalFields 
            data={formData}
            onChange={handleChange}
            readOnly={isUIReadOnly}
        />
      </div>
    </div>
  );
}
