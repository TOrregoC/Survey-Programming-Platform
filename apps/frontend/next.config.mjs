const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:5000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@survey/shared", "@survey/sdk"],
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    // All backend traffic is proxied under /api-proxy/ to avoid collisions
    // with Next.js page routes like /surveys/[id].
    return [
      { source: "/api-proxy/:path*", destination: `${backendUrl}/:path*` },
    ];
  },
};

export default nextConfig;
