"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface QuickViewConfig {
  title: string;
  url?: string;
  content?: ReactNode;
}

interface QuickViewContextType {
  openQuickView: (config: QuickViewConfig) => void;
  closeQuickView: () => void;
  isOpen: boolean;
  config: QuickViewConfig | null;
}

const QuickViewContext = createContext<QuickViewContextType | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<QuickViewConfig | null>(null);

  const openQuickView = useCallback((cfg: QuickViewConfig) => {
    setConfig(cfg);
    setIsOpen(true);
  }, []);

  const closeQuickView = useCallback(() => {
    setIsOpen(false);
    // Delay clearing config so the close animation can play
    setTimeout(() => setConfig(null), 300);
  }, []);

  return (
    <QuickViewContext.Provider value={{ openQuickView, closeQuickView, isOpen, config }}>
      {children}
    </QuickViewContext.Provider>
  );
}

export function useQuickView(): QuickViewContextType {
  const ctx = useContext(QuickViewContext);
  if (!ctx) {
    throw new Error("useQuickView must be used within a QuickViewProvider");
  }
  return ctx;
}
