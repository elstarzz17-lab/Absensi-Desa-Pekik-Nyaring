import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  async rewrites() {
    const phpApiOrigin = process.env.PHP_API_ORIGIN ?? "http://127.0.0.1:8000";

    return {
      beforeFiles: [
        {
          source: "/api/auth/:path*",
          destination: `${phpApiOrigin}/api/auth/:path*`,
        },
        {
          source: "/api/perangkat",
          destination: `${phpApiOrigin}/api/perangkat`,
        },
        {
          source: "/api/perangkat/:id",
          destination: `${phpApiOrigin}/api/perangkat/:id`,
        },
        {
          source: "/api/absensi/export",
          destination: `${phpApiOrigin}/api/absensi/export`,
        },
        {
          source: "/api/absensi",
          destination: `${phpApiOrigin}/api/absensi`,
        },
        {
          source: "/api/dashboard",
          destination: `${phpApiOrigin}/api/dashboard`,
        },
      ],
    };
  },
};

export default nextConfig;
