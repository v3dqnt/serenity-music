import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/bin/**/*'],
  },
};

export default nextConfig;
