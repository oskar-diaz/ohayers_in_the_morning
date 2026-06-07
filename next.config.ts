import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.ikublog.com",
      },
      {
        protocol: "https",
        hostname: "www.ikublog.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "live.staticflickr.com",
      },
    ],
  },
};

export default nextConfig;
