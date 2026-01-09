"use client";

import { ReactNode, useEffect } from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string; // ej: "w-[92vw] sm:w-[420px]"
};

export default function Drawer({
  open,
  onClose,
  children,
  widthClassName = "w-[92vw] sm:w-[420px]",
}: DrawerProps) {
  // Bloquear scroll del body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex">
        <div
          className={[
            "h-full bg-white shadow-2xl",
            "rounded-l-2xl",
            "overflow-hidden",
            widthClassName,
            "animate-[drawerIn_180ms_ease-out]",
          ].join(" ")}
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>

      {/* Keyframes inline (evitas tocar tailwind config) */}
      <style jsx>{`
        @keyframes drawerIn {
          from {
            transform: translateX(16px);
            opacity: 0.92;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
