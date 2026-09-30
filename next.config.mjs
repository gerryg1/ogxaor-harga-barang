/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.divine-pride.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ratemyserver.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
