import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthInit from "@/components/AuthInit";

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="app-shell">
        <ThemeProvider>
          <AuthInit />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "CONTENDO GESTIONES",
  description: "Sistema de gestión empresarial para control de empleados, clientes, facturación y jornadas laborales",
  applicationName: "CONTENDO GESTIONES",
  authors: [{ name: "CONTENDO" }],
  generator: "Next.js",
  keywords: ["gestión", "empresa", "rrhh", "fichajes", "facturación"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CONTENDO GESTIONES",
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Evita zoom accidental, mejor experiencia app-like
  },
};
