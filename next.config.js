/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/thingspeak/:path*',
        destination: 'https://api.thingspeak.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
