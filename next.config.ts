import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  output: "standalone",

  experimental: {
    serverActions: {},
  },

  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
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
