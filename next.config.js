/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Allows contract document uploads (PDF/image) up to 10MB.
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
