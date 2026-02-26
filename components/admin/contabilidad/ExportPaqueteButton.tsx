"use client";

import { useState } from "react";
import { Package, Download, Loader2, Calendar } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { showError, showSuccess } from "@/lib/toast";

export default function ExportPaqueteButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [fechaDesde, setFechaDesde] = useState(`${currentYear}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function doExport() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      }).toString();
      const res = await authenticatedFetch(
        `/api/admin/contabilidad/exportar-paquete?${qs}`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Error exportando paquete");
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `paquete_contable_${fechaDesde}_${fechaHasta}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      showSuccess("Paquete contable descargado");
      setOpen(false);
    } catch (e: any) {
      showError(e.message || "Error exportando paquete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-3 text-sm rounded-xl font-semibold transition-all
          bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Package className="w-4 h-4" />
        )}
        Paquete Asesoría
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-200 p-4 min-w-[280px]">
            <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-600" />
              Exportar paquete contable
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Genera un ZIP con libro diario, balance, PyG, libro mayor y plan
              de cuentas en Excel y CSV.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-8 px-2 border rounded-lg text-sm bg-slate-50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-8 px-2 border rounded-lg text-sm bg-slate-50"
                />
              </div>
            </div>
            <button
              onClick={doExport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold
                bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {loading ? "Generando..." : "Descargar ZIP"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
