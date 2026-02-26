"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { showError, showSuccess } from "@/lib/toast";

type Props = {
  endpoint: string;
  params?: Record<string, string>;
  filenamePrefix?: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

export default function ExportButton({
  endpoint,
  params = {},
  filenamePrefix = "export",
  label = "Exportar",
  className = "",
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doExport(formato: "excel" | "csv") {
    setLoading(true);
    setOpen(false);
    try {
      const qs = new URLSearchParams({ ...params, formato }).toString();
      const url = `/api/admin/contabilidad/${endpoint}?${qs}`;
      const res = await authenticatedFetch(url);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Error exportando");
      }

      const blob = await res.blob();
      const ext = formato === "excel" ? "xlsx" : "csv";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filenamePrefix}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      showSuccess(`Exportado correctamente`);
    } catch (e: any) {
      showError(e.message || "Error exportando");
    } finally {
      setLoading(false);
    }
  }

  const btnSize = size === "sm"
    ? "h-8 px-2.5 text-xs gap-1.5"
    : "h-9 px-3 text-sm gap-2";

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={`flex items-center ${btnSize} rounded-xl font-semibold transition-all
          bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]">
            <button
              onClick={() => doExport("excel")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel (.xlsx)
            </button>
            <button
              onClick={() => doExport("csv")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              CSV (.csv)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
