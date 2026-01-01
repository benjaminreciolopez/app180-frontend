import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withPWA({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
})(nextConfig);
