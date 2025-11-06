/** @type {import('next').NextConfig} */
const nextConfig = {
  // Smaller, self-contained production build for containers
  output: 'standalone',

  // Production-friendly defaults
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  experimental: {
    externalDir: true, // keep your current behavior
  },

  // Prevent CI/CD from failing on lint only (optional; remove if you want strict CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
