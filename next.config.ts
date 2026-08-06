import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
      "./node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/schema.prisma",
    ],
  },
};

export default nextConfig;
