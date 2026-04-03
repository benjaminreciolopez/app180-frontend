"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Maximize2 } from "lucide-react";
import { useQuickView } from "@/contexts/QuickViewContext";

export function QuickViewPanel() {
  const { isOpen, config, closeQuickView } = useQuickView();
  const router = useRouter();

  // ESC to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeQuickView();
      }
    },
    [isOpen, closeQuickView]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleOpenFull() {
    if (config?.url) {
      // Strip quickview param for full navigation
      const cleanUrl = config.url.replace(/[?&]quickview=true/, "");
      router.push(cleanUrl);
    }
    closeQuickView();
  }

  // Build iframe URL with quickview param
  const iframeSrc = config?.url
    ? config.url + (config.url.includes("?") ? "&" : "?") + "quickview=true"
    : undefined;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 z-[44] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeQuickView}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[45] w-full md:w-[50vw] bg-background border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-sm font-semibold truncate max-w-[60%]">
            {config?.title || ""}
          </h2>
          <div className="flex items-center gap-1">
            {config?.url && (
              <button
                onClick={handleOpenFull}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Abrir completo"
              >
                <Maximize2 size={16} />
              </button>
            )}
            <button
              onClick={closeQuickView}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {config?.content ? (
            <div className="p-4">{config.content}</div>
          ) : iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title={config?.title || "Vista rapida"}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sin contenido
            </div>
          )}
        </div>
      </div>
    </>
  );
}
