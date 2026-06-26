import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["cesium"],
  turbopack: {},
};

export default nextConfig;
