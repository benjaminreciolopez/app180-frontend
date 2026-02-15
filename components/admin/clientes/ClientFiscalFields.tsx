"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock } from "lucide-react";

interface ClientFiscalFieldsProps {
  data: any;
  onChange?: (field: string, value: any) => void;
  readOnly?: boolean;
}

export default function ClientFiscalFields({
  data,
  onChange,
  readOnly = false,
}: ClientFiscalFieldsProps) {
  
  const handleChange = (field: string, value: any) => {
    if (onChange && !readOnly) {
      onChange(field, value);
    }
  };

  const commonInputClass = readOnly 
    ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" 
    : "bg-white border-slate-200";

  return (
    <div className="space-y-6">
      {/* 1. Identificación */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
           {readOnly && <Lock size={14} className="text-slate-400" />}
           Identificación Fiscal
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Razón Social</Label>
            <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "Nombre legal completo"}
              className={commonInputClass}
              maxLength={200}
              value={data.razon_social || ""}
              onChange={(e) => handleChange("razon_social", e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">NIF / CIF</Label>
            <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "B12345678"}
              className={commonInputClass}
              value={data.nif_cif || data.nif || ""}
              onChange={(e) => {
                  handleChange("nif_cif", e.target.value);
                  // Maintain backward compatibility if needed
                  handleChange("nif", e.target.value);
              }}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email Facturación</Label>
            <Input
              type="email"
              disabled={readOnly}
              placeholder={readOnly ? "—" : "facturas@empresa.com"}
              className={commonInputClass}
              value={data.email_factura || ""}
              onChange={(e) => handleChange("email_factura", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Dirección Fiscal */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Dirección Fiscal</h4>

        <div>
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dirección</Label>
          <Input
            disabled={readOnly}
            placeholder={readOnly ? "—" : "Calle, número, piso..."}
            className={commonInputClass}
            value={data.direccion_fiscal || ""}
            onChange={(e) => handleChange("direccion_fiscal", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">CP</Label>
            <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "28001"}
              className={commonInputClass}
              value={data.codigo_postal || ""}
              onChange={(e) => handleChange("codigo_postal", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Municipio</Label>
            <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "Madrid"}
              className={commonInputClass}
              value={data.municipio || ""}
              onChange={(e) => handleChange("municipio", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Provincia</Label>
            <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "Madrid"}
              className={commonInputClass}
              value={data.provincia || ""}
              onChange={(e) => handleChange("provincia", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">País</Label>
            <Input
              disabled={readOnly}
              placeholder="España"
              className={commonInputClass}
              value={data.pais || "España"}
              onChange={(e) => handleChange("pais", e.target.value)}
            />
          </div>
        </div>
      </div>

       {/* 3. Contacto */}
       <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-700">
              Datos de Contacto
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono Facturación</Label>
              <Input
                disabled={readOnly}
                placeholder={readOnly ? "—" : "+34 600..."}
                className={commonInputClass}
                value={data.telefono_factura || ""}
                onChange={(e) => handleChange("telefono_factura", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Persona de Contacto</Label>
              <Input
                disabled={readOnly}
                placeholder={readOnly ? "—" : "Nombre completo"}
                className={commonInputClass}
                maxLength={200}
                value={data.persona_contacto || ""}
                onChange={(e) => handleChange("persona_contacto", e.target.value)}
              />
            </div>
          </div>
        </div>

      {/* 4. Facturación */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Pagos y Facturación</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">IVA por Defecto</Label>
            <Select
              disabled={readOnly}
              value={String(data.iva_defecto || "21")}
              onValueChange={(v) => handleChange("iva_defecto", v)}
            >
              <SelectTrigger className={`w-full ${commonInputClass}`}>
                <SelectValue placeholder="Seleccionar IVA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21% (General)</SelectItem>
                <SelectItem value="10">10% (Reducido)</SelectItem>
                <SelectItem value="4">4% (Superreducido)</SelectItem>
                <SelectItem value="0">0% (Exento)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Forma de Pago</Label>
            <Select
              disabled={readOnly}
              value={data.forma_pago || "TRANSFERENCIA"}
              onValueChange={(v) => handleChange("forma_pago", v)}
            >
              <SelectTrigger className={`w-full ${commonInputClass}`}>
                <SelectValue placeholder="Forma de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="DOMICILIACION">Domiciliación</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
           <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">IBAN Cuenta Bancaria</Label>
           <Input
              disabled={readOnly}
              placeholder={readOnly ? "—" : "ES00 0000 0000 0000 0000 0000"}
              className={`${commonInputClass} font-mono text-sm`}
              value={data.iban || ""}
              onChange={(e) => handleChange("iban", e.target.value)}
            />
        </div>

        <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox"
              id="exento"
              disabled={readOnly}
              checked={data.exento_iva === true} 
              onChange={e => handleChange('exento_iva', e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="exento" className="text-sm font-normal cursor-pointer">Cliente exento de IVA</Label>
        </div>
      </div>
    </div>
  );
}
