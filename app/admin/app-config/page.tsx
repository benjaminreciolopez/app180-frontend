"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { showError, showSuccess } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Loader2, AlertCircle } from "lucide-react";

interface ConfigItem {
  clave: string;
  valor: string;
  descripcion: string | null;
  categoria: string | null;
  updated_at: string;
  overridden_by_env: boolean;
}

export default function AppConfigPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/app-config");
      const list = (res.data?.items || []) as ConfigItem[];
      setItems(list);
      setDrafts(Object.fromEntries(list.map((i) => [i.clave, i.valor || ""])));
    } catch (err: any) {
      showError(err.response?.data?.error || "Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function guardar(clave: string) {
    setSavingKey(clave);
    try {
      await api.put(`/admin/app-config/${clave}`, { valor: drafts[clave] });
      showSuccess("Guardado");
      await load();
    } catch (err: any) {
      showError(err.response?.data?.error || "Error guardando");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  // Agrupar por categoría
  const grupos = items.reduce<Record<string, ConfigItem[]>>((acc, item) => {
    const cat = item.categoria || "general";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración de la app</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes globales editables desde aquí. No requiere redeploy.
          </p>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="pt-4 flex gap-2 items-start text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Solo el fabricante puede editar.</p>
            <p className="text-xs text-amber-800">
              Si una clave aparece como "(override por entorno)", el servidor está usando una variable de entorno y este valor de BD se ignora.
            </p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grupos).map(([categoria, lista]) => (
        <Card key={categoria}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{categoria}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lista.map((item) => (
              <div key={item.clave} className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.clave}</code>
                  {item.overridden_by_env && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      override por entorno
                    </span>
                  )}
                </label>
                {item.descripcion && (
                  <p className="text-xs text-muted-foreground">{item.descripcion}</p>
                )}
                <div className="flex gap-2">
                  <Input
                    value={drafts[item.clave] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [item.clave]: e.target.value })}
                    disabled={item.overridden_by_env}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => guardar(item.clave)}
                    disabled={savingKey === item.clave || item.overridden_by_env || drafts[item.clave] === item.valor}
                    className="gap-2"
                  >
                    {savingKey === item.clave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Actualizado {new Date(item.updated_at).toLocaleString("es-ES")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
