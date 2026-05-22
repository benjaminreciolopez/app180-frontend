"use client";

import { Toaster as HotToaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "sonner";
import { configureZodSpanish } from "@/lib/zodLocale";

// Registra el locale español de Zod en el primer render del cliente,
// antes de que se monte ningún formulario.
configureZodSpanish();

export default function ToastProvider() {
  return (
    <>
      <HotToaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <SonnerToaster position="top-right" richColors closeButton />
    </>
  );
}
