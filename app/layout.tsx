import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AuthInit from "@/components/AuthInit";
import ToastProvider from "@/components/ToastProvider";

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
          <ToastProvider />
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
  // manifest: "/manifest.json", // Desactivado temporalmente para evitar error 401 en Vercel Auth
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom accidental, mejor experiencia app-like
};
