import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev, // 🔥 desactivada en dev
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // 👈 requerido para que Vercel no se queje
};

export default withPWA(nextConfig);
