import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*'],
  images: {
    domains: ['150.250.96.50', 'localhost',"10.0.0.44"],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://10.0.0.44:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
