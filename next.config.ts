import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // 🔥 FORZAMOS DESACTIVACIÓN TOTAL
  register: false,
  skipWaiting: false,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
