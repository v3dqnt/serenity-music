import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/python/**/*'],
  },
};

export default nextConfig;
