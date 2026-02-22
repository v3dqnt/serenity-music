import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/yt-dlp', './lib/cookies.txt'],
  },
};

export default nextConfig;
