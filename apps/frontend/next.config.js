/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@college-erp/common"], // Ensure common package is transpiled
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // Added for ui-avatars.com
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  // If using a custom backend URL in production, configure rewrites or env variables
  // Example:
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: process.env.BACKEND_URL || 'http://localhost:3001/api/:path*',
  //     },
  //   ]
  // },
};

module.exports = nextConfig;
