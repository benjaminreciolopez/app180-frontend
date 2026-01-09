"use client";

import { ReactNode } from "react";

export default function FloatingActionButton({
  onClick,
  children,
  ariaLabel,
  className = "",
}: {
  onClick: () => void;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "fixed right-4 top-4 z-40",
        "h-11 w-11 rounded-full",
        "bg-white/95 backdrop-blur",
        "border border-black/5",
        "shadow-[0_10px_24px_rgba(0,0,0,0.18)]",
        "active:scale-[0.98] transition",
        "flex items-center justify-center",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
