/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/data/rathena/**/*'],
  },
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
