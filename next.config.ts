import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // disable: process.env.NODE_ENV === "development",
  disable: false,
  register: true,
  skipWaiting: false,
  customWorkerDir: "worker",
  buildExcludes: [/dev-sw\.js$/],
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https" as const,
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https" as const,
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https" as const,
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/#about",
        permanent: true,
      },
      {
        source: "/features",
        destination: "/#features",
        permanent: true,
      },
    ];
  },
};

export default withPWA(nextConfig);
