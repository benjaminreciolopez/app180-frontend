"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";

type Row = {
  fecha: string;
  status: "igual" | "añadido" | "eliminado" | "modificado";
  a: any | null;
  b: any | null;
};

export default function CompareImportacionesPage() {
  const sp = useSearchParams();
  const a = sp.get("a");
  const b = sp.get("b");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!a || !b) return;
    setLoading(true);
    try {
      const res = await api.get("/admin/calendario/importaciones-compare", {
        params: { a, b },
      });
      setRows(res.data.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [a, b]);

  const summary = useMemo(() => {
    const s = { igual: 0, añadido: 0, eliminado: 0, modificado: 0 };
    for (const r of rows) s[r.status]++;
    return s;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Comparar importaciones</h1>
        <p className="text-sm text-muted-foreground">
          Se muestran todas las fechas del snapshot (modo completo) y se
          resaltan cambios.
        </p>
        <p className="text-sm text-muted-foreground">
          Igual: {summary.igual} · Añadido: {summary.añadido} · Eliminado:{" "}
          {summary.eliminado} · Modificado: {summary.modificado}
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Cargando…</div>
      )}

      <div className="bg-card border rounded-lg overflow-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 border-b">Fecha</th>
              <th className="p-2 border-b">Estado</th>
              <th className="p-2 border-b">A (tipo/ámbito/laborable)</th>
              <th className="p-2 border-b">B (tipo/ámbito/laborable)</th>
              <th className="p-2 border-b">Descripción A</th>
              <th className="p-2 border-b">Descripción B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cls =
                r.status === "modificado"
                  ? "bg-amber-50"
                  : r.status === "añadido"
                    ? "bg-green-50"
                    : r.status === "eliminado"
                      ? "bg-red-50"
                      : "";

              const fmt = (x: any) =>
                x
                  ? `${x.tipo} / ${x.label || "—"} / ${x.es_laborable ? "lab" : "no-lab"} / ${x.activo ? "activo" : "off"}`
                  : "—";

              return (
                <tr
                  key={i}
                  className={`${cls} odd:bg-background even:bg-muted/10`}
                >
                  <td className="p-2">{r.fecha}</td>
                  <td className="p-2 font-medium">{r.status}</td>
                  <td className="p-2">{fmt(r.a)}</td>
                  <td className="p-2">{fmt(r.b)}</td>
                  <td className="p-2">{r.a?.descripcion || "—"}</td>
                  <td className="p-2">{r.b?.descripcion || "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-muted-foreground">
                  Sin datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
