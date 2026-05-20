const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:5000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@survey/shared", "@survey/sdk"],
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${backendUrl}/auth/:path*` },
      { source: "/surveys/:path*", destination: `${backendUrl}/surveys/:path*` },
      { source: "/runtime/:path*", destination: `${backendUrl}/runtime/:path*` },
      { source: "/responses/:path*", destination: `${backendUrl}/responses/:path*` },
      { source: "/webhooks/:path*", destination: `${backendUrl}/webhooks/:path*` },
      { source: "/healthz", destination: `${backendUrl}/healthz` },
    ];
  },
};

export default nextConfig;
