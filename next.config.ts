import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/admin/facturacion/pagos",
        destination: "/admin/cobros-pagos",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [];
  },

  output: "standalone",

  experimental: {
    workerThreads: false,
    cpus: 1,
    serverActions: {},
  },

  // @ts-ignore
  typescript: {
    ignoreBuildErrors: false,
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.conditionNames = ["node", "require", "default"];
    }

    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true, // ✅ Fuerza actualización automática del service worker
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
