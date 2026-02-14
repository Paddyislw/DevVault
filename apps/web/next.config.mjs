/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@devvault/db", "@devvault/types", "@devvault/utils", "@devvault/ai"],
};

export default nextConfig;