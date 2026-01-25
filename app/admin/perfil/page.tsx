"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

type ProfileData = {
  nombre_fiscal: string;
  cif: string;
  direccion: string;
  poblacion: string;
  provincia: string;
  cp: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
};

export default function AdminPerfilPage() {
  const [data, setData] = useState<ProfileData>({
    nombre_fiscal: "",
    cif: "",
    direccion: "",
    poblacion: "",
    provincia: "",
    cp: "",
    pais: "España",
    telefono: "",
    email: "",
    web: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get("/perfil");
      if (res.data) {
        // Mapear solo campos relevantes para evitar basura
        const d = res.data;
        setData((prev) => ({
          ...prev,
          nombre_fiscal: d.nombre_fiscal || "",
          cif: d.cif || "",
          direccion: d.direccion || "",
          poblacion: d.poblacion || "",
          provincia: d.provincia || "",
          cp: d.cp || "",
          pais: d.pais || "España",
          telefono: d.telefono || "",
          email: d.email || "",
          web: d.web || "",
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/perfil", data);
      alert("Perfil actualizado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Cargando perfil...</div>;

  return (
    <div className="app-main max-w-4xl pb-20">
      <h1 className="text-2xl font-bold mb-1">Perfil de Facturación</h1>
      <p className="text-gray-500 mb-6">
        Estos datos aparecerán como emisor en las facturas y documentos.
      </p>

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Identificación */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3 mt-1">Identificación Fiscal</h3>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Razón Social / Nombre</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.nombre_fiscal}
            onChange={(e) => setData({ ...data, nombre_fiscal: e.target.value })}
            placeholder="Ej: Mi Empresa S.L."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">CIF / NIF</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.cif}
            onChange={(e) => setData({ ...data, cif: e.target.value })}
            placeholder="Ej: B12345678"
          />
        </div>

        {/* Contacto */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3 mt-4">Contacto</h3>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Email Facturación</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Teléfono</label>
          <input
            type="tel"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.telefono}
            onChange={(e) => setData({ ...data, telefono: e.target.value })}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">Web</label>
          <input
            type="url"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.web}
            onChange={(e) => setData({ ...data, web: e.target.value })}
            placeholder="https://..."
          />
        </div>

        {/* Dirección */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3 mt-4">Dirección Fiscal</h3>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">Dirección</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.direccion}
            onChange={(e) => setData({ ...data, direccion: e.target.value })}
            placeholder="Calle, número, piso..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Código Postal</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.cp}
            onChange={(e) => setData({ ...data, cp: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Población</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.poblacion}
            onChange={(e) => setData({ ...data, poblacion: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Provincia</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.provincia}
            onChange={(e) => setData({ ...data, provincia: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">País</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            value={data.pais}
            onChange={(e) => setData({ ...data, pais: e.target.value })}
          />
        </div>

        {/* Botón */}
        <div className="md:col-span-2 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full md:w-auto"
          >
            {saving ? "Guardando..." : "Guardar Perfil"}
          </button>
        </div>

      </form>
    </div>
  );
}
