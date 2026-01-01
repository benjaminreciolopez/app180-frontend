import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA({
  dest: "public",
  disable: isDev, // 🔥 PWA desactivado en desarrollo
  register: true,
  skipWaiting: true,
})(nextConfig);
