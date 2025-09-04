import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore ESLint warnings/errors during `next build`
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during `next build`
  typescript: {
    ignoreBuildErrors: true,
  },
  // Add other config options here if needed
};

export default nextConfig;
