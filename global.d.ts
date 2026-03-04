declare module "next-pwa" {
  import { NextConfig } from "next";

  export default function withPWA(config?: {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  }): (nextConfig: NextConfig) => NextConfig;
}

declare module "qrcode" {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
  function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  export default { toDataURL };
}
