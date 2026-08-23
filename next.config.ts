import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow fetching external websites during audits
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Optimize for production
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
