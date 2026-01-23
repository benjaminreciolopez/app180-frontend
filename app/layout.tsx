import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ForceChangePasswordModal from "@/components/ForceChangePasswordModal";
import AuthInit from "@/components/AuthInit";

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
          <ForceChangePasswordModal />
        </ThemeProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "CONTENDO GESTIONES",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192.png",
  },
};
