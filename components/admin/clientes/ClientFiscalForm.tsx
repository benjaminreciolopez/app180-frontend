"use client";

import { useState, useEffect } from "react";

export default function ClientFiscalForm({ data, onChange }: { data: any, onChange: (newData: any) => void }) {
  const [formData, setFormData] = useState({
    razon_social: "",
    nif_cif: "",
    tipo_fiscal: "company",
    pais: "España",
    provincia: "",
    municipio: "",
    codigo_postal: "",
    direccion_fiscal: "",
    email_factura: "",
    telefono_factura: "",
    persona_contacto: "",
    iva_defecto: "21",
    exento_iva: false,
    forma_pago: "",
    iban: ""
  });

  useEffect(() => {
    if (data) {
        setFormData(prev => ({ ...prev, ...data }));
    }
  }, [data]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border shadow-sm">
      <h3 className="md:col-span-2 text-lg font-bold text-gray-700 border-b pb-2 mb-2">Datos Fiscales</h3>
      
      <div>
        <label className="block text-xs font-medium text-gray-500">Razón Social</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.razon_social || ''} 
          onChange={e => handleChange('razon_social', e.target.value)} 
          placeholder="Nombre legal completo"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">NIF / CIF</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.nif_cif || ''} 
          onChange={e => handleChange('nif_cif', e.target.value)} 
          placeholder="B12345678"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Tipo</label>
        <select 
            className="w-full border p-2 rounded"
            value={formData.tipo_fiscal || 'company'}
            onChange={e => handleChange('tipo_fiscal', e.target.value)}
        >
            <option value="company">Empresa</option>
            <option value="personal">Autónomo / Particular</option>
        </select>
      </div>

      <div className="md:col-span-2 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">Dirección Fiscal</h4>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Dirección</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.direccion_fiscal || ''} 
          onChange={e => handleChange('direccion_fiscal', e.target.value)} 
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-500">Código Postal</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.codigo_postal || ''} 
          onChange={e => handleChange('codigo_postal', e.target.value)} 
        />
      </div>

       <div>
        <label className="block text-xs font-medium text-gray-500">Municipio</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.municipio || ''} 
          onChange={e => handleChange('municipio', e.target.value)} 
        />
      </div>

       <div>
        <label className="block text-xs font-medium text-gray-500">Provincia</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.provincia || ''} 
          onChange={e => handleChange('provincia', e.target.value)} 
        />
      </div>

      <div className="md:col-span-2 mt-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">Facturación y Pagos</h4>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Email Facturación</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.email_factura || ''} 
          onChange={e => handleChange('email_factura', e.target.value)} 
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">IBAN</label>
        <input 
          className="w-full border p-2 rounded" 
          value={formData.iban || ''} 
          onChange={e => handleChange('iban', e.target.value)} 
          placeholder="ES00 0000 0000 0000 0000"
        />
      </div>
    
      <div>
        <label className="block text-xs font-medium text-gray-500">IVA por defecto (%)</label>
        <input 
          type="number"
          className="w-full border p-2 rounded" 
          value={formData.iva_defecto || ''} 
          onChange={e => handleChange('iva_defecto', e.target.value)} 
        />
      </div>

       <div className="flex items-center gap-2 mt-6">
        <input 
          type="checkbox"
          id="exento"
          checked={formData.exento_iva === true} 
          onChange={e => handleChange('exento_iva', e.target.checked)} 
        />
        <label htmlFor="exento" className="text-sm">Exento de IVA</label>
      </div>

    </div>
  );
}
