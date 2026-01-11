import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ForceChangePasswordModal from "@/components/ForceChangePasswordModal";
import AuthInit from "@/components/AuthInit";

export const metadata: Metadata = {
  title: "APP180",
  description: "Gestión de fichajes y reportes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script src="/kill-sw.js"></script>
        <script src="/force-reload.js"></script>
        <script src="/force-refresh.js"></script>

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="app-shell safe-full">
        <ThemeProvider>
          <AuthInit />
          {children}
          <ForceChangePasswordModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
