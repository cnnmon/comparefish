import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Vercel already redirects the apex to www; sending www back to the apex
  // caused ERR_TOO_MANY_REDIRECTS. Canonical host is www.comparefish.site.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "comparefish.vercel.app" }],
        destination: "https://www.comparefish.site/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
