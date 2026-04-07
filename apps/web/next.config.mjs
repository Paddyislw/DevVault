/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@devvault/db",
    "@devvault/types",
    "@devvault/utils",
    "@devvault/ai",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
