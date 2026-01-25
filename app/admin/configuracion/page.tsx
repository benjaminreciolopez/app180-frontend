"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";

type Modulos = {
  fichajes?: boolean;
  ausencias?: boolean;
  worklogs?: boolean;
  empleados?: boolean;
  facturacion?: boolean;
};
const DEFAULTS: Modulos = {
  fichajes: true,
  ausencias: true,
  worklogs: true,
  empleados: true,
  facturacion: false,
};

export default function AdminConfiguracionPage() {
  const [modulos, setModulos] = useState<Modulos | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function load() {
    try {
      const r = await api.get("/admin/configuracion");

      setModulos({
        ...DEFAULTS,
        ...r.data,
      });
    } catch (e) {
      console.error("Error cargando config", e);
      alert("No se pudo cargar la configuración");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!modulos) return;

    setSaving(true);

    try {
      await api.put("/admin/configuracion", { modulos });

      // 🔁 refrescar sesión
      const me = await api.get("/auth/me");
      localStorage.setItem("user", JSON.stringify(me.data));

      // 🔄 refresco completo del árbol admin
      router.refresh();

      alert("Configuración guardada");
    } finally {
      setSaving(false);
    }
  }
  location.reload();

  function toggle(k: keyof Modulos) {
    if (k === "empleados" && modulos?.empleados !== false) {
      if (!confirm("¿Seguro que quieres desactivar empleados?")) return;
    }

    setModulos((prev) => ({
      ...prev!,
      [k]: prev?.[k] === false ? true : false,
    }));
  }

  if (!modulos) return <p>Cargando…</p>;

  return (
    <div className="app-main max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Configuración del sistema</h1>

      <div className="card space-y-3">
        <Toggle
          label="Fichajes"
          value={modulos.fichajes}
          onChange={() => toggle("fichajes")}
        />

        <Toggle
          label="Ausencias"
          value={modulos.ausencias}
          onChange={() => toggle("ausencias")}
        />

        <Toggle
          label="Trabajos / Partes"
          value={modulos.worklogs}
          onChange={() => toggle("worklogs")}
        />

        <Toggle
          label="Empleados"
          value={modulos.empleados}
          onChange={() => toggle("empleados")}
        />

        <Toggle
          label="Facturación"
          value={modulos.facturacion}
          onChange={() => toggle("facturacion")}
        />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ========================
   Toggle reutilizable
======================== */

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>

      <input
        type="checkbox"
        checked={value !== false}
        onChange={onChange}
        className="w-5 h-5"
      />
    </label>
  );
}
