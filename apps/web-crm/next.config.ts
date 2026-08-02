import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/.next/**", "**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
