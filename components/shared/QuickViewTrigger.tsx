"use client";

import { ReactNode } from "react";
import { PanelRightOpen } from "lucide-react";
import { useQuickView } from "@/contexts/QuickViewContext";

interface QuickViewTriggerProps {
  title: string;
  url: string;
  children: ReactNode;
}

export function QuickViewTrigger({ title, url, children }: QuickViewTriggerProps) {
  const { openQuickView } = useQuickView();

  function handleQuickView(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openQuickView({ title, url });
  }

  return (
    <div className="group/qv relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={handleQuickView}
        className="opacity-0 group-hover/qv:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary shrink-0"
        title="Vista rapida"
      >
        <PanelRightOpen size={14} />
      </button>
    </div>
  );
}
