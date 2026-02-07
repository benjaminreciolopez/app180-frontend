import type { NextConfig } from "next";
// import withPWA from "next-pwa"; // ❌ Deshabilitado temporalmente por conflictos

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

// ❌ PWA deshabilitado temporalmente por conflictos de versión
export default nextConfig;

// Configuración anterior con PWA (se puede reactivar más adelante):
// export default withPWA({
//   dest: "public",
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === "development",
// })(nextConfig);
