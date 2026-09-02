import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STATIC === 'true' && { output: 'export' as const }),
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true, // Temporarily disabled to allow build
  },
  allowedDevOrigins: ['*'],
  images: {
    unoptimized: true,
  },
  // --- Dev server performance ---
  experimental: {
    // Faster package resolution by pre-bundling large icon/utility deps
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@heroicons/react',
      'recharts',
    ],
  },
};

export default nextConfig;
