/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@relay/protocol"],
  async rewrites() {
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:4000";
    return [
      {
        source: "/api/gateway/:path*",
        destination: `${gatewayUrl}/api/:path*`,
      },
      {
        source: "/health/gateway",
        destination: `${gatewayUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
