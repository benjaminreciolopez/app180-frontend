import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 👇 Esto “fuerza” Webpack sin activar nada experimental
  // y deja contento a Next 16 + TypeScript
  webpack: (config) => {
    return config;
  },

  // 👇 Esto silencia la validación turbopack de Next 16
  // y NO rompe typings
  experimental: {},
};

export default withPWA(nextConfig);
