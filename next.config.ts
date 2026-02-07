import type { NextConfig } from "next";

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

  output: "standalone",

  experimental: {
    workerThreads: false,
    cpus: 1,
    serverActions: {},
  },

  // @ts-ignore
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.conditionNames = ["node", "require", "default"];
    }

    return config;
  },
};

export default nextConfig;
