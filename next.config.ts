import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/yt-dlp'],
  },
};

export default nextConfig;
