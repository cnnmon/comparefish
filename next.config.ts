import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Keep everything on one canonical domain so auth cookies persist
  async redirects() {
    return ["comparefish.vercel.app", "www.comparefish.site"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://comparefish.site/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
