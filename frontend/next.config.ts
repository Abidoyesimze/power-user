import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix multiple lockfiles warning - explicitly set root to frontend directory
  // This tells Next.js to use frontend/package-lock.json and ignore any root-level lockfile
  outputFileTracingRoot: path.resolve(__dirname),
  
  // Suppress module resolution warnings for optional dependencies
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    
    // Ignore these modules in webpack
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        "@react-native-async-storage/async-storage": "commonjs @react-native-async-storage/async-storage",
        "pino-pretty": "commonjs pino-pretty",
      });
    }
    
    return config;
  },
};

export default nextConfig;
